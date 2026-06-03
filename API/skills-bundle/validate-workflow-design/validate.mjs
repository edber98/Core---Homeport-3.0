#!/usr/bin/env node
// validate-workflow-design — Audit non-destructif d'un graph workflow Kinn.
// Lit { graph } en stdin, écrit { passed, issues } en stdout.

import { readFileSync } from 'node:fs';

// ── Lecture stdin (fd 0) ─────────────────────────────────────────────────
let raw = '';
try { raw = readFileSync(0, 'utf8'); } catch { raw = ''; }
let spec = {};
try { spec = JSON.parse(raw || '{}'); } catch { spec = {}; }

const graph = spec.graph || { nodes: [], edges: [] };
const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
const edges = Array.isArray(graph.edges) ? graph.edges : [];

// ── Helpers ──────────────────────────────────────────────────────────────
function getNodeModel(n) {
  return (n && n.data && n.data.model) || n.model || {};
}
function getNodeType(n) {
  const m = getNodeModel(n);
  const t = m.templateObj?.type || m.type || '';
  return String(t).toLowerCase();
}
function getNodeKey(n) {
  const m = getNodeModel(n);
  return String(m.template || m.templateObj?.id || m.templateObj?.key || '');
}
function getNodeContext(n) {
  return getNodeModel(n).context || {};
}
function getNodeArgs(n) {
  return getNodeModel(n).templateObj?.args || null;
}
function getOutputArrayField(n) {
  const t = getNodeModel(n).templateObj || {};
  return t.output_array_field || null;
}
function isTriggerType(type) {
  return ['start', 'start_form', 'event', 'endpoint'].includes(type);
}
function isJoinType(type) {
  return ['barrier', 'race', 'loop'].includes(type);
}

const issues = [];
function addIssue(severity, code, nodeId, message, extra = {}) {
  issues.push({ severity, code, nodeId, message, ...extra });
}

// ── Indexes ──────────────────────────────────────────────────────────────
const nodeById = new Map();
for (const n of nodes) nodeById.set(String(n.id), n);

const incomingByTarget = new Map();
const outgoingBySource = new Map();
for (const e of edges) {
  const src = String(e.source || '');
  const tgt = String(e.target || '');
  if (!src || !tgt) continue;
  if (!incomingByTarget.has(tgt)) incomingByTarget.set(tgt, []);
  if (!outgoingBySource.has(src)) outgoingBySource.set(src, []);
  incomingByTarget.get(tgt).push(e);
  outgoingBySource.get(src).push(e);
}

// ── Check 1 : Trigger present (no_trigger / multi_trigger) ──────────────
const triggers = nodes.filter(n => isTriggerType(getNodeType(n)));
if (triggers.length === 0) {
  addIssue('critical', 'no_trigger', null,
    'Aucun trigger détecté (start/start_form/event). Le workflow ne pourra pas démarrer.',
    { fix: 'Ajoute un node de démarrage (Start, Start Form ou un event/cron_schedule).' });
} else if (triggers.length > 1) {
  addIssue('warn', 'multi_trigger', null,
    `${triggers.length} triggers détectés (${triggers.map(t => t.id).join(', ')}). Le moteur peut avoir un comportement ambigu.`,
    { fix: 'Garde un seul trigger par workflow, ou utilise un node race si tu veux capter le premier event.' });
}

// ── Check 2 : Convergence N→1 sans barrier ───────────────────────────────
for (const [targetId, inEdges] of incomingByTarget.entries()) {
  if (inEdges.length < 2) continue;
  const node = nodeById.get(targetId);
  if (!node) continue;
  const type = getNodeType(node);
  if (isJoinType(type)) continue; // barrier/race/loop OK
  addIssue('critical', 'convergence_without_barrier', targetId,
    `Le node '${targetId}' a ${inEdges.length} connexions entrantes mais n'est pas de type barrier/race/loop. Le payload reçu sera un tableau fusionné et, si le node fait un appel coûteux (LLM, API externe), il risque d'être exécuté plusieurs fois.`,
    {
      fix: `Insère un core_barrier entre [${inEdges.map(e => e.source).join(', ')}] et '${targetId}'.`,
      incomingSources: inEdges.map(e => e.source),
    });
}

// ── Check 3 : Classifier avec branches non-connectées ───────────────────
for (const n of nodes) {
  const arrayField = getOutputArrayField(n);
  if (!arrayField) continue;
  const ctx = getNodeContext(n);
  const items = Array.isArray(ctx[arrayField]) ? ctx[arrayField] : [];
  if (!items.length) {
    addIssue('warn', 'classifier_unconfigured', n.id,
      `Node multi-output '${n.id}' (output_array_field='${arrayField}') sans items configurés.`,
      { fix: `Configure ${arrayField} dans node.context pour générer les branches.` });
    continue;
  }
  const outgoing = outgoingBySource.get(String(n.id)) || [];
  const connectedHandles = new Set(outgoing.map(e => String(e.sourceHandle || '')));
  for (const it of items) {
    const handleId = String(it._id || it.id || it.name || '');
    if (!handleId) continue;
    if (!connectedHandles.has(handleId)) {
      addIssue('warn', 'classifier_unconnected_branch', n.id,
        `Le node multi-output '${n.id}' a une branche '${it.name || handleId}' sans node aval connecté.`,
        { branch: handleId, branchName: it.name });
    }
  }
}

// ── Check 4 : Orphan nodes ──────────────────────────────────────────────
for (const n of nodes) {
  const id = String(n.id);
  const hasIn = (incomingByTarget.get(id) || []).length > 0;
  const hasOut = (outgoingBySource.get(id) || []).length > 0;
  const type = getNodeType(n);
  if (isTriggerType(type)) continue; // trigger sans in = normal
  if (!hasIn && !hasOut) {
    addIssue('info', 'orphan_node', id,
      `Node '${id}' isolé (aucune connexion entrante ni sortante). Sera ignoré au runtime.`,
      { fix: 'Connecte ce node ou supprime-le.' });
  } else if (!hasIn) {
    addIssue('warn', 'unreachable_node', id,
      `Node '${id}' a une sortie mais aucune entrée — il ne sera jamais déclenché.`);
  }
}

// ── Check 5 : Required args manquants ───────────────────────────────────
function* iterFields(args) {
  const fields = (args && (args.fields || args.steps?.flatMap(s => s.fields))) || [];
  for (const f of fields) {
    if (!f || typeof f !== 'object') continue;
    yield f;
    if (Array.isArray(f.fields)) yield* iterFields({ fields: f.fields });
  }
}
function isRequiredField(f) {
  if (!f) return false;
  if (f.required) return true;
  if (Array.isArray(f.validators)) {
    return f.validators.some(v => v && (v.type === 'required' || v.name === 'required'));
  }
  return false;
}
function isEmpty(v) {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string' && v.trim() === '') return true;
  if (Array.isArray(v) && v.length === 0) return true;
  return false;
}
for (const n of nodes) {
  const args = getNodeArgs(n);
  if (!args) continue;
  const ctx = getNodeContext(n);
  for (const f of iterFields(args)) {
    if (!isRequiredField(f) || !f.key) continue;
    // Skip if field is in a non-visible section (visibleIf check, basic — false negatives OK)
    if (isEmpty(ctx[f.key])) {
      addIssue('critical', 'missing_required_arg', n.id,
        `Champ requis '${f.label || f.key}' manquant dans '${n.id}'.`,
        { field: f.key });
    }
  }
}

// ── Check 6 : Expressions cassées (refs à des nodes inexistants) ────────
const ALL_IDS = new Set(nodes.map(n => String(n.id)));
const EXPR_RE = /\{\{\s*([a-zA-Z_][\w-]*)\.[^}]+\}\}/g;
function scanString(s, currentNodeId) {
  if (typeof s !== 'string' || !s.includes('{{')) return;
  let m;
  EXPR_RE.lastIndex = 0;
  while ((m = EXPR_RE.exec(s))) {
    const refId = m[1];
    // Mots-clés réservés (payload, msg, secret, var, etc.)
    if (['payload', 'msg', 'var', 'env', 'now', 'item', 'index', 'this', 'secret'].includes(refId)) continue;
    if (refId === currentNodeId) {
      addIssue('critical', 'expression_self_ref', currentNodeId,
        `Le node '${currentNodeId}' se réfère à lui-même dans une expression : ${m[0]}.`);
      continue;
    }
    if (!ALL_IDS.has(refId)) {
      addIssue('warn', 'expression_dangling_ref', currentNodeId,
        `Expression ${m[0]} dans '${currentNodeId}' référence un node '${refId}' qui n'existe pas.`,
        { ref: refId });
    }
  }
}
function scanValue(v, nodeId) {
  if (typeof v === 'string') scanString(v, nodeId);
  else if (Array.isArray(v)) v.forEach(x => scanValue(x, nodeId));
  else if (v && typeof v === 'object') Object.values(v).forEach(x => scanValue(x, nodeId));
}
for (const n of nodes) scanValue(getNodeContext(n), String(n.id));

// ── Check 7 : Cycles (DFS) ──────────────────────────────────────────────
const WHITE = 0, GRAY = 1, BLACK = 2;
const color = new Map();
for (const id of ALL_IDS) color.set(id, WHITE);
function dfs(id, path) {
  color.set(id, GRAY);
  const outs = outgoingBySource.get(id) || [];
  for (const e of outs) {
    const next = String(e.target || '');
    if (color.get(next) === GRAY) {
      // Si un node loop est dans le cycle → OK (loop attendu)
      const cyclePath = [...path, next];
      const hasLoop = cyclePath.some(id2 => {
        const n2 = nodeById.get(id2);
        return n2 && getNodeType(n2) === 'loop';
      });
      if (!hasLoop) {
        addIssue('critical', 'cycle_detected', next,
          `Cycle détecté dans le graph : ${cyclePath.join(' → ')} → (boucle vers ${next}). Sans node loop, ce cycle bloquera le runtime.`,
          { path: cyclePath });
      }
      continue;
    }
    if (color.get(next) === WHITE) dfs(next, [...path, next]);
  }
  color.set(id, BLACK);
}
for (const id of ALL_IDS) {
  if (color.get(id) === WHITE) dfs(id, [id]);
}

// ── Aggregation ──────────────────────────────────────────────────────────
const criticalCount = issues.filter(i => i.severity === 'critical').length;
const warnCount = issues.filter(i => i.severity === 'warn').length;
const infoCount = issues.filter(i => i.severity === 'info').length;

const result = {
  passed: criticalCount === 0,
  issueCount: issues.length,
  criticalCount,
  warnCount,
  infoCount,
  issues,
};

process.stdout.write(JSON.stringify(result, null, 2));
