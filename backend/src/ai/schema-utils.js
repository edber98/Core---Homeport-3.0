// CommonJS utilities to navigate and mutate a Dynamic Form schema

function parsePtr(p){ return String(p||'').replace(/^\//,'').split('/').map(s => s.replace(/~1/g,'/').replace(/~0/g,'~')); }
function encodePart(s){ return String(s).replace(/~/g,'~0').replace(/\//g,'~1'); }
function joinPtr(parts){ return '/' + parts.map(encodePart).join('/'); }

// Convert UI-style path like "fields[0].fields[1]" or "steps[0].fields[2]" or with trailing [-] to a JSON Pointer
function toPointer(input){
  if (!input) return '/';
  const s = String(input).trim();
  if (s.startsWith('/')) return s; // already a JSON Pointer
  // tokenize: words or bracketed indices
  const tokens = [];
  const re = /([^[.\]]+)|\[(\-?\d+)\]/g;
  let m;
  while ((m = re.exec(s))){
    if (m[1]) tokens.push(m[1]);
    else if (m[2]) tokens.push(m[2]);
  }
  if (!tokens.length) return '/';
  return joinPtr(tokens);
}

function toUiPathFromPointer(ptr){
  const parts = parsePtr(ptr);
  if (!parts.length) return '';
  const segs = [];
  for (let i = 0; i < parts.length; i++){
    const p = parts[i];
    if (i === 0) { segs.push(p); continue; }
    if (/^\d+$/.test(p)) segs[segs.length-1] = segs[segs.length-1] + `[${p}]`;
    else segs.push(p);
  }
  return segs.join('.');
}

function getAt(obj, ptr){
  const parts = parsePtr(ptr);
  return parts.reduce((acc, k) => (acc == null ? undefined : acc[k]), obj);
}
function setAt(obj, ptr, value){
  const parts = parsePtr(ptr);
  const last = parts[parts.length-1];
  const parent = parts.slice(0,-1).reduce((acc, k) => (acc[k] == null ? (acc[k] = (isFinite(+k) ? [] : {})) : acc[k]), obj);
  if (Array.isArray(parent)) { if (last === '-') parent.push(value); else parent[Number(last)] = value; }
  else parent[last] = value;
}
function removeAt(obj, ptr){
  const parts = parsePtr(ptr);
  const last = parts[parts.length-1];
  const parent = parts.slice(0,-1).reduce((acc, k) => (acc == null ? undefined : acc[k]), obj);
  if (parent == null) return;
  if (Array.isArray(parent)) parent.splice(Number(last), 1); else delete parent[last];
}

function listTree(schema){
  const out = [];
  const rootFields = Array.isArray(schema?.fields) ? schema.fields : null;
  const steps = Array.isArray(schema?.steps) ? schema.steps : null;
  if (rootFields){
    out.push({ pointer: '/', uiPath: '', kind: 'root', title: schema?.title, type: 'root' });
    walkFields(rootFields, '/fields', 'fields', out);
  } else if (steps){
    out.push({ pointer: '/', uiPath: '', kind: 'root', title: schema?.title, type: 'root' });
    steps.forEach((st, i) => {
      const base = `/steps/${i}`;
      out.push({ pointer: base, uiPath: `steps[${i}]`, kind: 'step', title: st?.title, type: 'step' });
      walkFields(st?.fields || [], base + '/fields', `steps[${i}].fields`, out);
    });
  }
  return out;
}
function walkFields(fields, base, uiBase, out){
  (fields || []).forEach((f, i) => {
    const p = `${base}/${i}`;
    const ui = `${uiBase}[${i}]`;
    if (f?.type === 'section' || f?.type === 'section_array' || f?.mode === 'array'){
      out.push({ pointer: p, uiPath: ui, kind: 'section', type: f?.type, key: f?.key, title: f?.title });
      walkFields(f?.fields || [], p + '/fields', ui + '.fields', out);
    } else {
      out.push({ pointer: p, uiPath: ui, kind: 'field', type: f?.type, key: f?.key, label: f?.label });
    }
  });
}

function findPathsByKey(schema, key){
  const tree = listTree(schema);
  return tree.filter(n => (n.kind === 'field' || n.kind === 'section') && n.key === key).map(n => n.pointer);
}

function moveWithinArray(obj, arrayPtr, fromIndex, toIndex){
  const arr = getAt(obj, arrayPtr);
  if (!Array.isArray(arr)) return false;
  const n = arr.length;
  if (fromIndex < 0 || fromIndex >= n) return false;
  if (toIndex < 0) toIndex = 0; if (toIndex >= n) toIndex = n - 1;
  if (fromIndex === toIndex) return true;
  const [it] = arr.splice(fromIndex, 1);
  arr.splice(toIndex, 0, it);
  return true;
}

function parentArrayPtr(ptr){
  const parts = parsePtr(ptr);
  const parent = parts.slice(0, -1);
  return joinPtr(parent);
}

function indexFromPtr(ptr){
  const parts = parsePtr(ptr);
  const last = parts[parts.length-1];
  return Number(last);
}

function clampCol(col){
  const out = { ...(col || {}) };
  const clamp = (v) => (typeof v === 'number' ? Math.min(24, Math.max(1, v)) : undefined);
  const xs = clamp(out.xs ?? 24);
  const sm = clamp(out.sm ?? xs);
  const md = clamp(out.md ?? sm);
  const lg = clamp(out.lg ?? md);
  const xl = clamp(out.xl ?? lg);
  return { xs, sm, md, lg, xl };
}

module.exports = {
  parsePtr, joinPtr, getAt, setAt, removeAt,
  listTree, findPathsByKey, moveWithinArray, parentArrayPtr, indexFromPtr,
  clampCol, toPointer, toUiPathFromPointer
};
