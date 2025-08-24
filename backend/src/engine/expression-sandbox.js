// Adapted from provided example
const vm = require('vm');

const builtinHelpers = {
  keys: (v) => (v && typeof v === 'object' ? Object.keys(v) : []),
  values: (v) => (v && typeof v === 'object' ? Object.values(v) : []),
  isEmpty: (v) => {
    if (v == null) return true;
    if (Array.isArray(v)) return v.length === 0;
    if (typeof v === 'object') return Object.keys(v).length === 0;
    if (typeof v === 'string') return v.length === 0;
    return false;
  },
  hasField: (obj, key) => !!(obj && typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, key)),
};

const FORBIDDEN = /\b(?:function|class|while|for|do|try|catch|finally|switch|case|default|break|continue|return|import|export|await|yield|with)\b|=>|;|\/\*|\*\//i;
const DANGEROUS_GLOBALS = /\b(?:globalThis|window|document|self|process|require|module|Function|eval|XMLHttpRequest|fetch|WebSocket|child_process)\b/;

function assertSafeExpression(expr){
  if (FORBIDDEN.test(expr)) throw new Error('Only expressions are allowed.');
  if (DANGEROUS_GLOBALS.test(expr)) throw new Error('Dangerous globals are blocked.');
}

function evaluateExpression(expr, context = {}){
  if (typeof expr !== 'string') throw new Error('Expression must be a string.');
  assertSafeExpression(expr);
  const sandbox = Object.create(null);
  Object.assign(sandbox, { Math, Date, JSON, Number, String, Boolean, Array, Object, ...builtinHelpers });
  for (const [k,v] of Object.entries(context)) if (!(k in sandbox)) sandbox[k] = v;
  const vmContext = vm.createContext(sandbox, { name: 'expr-sandbox', codeGeneration: { strings: false, wasm: false } });
  const wrapped = `'use strict';( ${expr} )`;
  try {
    const script = new vm.Script(wrapped, { timeout: 50 });
    return script.runInContext(vmContext, { timeout: 50 });
  } catch (e) { throw new Error((e && e.message) ? e.message : String(e)); }
}

const ISLAND_RE = /\{\{\s*([\s\S]*?)\s*\}\}/g;
function tokenizeIslands(template){
  const parts = []; let lastIndex = 0; let m;
  while ((m = ISLAND_RE.exec(template))){
    const start = m.index; const end = ISLAND_RE.lastIndex;
    if (start > lastIndex) parts.push({ type: 'text', value: template.slice(lastIndex, start) });
    parts.push({ type: 'island', expr: m[1], raw: template.slice(start, end) });
    lastIndex = end;
  }
  if (lastIndex < template.length) parts.push({ type: 'text', value: template.slice(lastIndex) });
  return parts;
}

function toDisplayString(v){
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  try { return JSON.stringify(v); } catch { return String(v); }
}

function evaluateTemplateDetailed(template, context={}){
  const errors = []; const parts = tokenizeIslands(String(template));
  const onlyIsland = parts.length === 1 && parts[0].type === 'island';
  if (onlyIsland){
    const { expr, raw } = parts[0];
    try { const v = evaluateExpression(expr, context); return { text: toDisplayString(v), errors: [], islands: [{ expr, ok: true, raw }] };
    } catch (e) { errors.push({ message: e.message, index: 0, expr, raw }); return { text: raw, errors, islands: [{ expr, ok: false, raw, error: e.message }] }; }
  }
  let out = ''; let iIsland = 0; const islands = [];
  for (const p of parts){
    if (p.type === 'text'){ out += p.value; continue; }
    const { expr, raw } = p; try { const v = evaluateExpression(expr, context); out += toDisplayString(v); islands.push({ expr, ok: true, raw }); }
    catch (e){ errors.push({ message: e.message, index: iIsland, expr, raw }); out += raw; islands.push({ expr, ok: false, raw, error: e.message }); }
    iIsland++;
  }
  return { text: out, errors, islands };
}

module.exports = { evaluateExpression, evaluateTemplateDetailed, tokenizeIslands, toDisplayString, builtinHelpers };

