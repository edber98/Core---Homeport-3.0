#!/usr/bin/env node
/**
 * annotate-plugin-risks.js
 *
 * Walks all plugin manifests under API/src/plugins/{local,repos}/<name>/manifest.json
 * and annotates each entry in manifest.nodeTemplates[] (the plugin "functions")
 * with a `risk` field (and optional `riskReason`).
 *
 * Risk levels:
 *   - safe        : read-only, no observable side effect
 *   - write       : modifies reversible state
 *   - destructive : deletes / alters without easy rollback
 *   - elevated    : broad power (exec/run/sync/bulk)
 *
 * Heuristic is applied on the lowercased concatenation of key+name+title.
 * Matching order matters: destructive > elevated > write > safe.
 *
 * Usage:
 *   node scripts/annotate-plugin-risks.js --dry-run
 *   node scripts/annotate-plugin-risks.js --apply
 *   node scripts/annotate-plugin-risks.js --apply --force
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', 'src', 'plugins');
const LOCAL = path.join(ROOT, 'local');
const REPOS = path.join(ROOT, 'repos');

// ---------------------------------------------------------------------------
// CLI flags
// ---------------------------------------------------------------------------
const argv = process.argv.slice(2);
const DRY_RUN = argv.includes('--dry-run') || !argv.includes('--apply');
const APPLY = argv.includes('--apply');
const FORCE = argv.includes('--force');

// ---------------------------------------------------------------------------
// Heuristic keyword tables (order-sensitive within each risk level)
// ---------------------------------------------------------------------------

// "destructive" keywords — highly specific terms that clearly indicate
// non-reversible or hard-to-rollback operations.
const DESTRUCTIVE_KEYWORDS = [
  'delete', 'destroy', 'drop_table', 'drop', 'unlink',
  'remove', 'purge', 'truncate', 'wipe',
  'cancel', 'revoke', 'deactivate',
  'archive', 'unarchive',
  'clear', 'reset', 'empty',
  'replace', 'overwrite',
  'dissociate', 'detach', 'disconnect',
  'refund', 'chargeback',
  'merge_pr', 'merge_pull',
  // Common French verbs sometimes used
  'supprimer', 'retirer', 'annuler', 'révoquer', 'revoquer', 'vider',
  'réinitialiser', 'reinitialiser', 'remplacer', 'écraser', 'ecraser',
  'archiver', 'désactiver', 'desactiver'
];

// "elevated" keywords — broad-impact or bulk/execution operations.
const ELEVATED_KEYWORDS = [
  'execute', 'exec_', 'eval', 'run_code', 'run_query', 'run_script', 'run_sql',
  'trigger_flow', 'trigger_workflow', 'deploy',
  'sync_all', 'sync', 'crawl',
  'scan_all', 'scan',
  'import_all', 'bulk', 'batch_delete', 'mass_',
  'exécuter', 'executer', 'déployer', 'deployer',
  'synchroniser'
];

// "write" keywords — reversible state changes.
const WRITE_KEYWORDS = [
  'create', 'update', 'upload', 'post', 'patch', 'put_',
  'send', 'write', 'insert',
  'add', 'set_', 'publish',
  'import', 'convert', 'render', 'generate', 'transform',
  'tag_', 'label_', 'assign', 'move', 'duplicate', 'copy',
  'invite', 'share', 'comment', 'reply', 'react',
  'mark_', 'star', 'pin', 'unpin',
  'subscribe', 'unsubscribe',
  'schedule', 'plan',
  'issue_', 'register', 'enroll',
  // French verbs
  'créer', 'creer', 'ajouter', 'envoyer', 'modifier', 'mettre',
  'publier', 'téléverser', 'televerser', 'uploader', 'inviter',
  'partager', 'affecter', 'assigner', 'étiqueter', 'etiqueter',
  'marquer', 'dupliquer', 'planifier', 'programmer',
  'importer', 'convertir', 'générer', 'generer'
];

// "safe" keywords — read-only operations.
const SAFE_KEYWORDS = [
  'get_', 'get ', 'list', 'read', 'search', 'find', 'fetch',
  'download', 'count', 'check', 'exists', 'preview', 'export',
  'view', 'show', 'inspect', 'describe', 'watch', 'observe',
  'query_', 'lookup', 'resolve', 'summarize', 'summarise',
  // French
  'lister', 'obtenir', 'récupérer', 'recuperer', 'lire', 'rechercher',
  'trouver', 'télécharger', 'telecharger', 'compter', 'vérifier',
  'verifier', 'exporter', 'afficher', 'consulter', 'prévisualiser',
  'previsualiser'
];

// ---------------------------------------------------------------------------
// Heuristic engine
// ---------------------------------------------------------------------------
function containsAny(haystack, keywords){
  for (const k of keywords){
    if (haystack.includes(k)) return k;
  }
  return null;
}

function classifyRisk(fn){
  const key = String(fn.key || '').toLowerCase();
  const name = String(fn.name || '').toLowerCase();
  const title = String(fn.title || '').toLowerCase();
  const desc = String(fn.description || '').toLowerCase();
  // join with separators so word-boundary-like matches still work via substrings
  const hay = ` ${key} | ${name} | ${title} | ${desc} `;

  // Special-case: triggers/events are functionally read-only from a side-effect
  // perspective (they produce events). They're usually safe unless declared so.
  const nodeKind = String(fn.nodeKind || fn.type || '').toLowerCase();
  if (nodeKind === 'start' || nodeKind === 'start_form' || nodeKind === 'event' || nodeKind === 'endpoint') {
    return { risk: 'safe', matched: `nodeKind:${nodeKind}` };
  }

  const d = containsAny(hay, DESTRUCTIVE_KEYWORDS);
  if (d) return { risk: 'destructive', matched: d };

  const e = containsAny(hay, ELEVATED_KEYWORDS);
  if (e) return { risk: 'elevated', matched: e };

  const w = containsAny(hay, WRITE_KEYWORDS);
  if (w) return { risk: 'write', matched: w };

  const s = containsAny(hay, SAFE_KEYWORDS);
  if (s) return { risk: 'safe', matched: s };

  // Default: safe if we can't tell — but flag as ambiguous for review.
  return { risk: 'safe', matched: null, ambiguous: true };
}

// ---------------------------------------------------------------------------
// JSON rewrite preserving key order
// ---------------------------------------------------------------------------

/**
 * Inserts `risk` (and optional `riskReason`) into a function object while
 * preserving the existing key ordering. New fields are appended at the end.
 */
function setRisk(fn, risk, matched){
  // Don't mutate the function if risk is already set unless --force
  if (fn.risk && !FORCE) return { changed: false, previous: fn.risk };
  const previous = fn.risk;
  fn.risk = risk;
  // We intentionally do NOT set riskReason automatically — reserved for manual
  // review pass where humans add nuanced reasons.
  return { changed: true, previous: previous || null, matched };
}

// ---------------------------------------------------------------------------
// Manifest iteration
// ---------------------------------------------------------------------------
function listManifests(){
  const out = [];
  for (const base of [LOCAL, REPOS]){
    if (!fs.existsSync(base)) continue;
    for (const name of fs.readdirSync(base)){
      const p = path.join(base, name, 'manifest.json');
      if (fs.existsSync(p)) out.push(p);
    }
  }
  return out;
}

function main(){
  const manifests = listManifests();
  const stats = {
    manifests: manifests.length,
    functionsSeen: 0,
    functionsAnnotated: 0,
    functionsSkipped: 0,
    byRisk: { safe: 0, write: 0, destructive: 0, elevated: 0 },
    ambiguous: [],  // functions where heuristic defaulted to safe because no keyword matched
    perManifest: []
  };

  for (const mp of manifests){
    const raw = fs.readFileSync(mp, 'utf8');
    let json;
    try { json = JSON.parse(raw); }
    catch (e){
      console.error(`[skip] bad JSON: ${mp}: ${e.message}`);
      continue;
    }
    const fns = Array.isArray(json.nodeTemplates) ? json.nodeTemplates : [];
    const mstats = { path: mp, total: fns.length, annotated: 0, skipped: 0, byRisk: { safe: 0, write: 0, destructive: 0, elevated: 0 } };
    let mutated = false;
    for (const fn of fns){
      stats.functionsSeen++;
      const alreadySet = !!fn.risk;
      if (alreadySet && !FORCE){
        // Count existing risk towards stats but don't touch
        const r = String(fn.risk);
        if (stats.byRisk[r] != null) stats.byRisk[r]++;
        if (mstats.byRisk[r] != null) mstats.byRisk[r]++;
        stats.functionsSkipped++;
        mstats.skipped++;
        continue;
      }
      const { risk, matched, ambiguous } = classifyRisk(fn);
      const res = setRisk(fn, risk, matched);
      if (res.changed){
        mutated = true;
        stats.functionsAnnotated++;
        mstats.annotated++;
        stats.byRisk[risk]++;
        mstats.byRisk[risk]++;
        if (ambiguous){
          stats.ambiguous.push({
            manifest: path.relative(ROOT, mp),
            key: fn.key,
            title: fn.title,
            assigned: risk
          });
        }
      }
    }
    if (mutated && APPLY){
      fs.writeFileSync(mp, JSON.stringify(json, null, 2) + '\n', 'utf8');
    }
    stats.perManifest.push(mstats);
  }

  // ---------------------------------------------------------------------
  // Report
  // ---------------------------------------------------------------------
  console.log('=== annotate-plugin-risks ===');
  console.log(`Mode       : ${APPLY ? 'APPLY (writing files)' : 'DRY-RUN (no writes)'}${FORCE ? ' [--force]' : ''}`);
  console.log(`Manifests  : ${stats.manifests}`);
  console.log(`Functions  : ${stats.functionsSeen} seen, ${stats.functionsAnnotated} annotated, ${stats.functionsSkipped} skipped (already tagged)`);
  console.log('Breakdown  :');
  for (const r of ['safe', 'write', 'destructive', 'elevated']){
    console.log(`  - ${r.padEnd(12)} ${stats.byRisk[r]}`);
  }
  if (stats.ambiguous.length){
    console.log(`\nAmbiguous (heuristic defaulted to 'safe', review recommended): ${stats.ambiguous.length}`);
    for (const a of stats.ambiguous.slice(0, 50)){
      console.log(`  ~ ${a.manifest}  ${a.key}  (${a.title || ''})`);
    }
    if (stats.ambiguous.length > 50) console.log(`  ... +${stats.ambiguous.length - 50} more`);
  }
  console.log('\nPer-manifest annotated counts:');
  for (const m of stats.perManifest){
    const rel = path.relative(ROOT, m.path);
    if (m.annotated === 0 && m.skipped === m.total) continue;
    console.log(`  ${rel.padEnd(45)} total=${m.total} annotated=${m.annotated} skipped=${m.skipped} | d=${m.byRisk.destructive} e=${m.byRisk.elevated} w=${m.byRisk.write} s=${m.byRisk.safe}`);
  }

  // Also emit a machine-readable summary to stderr for scripts
  const summary = {
    mode: APPLY ? 'apply' : 'dryrun',
    force: FORCE,
    manifests: stats.manifests,
    functions: { seen: stats.functionsSeen, annotated: stats.functionsAnnotated, skipped: stats.functionsSkipped },
    byRisk: stats.byRisk,
    ambiguousCount: stats.ambiguous.length
  };
  // Expose for external consumers
  if (process.env.PLUGIN_RISK_SUMMARY_PATH){
    fs.writeFileSync(process.env.PLUGIN_RISK_SUMMARY_PATH, JSON.stringify({ summary, ambiguous: stats.ambiguous, perManifest: stats.perManifest }, null, 2));
  }
}

main();
