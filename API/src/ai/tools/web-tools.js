// Web tools — search and fetch capsule for AI agents
// Free implementation: scrapes DuckDuckGo HTML + Playwright for JS-rendered pages
// Pattern mirrors workflow-tools.js (createXExecutor returning {definitions, canHandle, execute, cleanup})

const dns = require('dns').promises;
const { randomUUID } = require('crypto');
const env = require('../../config/env');

// Lazy requires — keep server boot light, only load when AI calls a web tool
let _undici = null;
let _cheerio = null;
let _turndown = null;
let _readability = null;
let _jsdom = null;
let _playwright = null;

function loadUndici() { if (!_undici) _undici = require('undici'); return _undici; }
function loadCheerio() { if (!_cheerio) _cheerio = require('cheerio'); return _cheerio; }
function loadTurndown() {
  if (!_turndown) {
    const TurndownService = require('turndown');
    _turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
  }
  return _turndown;
}
function loadReadability() { if (!_readability) _readability = require('@mozilla/readability'); return _readability; }
function loadJsdom() { if (!_jsdom) _jsdom = require('jsdom'); return _jsdom; }
function loadPlaywright() { if (!_playwright) _playwright = require('playwright'); return _playwright; }

// ─────────────────────────────────────────────────────────────────────────────
// Constants & limits
// ─────────────────────────────────────────────────────────────────────────────

const SEARCH_TIMEOUT_MS = parseInt(process.env.WEB_SEARCH_TIMEOUT_MS || '20000', 10);
const BROWSER_TIMEOUT_MS = parseInt(process.env.WEB_BROWSER_TIMEOUT_MS || '30000', 10);
const HTTP_TIMEOUT_MS = parseInt(process.env.WEB_HTTP_TIMEOUT_MS || '30000', 10);
const MAX_BYTES = parseInt(process.env.WEB_FETCH_MAX_BYTES || String(5 * 1024 * 1024), 10);
const MAX_RAW_CHARS = parseInt(process.env.WEB_FETCH_MAX_RAW_CHARS || String(500_000), 10);
const PRIMARY_ENGINE = process.env.WEB_SEARCH_ENGINE || 'duckduckgo';
const FALLBACK_ENGINES = (process.env.WEB_SEARCH_FALLBACK || 'brave,startpage').split(',').map(s => s.trim()).filter(Boolean);

const DEFAULT_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const ALLOWED_CT = [/^text\//, /^application\/xhtml\+xml/, /^application\/json/, /^application\/pdf/, /^application\/xml/];

// SSRF — block private nets and link-local
const PRIVATE_NETS = [
  /^10\./, /^127\./, /^169\.254\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./, /^0\./,
  /^::1$/i, /^fc00:/i, /^fd[0-9a-f]{2}:/i, /^fe80:/i,
];

async function validateUrl(url) {
  let u;
  try { u = new URL(url); } catch { throw new Error('invalid_url'); }
  if (!['http:', 'https:'].includes(u.protocol)) throw new Error('invalid_protocol');
  // Block raw IP usage in hostname that resolves to private (DNS rebinding mitigation)
  let addrs;
  try { addrs = await dns.lookup(u.hostname, { all: true }); }
  catch { throw new Error(`dns_failed:${u.hostname}`); }
  for (const a of addrs || []) {
    if (PRIVATE_NETS.some(re => re.test(a.address))) throw new Error(`ssrf_blocked:${a.address}`);
  }
  return u;
}

// ─────────────────────────────────────────────────────────────────────────────
// Browser singleton (Playwright Chromium)
// ─────────────────────────────────────────────────────────────────────────────

let _browser = null;
let _browserClosing = false;

async function getBrowser() {
  if (_browser && !_browserClosing) return _browser;
  const { chromium } = loadPlaywright();
  _browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled'],
  });
  _browser.once('disconnected', () => { _browser = null; });
  return _browser;
}

async function closeBrowser() {
  if (!_browser) return;
  _browserClosing = true;
  try { await _browser.close(); } catch {}
  _browser = null;
  _browserClosing = false;
}

// Cleanup on process exit
let _signalsBound = false;
function bindSignals() {
  if (_signalsBound) return;
  _signalsBound = true;
  const handler = () => { closeBrowser().catch(() => {}); };
  process.once('SIGTERM', handler);
  process.once('SIGINT', handler);
  process.once('beforeExit', handler);
}

async function withBrowserContext(fn, { blockHeavy = true } = {}) {
  bindSignals();
  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent: DEFAULT_UA,
    viewport: { width: 1280, height: 800 },
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    ignoreHTTPSErrors: true,
  });
  if (blockHeavy) {
    await context.route('**/*', (route) => {
      const t = route.request().resourceType();
      if (t === 'image' || t === 'font' || t === 'media') return route.abort();
      return route.continue();
    });
  }
  try {
    return await fn(context);
  } finally {
    try { await context.close(); } catch {}
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Rate limit (1 req/sec for searches)
// ─────────────────────────────────────────────────────────────────────────────

let _searchQueue = Promise.resolve();
function rateLimitedSearch(fn) {
  const next = _searchQueue.then(async () => {
    const started = Date.now();
    try { return await fn(); }
    finally {
      const elapsed = Date.now() - started;
      if (elapsed < 1000) await new Promise(r => setTimeout(r, 1000 - elapsed));
    }
  });
  // Detach error so queue doesn't break; consumer handles it via returned promise
  _searchQueue = next.catch(() => {});
  return next;
}

// ─────────────────────────────────────────────────────────────────────────────
// Search: DuckDuckGo HTML
// ─────────────────────────────────────────────────────────────────────────────

function decodeDdgRedirect(href) {
  if (!href) return href;
  try {
    // DuckDuckGo wraps results in /l/?uddg=<encoded>&...
    const u = new URL(href, 'https://duckduckgo.com');
    if (u.pathname.startsWith('/l/') || u.pathname === '/l/') {
      const real = u.searchParams.get('uddg');
      if (real) return decodeURIComponent(real);
    }
    return href;
  } catch { return href; }
}

async function searchDuckDuckGo({ query, limit, locale, safeSearch, site }) {
  const cheerio = loadCheerio();
  const fullQuery = site ? `${query} site:${site}` : query;
  const params = new URLSearchParams({ q: fullQuery });
  if (locale) params.set('kl', String(locale).toLowerCase().includes('-') ? locale : `${locale}-${locale}`);
  if (safeSearch === false) params.set('kp', '-2'); else params.set('kp', '1');

  return withBrowserContext(async (ctx) => {
    const page = await ctx.newPage();
    page.setDefaultTimeout(SEARCH_TIMEOUT_MS);
    const url = `https://html.duckduckgo.com/html/?${params.toString()}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: SEARCH_TIMEOUT_MS });
    const html = await page.content();
    await page.close();

    const $ = cheerio.load(html);
    const results = [];
    $('.result, .web-result').each((i, el) => {
      if (results.length >= limit) return false;
      const $el = $(el);
      const $a = $el.find('.result__title a, h2 a').first();
      const rawHref = $a.attr('href') || '';
      const url = decodeDdgRedirect(rawHref);
      const title = $a.text().trim();
      const snippet = $el.find('.result__snippet').text().trim();
      if (!url || !title) return;
      results.push({ title, url, snippet, rank: results.length + 1 });
    });
    return results;
  });
}

async function searchBrave({ query, limit, locale, site }) {
  const cheerio = loadCheerio();
  const fullQuery = site ? `${query} site:${site}` : query;
  const params = new URLSearchParams({ q: fullQuery, source: 'web' });
  return withBrowserContext(async (ctx) => {
    const page = await ctx.newPage();
    page.setDefaultTimeout(SEARCH_TIMEOUT_MS);
    await page.goto(`https://search.brave.com/search?${params.toString()}`, { waitUntil: 'domcontentloaded', timeout: SEARCH_TIMEOUT_MS });
    const html = await page.content();
    await page.close();
    const $ = cheerio.load(html);
    const results = [];
    $('div.snippet, [data-type="web"]').each((i, el) => {
      if (results.length >= limit) return false;
      const $el = $(el);
      const $a = $el.find('a.result-header, a.heading-serpresult, h3 a, a').first();
      const url = $a.attr('href') || '';
      const title = ($el.find('.snippet-title, .title').first().text() || $a.text() || '').trim();
      const snippet = ($el.find('.snippet-description, .snippet-content').first().text() || '').trim();
      if (!url || !title || !/^https?:/.test(url)) return;
      results.push({ title, url, snippet, rank: results.length + 1 });
    });
    return results;
  });
}

async function searchStartpage({ query, limit, site }) {
  const cheerio = loadCheerio();
  const fullQuery = site ? `${query} site:${site}` : query;
  const params = new URLSearchParams({ query: fullQuery, cat: 'web' });
  return withBrowserContext(async (ctx) => {
    const page = await ctx.newPage();
    page.setDefaultTimeout(SEARCH_TIMEOUT_MS);
    await page.goto(`https://www.startpage.com/sp/search?${params.toString()}`, { waitUntil: 'domcontentloaded', timeout: SEARCH_TIMEOUT_MS });
    const html = await page.content();
    await page.close();
    const $ = cheerio.load(html);
    const results = [];
    $('.w-gl__result, .result').each((i, el) => {
      if (results.length >= limit) return false;
      const $el = $(el);
      const $a = $el.find('a.w-gl__result-title, a.result-link, h3 a').first();
      const url = $a.attr('href') || '';
      const title = $a.text().trim();
      const snippet = $el.find('.w-gl__description, .description').text().trim();
      if (!url || !title || !/^https?:/.test(url)) return;
      results.push({ title, url, snippet, rank: results.length + 1 });
    });
    return results;
  });
}

const SEARCH_ENGINES = {
  duckduckgo: searchDuckDuckGo,
  brave: searchBrave,
  startpage: searchStartpage,
};

async function runSearch(opts) {
  const order = [PRIMARY_ENGINE, ...FALLBACK_ENGINES].filter((v, i, a) => a.indexOf(v) === i);
  let lastErr = null;
  for (const engine of order) {
    const fn = SEARCH_ENGINES[engine];
    if (!fn) continue;
    try {
      const results = await rateLimitedSearch(() => fn(opts));
      if (results && results.length) return { engine, results };
      // Empty result is suspicious — try fallback
    } catch (e) {
      lastErr = e;
    }
  }
  if (lastErr) throw lastErr;
  return { engine: order[0], results: [] };
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch: HTTP (undici) + Browser (Playwright)
// ─────────────────────────────────────────────────────────────────────────────

async function httpFetch(url) {
  await validateUrl(url);
  const { request } = loadUndici();
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), HTTP_TIMEOUT_MS);
  try {
    // Suit les redirects manuellement (undici récent: maxRedirections retiré)
    let currentUrl = url;
    let res;
    for (let hop = 0; hop < 6; hop++) {
      res = await request(currentUrl, {
        method: 'GET',
        headers: {
          'user-agent': DEFAULT_UA,
          'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'accept-language': 'fr-FR,fr;q=0.9,en;q=0.8',
        },
        signal: ac.signal,
      });
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const next = new URL(String(res.headers.location), currentUrl).toString();
        await validateUrl(next);
        currentUrl = next;
        try { res.body.destroy(); } catch {}
        continue;
      }
      break;
    }
    const ct = String(res.headers['content-type'] || '');
    const allowed = ALLOWED_CT.some(re => re.test(ct));
    if (!allowed) {
      // Drain & abort
      try { res.body.destroy(); } catch {}
      throw new Error(`unsupported_content_type:${ct}`);
    }
    // Read with byte cap
    const chunks = [];
    let total = 0;
    for await (const chunk of res.body) {
      total += chunk.length;
      if (total > MAX_BYTES) {
        try { res.body.destroy(); } catch {}
        break;
      }
      chunks.push(chunk);
    }
    const buf = Buffer.concat(chunks);
    return {
      statusCode: res.statusCode,
      contentType: ct,
      body: buf.toString('utf8'),
      bytes: buf.length,
    };
  } finally {
    clearTimeout(t);
  }
}

async function browserFetch(url) {
  await validateUrl(url);
  return withBrowserContext(async (ctx) => {
    const page = await ctx.newPage();
    page.setDefaultTimeout(BROWSER_TIMEOUT_MS);
    let statusCode = 0;
    page.on('response', (resp) => {
      if (resp.url() === url || resp.url().replace(/\/$/, '') === url.replace(/\/$/, '')) {
        statusCode = resp.status();
      }
    });
    try {
      const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: BROWSER_TIMEOUT_MS });
      if (resp && !statusCode) statusCode = resp.status();
    } catch (e) {
      // networkidle may timeout on long-poll sites; still try to grab content
      if (!page.url() || page.url() === 'about:blank') throw e;
    }
    const html = await page.content();
    const title = await page.title().catch(() => '');
    await page.close();
    const capped = html.length > MAX_RAW_CHARS ? html.slice(0, MAX_RAW_CHARS) : html;
    return { statusCode: statusCode || 200, contentType: 'text/html', body: capped, bytes: capped.length, title };
  });
}

// Heuristic: HTML appears to be JS-shell (empty body, requires render)
function looksLikeJsShell(html) {
  if (!html) return true;
  const len = html.length;
  if (len < 1500) return true;
  const cheerio = loadCheerio();
  try {
    const $ = cheerio.load(html);
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
    if (bodyText.length < 200) return true;
    // Many SPA shells include only a #root or #app div
    const meaningfulNodes = $('p, article, main, section').length;
    if (meaningfulNodes === 0 && bodyText.length < 400) return true;
  } catch {}
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Extraction
// ─────────────────────────────────────────────────────────────────────────────

function extractText(html) {
  const cheerio = loadCheerio();
  const $ = cheerio.load(html);
  $('script, style, noscript, iframe, svg, nav, footer, header, form, aside').remove();
  const text = $('body').text().replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n\n').trim();
  return text;
}

function extractMarkdown(html) {
  const cheerio = loadCheerio();
  const $ = cheerio.load(html);
  $('script, style, noscript, iframe, svg').remove();
  const td = loadTurndown();
  const md = td.turndown($('body').html() || '');
  return md.replace(/\n{3,}/g, '\n\n').trim();
}

function extractReadability(html, url) {
  try {
    const { Readability } = loadReadability();
    const { JSDOM, VirtualConsole } = loadJsdom();
    // Virtual console silencieuse : évite les dumps jsdom "Could not parse CSS stylesheet"
    // sur les CSS mal formés des sites publics (Google, etc.) — non bloquant mais très verbeux.
    const virtualConsole = new VirtualConsole();
    const dom = new JSDOM(html, { url, virtualConsole });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    if (!article) return null;
    return {
      title: article.title || '',
      byline: article.byline || '',
      content: article.content || '',     // HTML
      textContent: article.textContent || '',
      excerpt: article.excerpt || '',
      length: article.length || 0,
    };
  } catch (e) {
    return null;
  }
}

function getDocTitle(html) {
  try {
    const cheerio = loadCheerio();
    const $ = cheerio.load(html);
    return ($('title').first().text() || $('meta[property="og:title"]').attr('content') || '').trim();
  } catch { return ''; }
}

// ─────────────────────────────────────────────────────────────────────────────
// LLM mini (Claude Haiku) — used for prompted extraction & deep research synthesis
// ─────────────────────────────────────────────────────────────────────────────

async function callMiniLlm({ system, userText, maxTokens = 2000 }) {
  if (!env.ANTHROPIC_API_KEY) {
    // No key → return a heuristic result instead of failing
    return null;
  }
  const { createLlmClient } = require('../llm');
  const model = process.env.WEB_MINI_MODEL || 'claude-haiku-4-5' || 'claude-3-5-haiku-latest';
  const client = createLlmClient('anthropic', {
    apiKey: env.ANTHROPIC_API_KEY,
    model,
    maxTokens,
    temperature: 0.2,
  });
  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: userText });
  let out = '';
  try {
    for await (const ev of client.stream(messages, [])) {
      if (ev.type === 'text_delta') out += ev.text;
      if (ev.type === 'done') break;
    }
  } catch (e) {
    // Fallback to sonnet if haiku not available
    try {
      const fb = createLlmClient('anthropic', { apiKey: env.ANTHROPIC_API_KEY, model: env.ANTHROPIC_MODEL, maxTokens, temperature: 0.2 });
      out = '';
      for await (const ev of fb.stream(messages, [])) {
        if (ev.type === 'text_delta') out += ev.text;
        if (ev.type === 'done') break;
      }
    } catch {
      return null;
    }
  }
  return out.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool definitions
// ─────────────────────────────────────────────────────────────────────────────

const WEB_TOOL_DEFINITIONS = [
  {
    name: 'web_search',
    description: 'Recherche sur le web (DuckDuckGo HTML, fallback Brave/Startpage). Retourne une liste de résultats {title, url, snippet, rank}. Ne nécessite pas de clé API.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Texte de recherche' },
        limit: { type: 'number', description: 'Nombre max de résultats (défaut 10, max 25)' },
        locale: { type: 'string', description: "Locale de recherche (ex: 'fr', 'fr-FR', 'us-en'). Défaut 'fr'." },
        safeSearch: { type: 'boolean', description: 'Active le SafeSearch (défaut true)' },
        site: { type: 'string', description: "Restreint à un domaine (ex: 'fr.wikipedia.org')" },
      },
      required: ['query'],
    },
  },
  {
    name: 'web_fetch',
    description: 'Récupère le contenu d\'une URL. Modes : http (rapide via undici), browser (Playwright pour pages JS), auto (essaye http puis bascule sur browser). Extract : text, markdown, readability, raw.',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL à récupérer (http/https uniquement, IPs privées bloquées)' },
        mode: { type: 'string', enum: ['auto', 'http', 'browser'], description: "Méthode de fetch (défaut 'auto')" },
        extractMode: { type: 'string', enum: ['text', 'markdown', 'raw', 'readability'], description: "Extraction (défaut 'text')" },
        prompt: { type: 'string', description: "Si fourni, utilise un LLM mini (Claude Haiku) pour extraire l'information ciblée selon ce prompt." },
      },
      required: ['url'],
    },
  },
  {
    name: 'research_deep',
    description: "Recherche approfondie multi-étapes : enchaîne web_search + web_fetch sur les meilleurs résultats, puis synthétise. Retourne {summary, citations, steps}.",
    parameters: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'Question de recherche' },
        depth: { type: 'string', enum: ['shallow', 'deep'], description: "shallow = 1 search + 3 fetches ; deep = jusqu'à maxSteps (défaut shallow)" },
        maxSteps: { type: 'number', description: "Nombre max d'étapes (défaut 8)" },
        scope: { type: 'string', description: "Restriction optionnelle (ex: domaine, période, langue)" },
      },
      required: ['question'],
    },
  },
  {
    name: 'web_download',
    description: "Télécharge un fichier depuis une URL (image, logo, CSS, PDF, zip, font, vidéo…) et le stocke directement dans FileRecord. Retourne {fileId, name, mimeType, size}. UTILISE CE TOOL dès que tu dois récupérer un asset binaire depuis un site (ex: logo PNG, CSS complet, font WOFF) — ne passe PAS par web_fetch qui n'accepte que du texte/markdown. Pour sauvegarder ensuite dans le projet : project_write_file({path, fileId}).",
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL HTTP/HTTPS (IPs privées bloquées)' },
        filename: { type: 'string', description: 'Nom souhaité (sinon déduit de l\'URL)' },
        maxSizeBytes: { type: 'number', description: 'Taille max acceptée (défaut 50 Mo)' },
      },
      required: ['url'],
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Executor factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create web tools executor.
 * @param {object} metadata - { workspaceId, flowId?, formId? } (informational; tools are stateless)
 * @param {function} emit - Side event emitter (canvas.research.step events go here)
 * @returns {{ definitions, canHandle, execute, cleanup }}
 */
function createWebExecutor(metadata, emit) {
  const baseEmit = typeof emit === 'function' ? emit : () => {};
  let currentEmit = baseEmit;
  // LIVE STREAMING : en plus du harness emit (drain à la fin du tool), pousse
  // aussi chaque event sur le bus thread pour que les SSE actifs le reçoivent
  // en TEMPS RÉEL (sans attendre la fin du tool long comme research_deep).
  let threadEmitter = null;
  try {
    if (metadata?.threadId) {
      const { emitThreadEvent } = require('../jobs/job-events');
      threadEmitter = (ev) => emitThreadEvent(String(metadata.threadId), ev);
    }
  } catch {}
  const safeEmit = (ev) => {
    try { currentEmit(ev); } catch {}
    try { if (threadEmitter) threadEmitter(ev); } catch {}
  };

  function emitStep(payload) {
    try { safeEmit({ type: 'canvas.research.step', ...payload }); } catch {}
  }

  function emitPreviewUpdate(patch) {
    try { safeEmit({ type: 'ui.preview.update', patch }); } catch {}
  }

  // ── web_search
  async function tool_web_search(input) {
    const query = String(input.query || '').trim();
    if (!query) return { error: 'query requis' };
    const limit = Math.min(Math.max(parseInt(input.limit || 10, 10) || 10, 1), 25);
    const locale = input.locale || 'fr';
    const safeSearch = input.safeSearch !== false;
    const site = input.site || undefined;

    emitStep({ stepType: 'search', query, status: 'running' });
    try {
      const { engine, results } = await runSearch({ query, limit, locale, safeSearch, site });
      const preview = results.slice(0, 3).map(r => ({ title: r.title, url: r.url }));
      emitStep({ stepType: 'search', query, status: 'done', engine, count: results.length, resultPreview: preview });
      return { engine, query, results };
    } catch (e) {
      emitStep({ stepType: 'search', query, status: 'error', error: e.message });
      return { error: e.message };
    }
  }

  // ── web_fetch
  async function tool_web_fetch(input) {
    const url = String(input.url || '').trim();
    if (!url) return { error: 'url requis' };
    const mode = input.mode || 'auto';
    const extractMode = input.extractMode || 'text';
    const prompt = input.prompt || null;
    const fetchedAt = new Date().toISOString();

    emitStep({ stepType: 'fetch', url, status: 'running' });

    try {
      let resp = null;
      let wasJsRendered = false;

      if (mode === 'http') {
        resp = await httpFetch(url);
      } else if (mode === 'browser') {
        resp = await browserFetch(url);
        wasJsRendered = true;
      } else {
        // auto
        try {
          resp = await httpFetch(url);
          if (looksLikeJsShell(resp.body)) {
            const browserResp = await browserFetch(url).catch(() => null);
            if (browserResp) { resp = browserResp; wasJsRendered = true; }
          }
        } catch (e) {
          // Fallback to browser on http failure
          resp = await browserFetch(url);
          wasJsRendered = true;
        }
      }

      const html = resp.body || '';
      const title = (resp.title || getDocTitle(html) || '').slice(0, 300);

      const out = {
        url,
        title,
        statusCode: resp.statusCode,
        contentType: resp.contentType,
        bytes: resp.bytes,
        fetchedAt,
        wasJsRendered,
      };

      // Non-HTML payloads — return as text directly
      if (resp.contentType && /^application\/json/.test(resp.contentType)) {
        out.text = (html || '').slice(0, MAX_RAW_CHARS);
      } else if (resp.contentType && !/html|xml/.test(resp.contentType)) {
        out.text = (html || '').slice(0, MAX_RAW_CHARS);
      } else {
        if (extractMode === 'raw') {
          out.html = html.slice(0, MAX_RAW_CHARS);
        } else if (extractMode === 'markdown') {
          out.markdown = extractMarkdown(html).slice(0, MAX_RAW_CHARS);
        } else if (extractMode === 'readability') {
          const art = extractReadability(html, url);
          if (art) {
            out.title = out.title || art.title;
            out.text = (art.textContent || '').slice(0, MAX_RAW_CHARS);
            out.html = (art.content || '').slice(0, MAX_RAW_CHARS);
            out.excerpt = art.excerpt || '';
            out.byline = art.byline || '';
          } else {
            out.text = extractText(html).slice(0, MAX_RAW_CHARS);
          }
        } else {
          out.text = extractText(html).slice(0, MAX_RAW_CHARS);
        }
      }

      // Optional LLM extraction
      if (prompt) {
        const baseText = out.text || extractText(html).slice(0, 60_000);
        const llmOut = await callMiniLlm({
          system: "Tu es un extracteur d'informations web. Réponds UNIQUEMENT avec l'information demandée par l'utilisateur, basée sur le texte fourni. Si l'info n'est pas présente, réponds 'Non trouvé'. Sois bref et factuel.",
          userText: `Source: ${url}\nTitre: ${title}\n\n=== Demande ===\n${prompt}\n\n=== Texte de la page ===\n${baseText.slice(0, 60_000)}`,
          maxTokens: 2000,
        });
        if (llmOut) out.extracted = llmOut;
      }

      const previewSrc = out.extracted || out.text || out.markdown || out.html || '';
      emitStep({ stepType: 'fetch', url, status: 'done', statusCode: out.statusCode, wasJsRendered, resultPreview: previewSrc.slice(0, 400) });
      return out;
    } catch (e) {
      emitStep({ stepType: 'fetch', url, status: 'error', error: e.message });
      return { error: e.message, url, fetchedAt };
    }
  }

  // ── research_deep
  async function tool_research_deep(input) {
    const question = String(input.question || '').trim();
    if (!question) return { error: 'question requis' };
    const depth = input.depth === 'deep' ? 'deep' : 'shallow';
    const maxSteps = Math.min(Math.max(parseInt(input.maxSteps || 8, 10) || 8, 2), 16);
    const scope = input.scope || '';

    const steps = [];
    const citations = [];
    const seenUrls = new Set();
    const corpus = []; // { url, title, text }

    const fetchTopN = depth === 'shallow' ? 3 : 5;
    let totalSteps = 0;

    // Step 1: initial search
    let queries = [scope ? `${question} ${scope}` : question];
    let searchRound = 0;

    // Init live-preview state
    emitPreviewUpdate([{ op: 'replace', path: '/question', value: question }]);
    emitPreviewUpdate([{ op: 'replace', path: '/depth', value: depth }]);
    emitPreviewUpdate([{ op: 'replace', path: '/steps', value: [] }]);
    emitPreviewUpdate([{ op: 'replace', path: '/citations', value: [] }]);

    while (totalSteps < maxSteps && queries.length) {
      const q = queries.shift();
      totalSteps++;
      const idxSearch = steps.length;
      steps.push({ type: 'search', query: q, status: 'running' });
      emitPreviewUpdate([{ op: 'add', path: `/steps/${idxSearch}`, value: steps[idxSearch] }]);

      const searchRes = await tool_web_search({ query: q, limit: fetchTopN * 2 });
      const summary = searchRes.error ? `Erreur: ${searchRes.error}` : `${(searchRes.results || []).length} résultats`;
      steps[idxSearch] = { type: 'search', query: q, status: searchRes.error ? 'error' : 'done', summary };
      emitPreviewUpdate([{ op: 'replace', path: `/steps/${idxSearch}`, value: steps[idxSearch] }]);

      if (searchRes.error || !searchRes.results) continue;

      // Pick top results not already fetched
      const toFetch = searchRes.results.filter(r => !seenUrls.has(r.url)).slice(0, fetchTopN);

      for (const r of toFetch) {
        if (totalSteps >= maxSteps) break;
        totalSteps++;
        seenUrls.add(r.url);
        const idxFetch = steps.length;
        steps.push({ type: 'fetch', url: r.url, status: 'running' });
        emitPreviewUpdate([{ op: 'add', path: `/steps/${idxFetch}`, value: steps[idxFetch] }]);

        const fetchRes = await tool_web_fetch({ url: r.url, mode: 'auto', extractMode: 'readability' });
        if (fetchRes.error) {
          steps[idxFetch] = { type: 'fetch', url: r.url, status: 'error', summary: `Erreur: ${fetchRes.error}` };
          emitPreviewUpdate([{ op: 'replace', path: `/steps/${idxFetch}`, value: steps[idxFetch] }]);
          continue;
        }
        const text = (fetchRes.text || '').slice(0, 12_000);
        if (text.length > 200) {
          corpus.push({ url: r.url, title: fetchRes.title || r.title, text });
          const citationIdx = citations.length;
          citations.push({ title: fetchRes.title || r.title, url: r.url });
          emitPreviewUpdate([{ op: 'add', path: `/citations/${citationIdx}`, value: citations[citationIdx] }]);
        }
        steps[idxFetch] = { type: 'fetch', url: r.url, status: 'done', summary: `${text.length} chars (${fetchRes.title || r.title})`, title: fetchRes.title || r.title };
        emitPreviewUpdate([{ op: 'replace', path: `/steps/${idxFetch}`, value: steps[idxFetch] }]);
      }

      // For deep mode: optionally generate follow-up queries via mini LLM
      if (depth === 'deep' && totalSteps < maxSteps && searchRound < 2) {
        searchRound++;
        const followUp = await callMiniLlm({
          system: "Tu es un assistant de recherche. À partir des sources collectées, propose 1 ou 2 nouvelles requêtes de recherche complémentaires pour approfondir la question. Réponds UNIQUEMENT avec une liste, une requête par ligne, sans numérotation ni explication.",
          userText: `Question: ${question}\n${scope ? 'Cadre: ' + scope + '\n' : ''}\n=== Sources collectées ===\n${corpus.map(c => `[${c.title}] ${c.text.slice(0, 600)}`).join('\n\n').slice(0, 12_000)}\n\nNouvelles requêtes :`,
          maxTokens: 200,
        });
        if (followUp) {
          followUp.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 2).forEach(q2 => {
            if (q2 && !queries.includes(q2)) queries.push(q2);
          });
        }
      }
    }

    // Synthesize
    let summary = '';
    if (corpus.length === 0) {
      summary = "Aucune source exploitable trouvée pour cette question.";
    } else {
      const llmSummary = await callMiniLlm({
        system: "Tu es un analyste. Synthétise une réponse claire et structurée à la question, basée UNIQUEMENT sur les sources fournies. Cite les sources entre crochets [1], [2] etc. selon leur ordre. Sois concis (300-600 mots).",
        userText: `Question: ${question}\n${scope ? 'Cadre: ' + scope + '\n' : ''}\n=== Sources ===\n${corpus.map((c, i) => `[${i + 1}] ${c.title} — ${c.url}\n${c.text.slice(0, 4000)}`).join('\n\n---\n\n')}\n\nRéponds maintenant :`,
        maxTokens: 2000,
      });
      if (llmSummary) {
        summary = llmSummary;
      } else {
        // Heuristic fallback: concatenate snippets, dedupe
        const seenSnips = new Set();
        const lines = [];
        lines.push(`Synthèse heuristique pour : ${question}\n`);
        corpus.forEach((c, i) => {
          const snippet = c.text.replace(/\s+/g, ' ').slice(0, 600);
          if (seenSnips.has(snippet.slice(0, 80))) return;
          seenSnips.add(snippet.slice(0, 80));
          lines.push(`[${i + 1}] ${c.title}\n${snippet}\n`);
        });
        summary = lines.join('\n');
      }
    }

    return { question, depth, summary, citations, steps };
  }

  // ── web_download : télécharge asset binaire vers FileRecord
  async function tool_web_download(input) {
    const url = String(input.url || '').trim();
    if (!url) return { ok: false, error: 'url requis' };
    try { await validateUrl(url); } catch (e) { return { ok: false, error: e?.message || 'URL invalide/interdite' }; }
    const maxSize = Math.min(Math.max(parseInt(input.maxSizeBytes || (50 * 1024 * 1024), 10), 1024), 200 * 1024 * 1024);

    emitStep({ id: randomUUID(), type: 'fetch', status: 'running', url, title: 'Téléchargement asset' });
    emitPreviewUpdate([
      { op: 'replace', path: '/url', value: url },
      { op: 'replace', path: '/status', value: 'running' },
      { op: 'replace', path: '/receivedBytes', value: 0 },
    ]);

    try {
      // Suivi manuel des redirects (undici récent a retiré maxRedirections)
      const { request } = require('undici');
      let currentUrl = url;
      let statusCode, headers, body;
      for (let redirectHop = 0; redirectHop < 6; redirectHop++) {
        const res = await request(currentUrl, {
          method: 'GET',
          headersTimeout: 15000,
          bodyTimeout: 60000,
        });
        statusCode = res.statusCode;
        headers = res.headers;
        body = res.body;
        if (statusCode >= 300 && statusCode < 400 && headers.location) {
          const next = new URL(headers.location, currentUrl).toString();
          try { await validateUrl(next); } catch (e) { return { ok: false, error: `redirect bloqué: ${e?.message}` }; }
          currentUrl = next;
          // drain body pour libérer la socket
          try { for await (const _ of res.body) { /* drain */ } } catch {}
          continue;
        }
        break;
      }
      if (statusCode >= 400) {
        emitStep({ id: randomUUID(), type: 'fetch', status: 'error', url, title: `HTTP ${statusCode}` });
        emitPreviewUpdate([{ op: 'replace', path: '/status', value: 'error' }, { op: 'replace', path: '/error', value: `HTTP ${statusCode}` }]);
        return { ok: false, error: `HTTP ${statusCode}`, status: statusCode };
      }
      const mimeType = (headers['content-type'] || 'application/octet-stream').split(';')[0].trim();
      const contentLength = parseInt(headers['content-length'] || '0', 10);
      emitPreviewUpdate([
        { op: 'replace', path: '/mimeType', value: mimeType },
        { op: 'replace', path: '/totalBytes', value: contentLength || null },
      ]);
      if (contentLength && contentLength > maxSize) {
        emitPreviewUpdate([{ op: 'replace', path: '/status', value: 'error' }]);
        return { ok: false, error: `Fichier > ${maxSize} bytes (${contentLength})` };
      }
      // Stream vers buffer avec cap
      const chunks = [];
      let total = 0;
      let lastEmit = 0;
      for await (const c of body) {
        total += c.length;
        if (total > maxSize) {
          emitPreviewUpdate([{ op: 'replace', path: '/status', value: 'error' }]);
          return { ok: false, error: `Fichier dépasse ${maxSize} bytes pendant download` };
        }
        chunks.push(c);
        // Throttle : au plus toutes les 100ms
        const now = Date.now();
        if (now - lastEmit > 100) {
          lastEmit = now;
          emitPreviewUpdate([{ op: 'replace', path: '/receivedBytes', value: total }]);
        }
      }
      const buf = Buffer.concat(chunks);
      // Déduire nom
      let name = String(input.filename || '').trim();
      if (!name) {
        try {
          const u = new URL(url);
          name = decodeURIComponent((u.pathname.split('/').pop() || '').trim());
        } catch {}
      }
      if (!name || name === '/') {
        const ext = (mimeType.split('/').pop() || 'bin').replace(/[^a-z0-9]/gi, '');
        name = `download.${ext}`;
      }
      // Store via createFilesHelper
      const { createFilesHelper } = require('../../services/file-storage');
      const files = createFilesHelper({ workspaceId: metadata?.workspaceId });
      const stored = await files.store(buf, { name, mimeType, lifecycle: 'execution' });

      emitStep({ id: randomUUID(), type: 'fetch', status: 'done', url, title: name, resultPreview: `${(buf.length / 1024).toFixed(1)} Ko` });
      emitPreviewUpdate([
        { op: 'replace', path: '/status', value: 'done' },
        { op: 'replace', path: '/name', value: name },
        { op: 'replace', path: '/receivedBytes', value: buf.length },
        { op: 'replace', path: '/fileId', value: stored.fileId || stored.id },
      ]);
      return {
        ok: true,
        fileId: stored.fileId || stored.id,
        name,
        mimeType,
        size: buf.length,
        url,
      };
    } catch (e) {
      emitStep({ id: randomUUID(), type: 'fetch', status: 'error', url, title: e?.message || 'Erreur' });
      emitPreviewUpdate([{ op: 'replace', path: '/status', value: 'error' }, { op: 'replace', path: '/error', value: e?.message || 'Erreur' }]);
      return { ok: false, error: e?.message || String(e) };
    }
  }

  const tools = {
    web_search: tool_web_search,
    web_fetch: tool_web_fetch,
    research_deep: tool_research_deep,
    web_download: tool_web_download,
  };

  return {
    definitions: WEB_TOOL_DEFINITIONS,
    canHandle(name) { return name in tools; },
    async execute(name, input) {
      if (!(name in tools)) throw new Error(`Unknown web tool: ${name}`);
      const tag = `[web-tool:${name}]`;
      console.log(`${tag} input:`, JSON.stringify(input || {}, null, 2).slice(0, 800));
      try {
        const result = await tools[name](input || {});
        const preview = JSON.stringify(result || {}).slice(0, 500);
        console.log(`${tag} result preview: ${preview}`);
        return result;
      } catch (err) {
        console.error(`${tag} ERROR:`, err.message);
        throw err;
      }
    },
    async executeWithCtx(name, input, callCtx) {
      const prev = currentEmit;
      if (typeof callCtx?.emit === 'function') currentEmit = callCtx.emit;
      try {
        return await this.execute(name, input);
      } finally {
        currentEmit = prev;
      }
    },
    async cleanup() {
      // Browser is a singleton — we don't close per-execution; closed on signal
      // Caller can opt to force-close via closeBrowser() if needed
    },
  };
}

module.exports = {
  WEB_TOOL_DEFINITIONS,
  createWebExecutor,
  // Internals exported for tests / explicit shutdown
  _internal: { validateUrl, closeBrowser, looksLikeJsShell, extractText, extractMarkdown, extractReadability, decodeDdgRedirect },
};
