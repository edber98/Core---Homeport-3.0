// Live Preview Parser
// Accumule les tool.input_delta chunks d'un tool call, tente de réparer le JSON partiel
// et calcule un diff minimal (JSON patch add/replace/remove) depuis le dernier état connu.
//
// NB: Une réparation robuste "jsonrepair-like" serait idéale, mais on n'introduit pas
//     de nouvelle dépendance NPM ici. On implémente un repair léger couvrant les cas
//     fréquents du streaming LLM : strings/objets/arrays non fermés, trailing commas.

'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Repair léger pour JSON partiel (structures non terminées pendant le streaming)
// ─────────────────────────────────────────────────────────────────────────────
function repairPartialJson(src) {
  if (typeof src !== 'string') return null;
  const s = src.trim();
  if (!s) return null;

  // Stacks pour suivre la structure
  const stack = [];
  let inString = false;
  let escape = false;
  let lastNonWs = '';
  let lastNonWsIdx = -1;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inString) {
      if (escape) { escape = false; continue; }
      if (ch === '\\') { escape = true; continue; }
      if (ch === '"') { inString = false; }
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === '{' || ch === '[') { stack.push(ch); }
    else if (ch === '}') { if (stack[stack.length - 1] === '{') stack.pop(); }
    else if (ch === ']') { if (stack[stack.length - 1] === '[') stack.pop(); }
    if (ch !== ' ' && ch !== '\n' && ch !== '\r' && ch !== '\t') {
      lastNonWs = ch;
      lastNonWsIdx = i;
    }
  }

  let out = s;

  // Close open string
  if (inString) out += '"';

  // Cut trailing commas + dangling keys before closure (e.g. {"a":1,"b":)
  // If last non-ws is ':', remove last pair '<key>:' before closing
  // For simplicity: if trailing structure ends with ',' or ':', trim it.
  out = out.replace(/[,:\s]+$/g, (m) => {
    // If whitespace only, keep
    if (/^\s+$/.test(m)) return m;
    return '';
  });

  // Re-stack for new string (already computed)
  // Close open structures in reverse
  for (let i = stack.length - 1; i >= 0; i--) {
    out += stack[i] === '{' ? '}' : ']';
  }

  try { return JSON.parse(out); } catch { /* fallthrough */ }

  // Fallback : try to progressively truncate to last safe closure
  for (let k = out.length - 1; k > 0; k--) {
    const c = out[k];
    if (c === ',' || c === ':' || c === '"') continue;
    const slice = out.slice(0, k + 1);
    // Attempt: close + parse
    let attempt = slice.replace(/[,:\s]+$/g, '');
    for (let j = stack.length - 1; j >= 0; j--) {
      attempt += stack[j] === '{' ? '}' : ']';
    }
    try { return JSON.parse(attempt); } catch { continue; }
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Diff minimal en JSON-patch-like (RFC 6902 simplifié : add/replace/remove)
// ─────────────────────────────────────────────────────────────────────────────
function isPlainObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

function computeDiff(prev, next, basePath) {
  const patch = [];
  const path = basePath || '';

  if (prev === next) return patch;

  // Type change ou primitive différent → replace au path courant
  if (isPlainObject(prev) && isPlainObject(next)) {
    const prevKeys = Object.keys(prev);
    const nextKeys = Object.keys(next);
    const seen = new Set();
    for (const k of nextKeys) {
      seen.add(k);
      const child = `${path}/${escapePtr(k)}`;
      if (!(k in prev)) {
        patch.push({ op: 'add', path: child, value: next[k] });
      } else if (prev[k] !== next[k]) {
        const pv = prev[k], nv = next[k];
        if (isPlainObject(pv) && isPlainObject(nv)) {
          patch.push(...computeDiff(pv, nv, child));
        } else if (Array.isArray(pv) && Array.isArray(nv)) {
          patch.push(...computeDiff(pv, nv, child));
        } else {
          patch.push({ op: 'replace', path: child, value: nv });
        }
      }
    }
    for (const k of prevKeys) {
      if (!seen.has(k)) patch.push({ op: 'remove', path: `${path}/${escapePtr(k)}` });
    }
    return patch;
  }

  if (Array.isArray(prev) && Array.isArray(next)) {
    const len = Math.max(prev.length, next.length);
    for (let i = 0; i < len; i++) {
      const child = `${path}/${i}`;
      if (i >= prev.length) {
        patch.push({ op: 'add', path: child, value: next[i] });
      } else if (i >= next.length) {
        patch.push({ op: 'remove', path: child });
      } else if (prev[i] !== next[i]) {
        const pv = prev[i], nv = next[i];
        if ((isPlainObject(pv) && isPlainObject(nv)) || (Array.isArray(pv) && Array.isArray(nv))) {
          patch.push(...computeDiff(pv, nv, child));
        } else {
          patch.push({ op: 'replace', path: child, value: nv });
        }
      }
    }
    return patch;
  }

  // Replace at this path
  patch.push({ op: 'replace', path: path || '/', value: next });
  return patch;
}

function escapePtr(key) {
  return String(key).replace(/~/g, '~0').replace(/\//g, '~1');
}

// ─────────────────────────────────────────────────────────────────────────────
// Preview session
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Crée une session de preview parsing pour un tool call.
 * @param {string} toolId
 * @param {string} toolName
 */
function createPreviewSession(toolId, toolName) {
  let buffer = '';
  let lastState = null;

  return {
    toolId,
    toolName,
    get state() { return lastState; },
    get buffer() { return buffer; },

    /**
     * Ajoute un chunk. Retourne { patch, state } si un changement est détecté,
     * sinon null si pas de parse réussi ou pas de diff.
     */
    apply(chunk) {
      if (!chunk) return null;
      buffer += chunk;
      let parsed;
      try { parsed = repairPartialJson(buffer); } catch { parsed = null; }
      if (parsed == null) return null;

      // Pour execute_tool : les vrais args sont sous parsed.args
      let effective = parsed;
      if (toolName === 'execute_tool' && parsed && typeof parsed === 'object' && parsed.args && typeof parsed.args === 'object') {
        effective = parsed.args;
      }

      const patch = computeDiff(lastState, effective);
      if (!patch.length) return null;
      lastState = deepClone(effective);
      return { patch, state: lastState };
    },
  };
}

function deepClone(v) {
  if (v === null || typeof v !== 'object') return v;
  try { return JSON.parse(JSON.stringify(v)); } catch { return v; }
}

module.exports = {
  createPreviewSession,
  repairPartialJson,
  computeDiff,
};
