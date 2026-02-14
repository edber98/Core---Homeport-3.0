// Manual Index — searchable reference docs for the AI agent
// Loads markdown files with @topic: tags, indexes them for keyword search
// Used by search_manual / get_manual_section meta-tools

const fs = require('fs');
const path = require('path');

// Cache: { namespace → { topic → { title, content, summary } } }
let cache = null;

/**
 * Parse a markdown file into tagged sections.
 * Sections are delimited by <!-- @topic:xxx --> markers.
 */
function parseSections(raw) {
  const sections = {};
  const parts = raw.split(/<!-- @topic:(\w+) -->/);
  // parts[0] = content before first tag (ignored)
  // parts[1] = topic name, parts[2] = content, parts[3] = topic, parts[4] = content, ...
  for (let i = 1; i < parts.length; i += 2) {
    const topic = parts[i];
    const content = (parts[i + 1] || '').trim();
    const title = content.match(/^##?\s+(.+)/m)?.[1] || topic;
    const lines = content.split('\n').filter(l => l.trim());
    const summary = lines.slice(0, 3).join(' ').slice(0, 250);
    sections[topic] = { title, content, summary };
  }
  return sections;
}

/**
 * Load all manual markdown files and build the index.
 */
function loadManuals() {
  if (cache) return cache;
  cache = {};
  const dir = __dirname;
  try {
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.md')) continue;
      const ns = file.replace('.md', '');
      const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
      cache[ns] = parseSections(raw);
    }
  } catch (e) {
    console.error('[manual-index] load error:', e.message);
  }
  return cache;
}

/**
 * Score how well a query matches a section.
 */
function scoreMatch(queryWords, topic, title, summary) {
  const fields = [topic.toLowerCase(), title.toLowerCase(), summary.toLowerCase()];
  let score = 0;
  for (const w of queryWords) {
    for (const f of fields) {
      if (f.includes(w)) score += 1;
      // Bonus for exact topic match
      if (f === topic.toLowerCase() && f === w) score += 3;
    }
  }
  return score;
}

/**
 * Search manual sections by keyword.
 * @param {string} query - Search text
 * @param {string} [namespace] - Limit to a specific namespace
 * @returns {Array<{ namespace, topic, title, summary, score }>}
 */
function searchManual(query, namespace) {
  const manuals = loadManuals();
  const q = (query || '').toLowerCase().trim();
  if (!q) return { error: 'Query requise pour search_manual.' };

  const words = q.split(/\s+/).filter(Boolean);
  const results = [];

  const namespaces = namespace ? [namespace] : Object.keys(manuals);
  for (const ns of namespaces) {
    const sections = manuals[ns];
    if (!sections) continue;
    for (const [topic, sec] of Object.entries(sections)) {
      const score = scoreMatch(words, topic, sec.title, sec.summary);
      if (score > 0) {
        results.push({ namespace: ns, topic, title: sec.title, summary: sec.summary, score });
      }
    }
  }

  results.sort((a, b) => b.score - a.score);
  return { results: results.slice(0, 8), totalSections: results.length };
}

/**
 * Get a specific manual section by topic ID.
 * @param {string} topic - Topic ID
 * @param {string} [namespace] - Namespace (if omitted, searches all)
 * @returns {{ namespace, topic, title, content } | null}
 */
function getManualSection(topic, namespace) {
  const manuals = loadManuals();
  const namespaces = namespace ? [namespace] : Object.keys(manuals);
  for (const ns of namespaces) {
    if (manuals[ns]?.[topic]) {
      const sec = manuals[ns][topic];
      return { namespace: ns, topic, title: sec.title, content: sec.content };
    }
  }
  return null;
}

/**
 * Invalidate cache (for hot reload during dev).
 */
function invalidateCache() {
  cache = null;
}

module.exports = { searchManual, getManualSection, loadManuals, invalidateCache };
