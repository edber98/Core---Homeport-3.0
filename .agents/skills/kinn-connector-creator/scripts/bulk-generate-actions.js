#!/usr/bin/env node

const path = require('path');
const { readInput } = require('./lib/bulk-utils');
const { generateFromSpec } = require('./generate-actions-from-spec');

function parseArgs(argv) {
  const opts = {
    force: false,
    dryRun: false,
    continueOnError: false,
    keepSampleNode: false
  };
  const positional = [];

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith('--')) {
      positional.push(a);
      continue;
    }

    if (a === '--force') { opts.force = true; continue; }
    if (a === '--dry-run') { opts.dryRun = true; continue; }
    if (a === '--continue-on-error') { opts.continueOnError = true; continue; }
    if (a === '--keep-sample-node') { opts.keepSampleNode = true; continue; }

    throw new Error(`Option inconnue: ${a}`);
  }

  if (!positional[0]) throw new Error('Fichier inventaire manquant.');
  opts.input = positional[0];
  return opts;
}

function resolveItem(item, baseDir) {
  if (item.specFile) {
    return {
      connector: item.connector,
      spec: path.resolve(baseDir, item.specFile)
    };
  }
  return {
    connector: item.connector || item.name || item.key,
    spec: item
  };
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const invPath = path.resolve(process.cwd(), args.input);
    const input = readInput(invPath);
    const items = Array.isArray(input) ? input : (Array.isArray(input.items) ? input.items : []);
    if (!items.length) throw new Error('Inventaire vide.');

    const baseDir = path.dirname(invPath);
    const rows = [];
    let failures = 0;

    for (let i = 0; i < items.length; i += 1) {
      const item = items[i] || {};
      const row = resolveItem(item, baseDir);
      if (!row.connector) {
        failures += 1;
        rows.push({ ok: false, connector: `item_${i + 1}`, error: 'connector manquant' });
        if (!args.continueOnError) break;
        continue;
      }

      try {
        const out = generateFromSpec(row.spec, {
          connector: row.connector,
          rootDir: process.cwd(),
          force: args.force,
          dryRun: args.dryRun,
          removeSampleNode: !args.keepSampleNode
        });
        rows.push({ ok: true, connector: out.connector, nodes: out.generatedKeys.length });
      } catch (e) {
        failures += 1;
        rows.push({ ok: false, connector: row.connector, error: e.message });
        if (!args.continueOnError) break;
      }
    }

    for (const r of rows) {
      if (r.ok) console.log(`[ok] ${r.connector} -> ${r.nodes} nodes`);
      else console.log(`[ko] ${r.connector} -> ${r.error}`);
    }

    console.log(`\nTerminé: ${rows.length - failures} succès, ${failures} erreurs.`);
    if (failures) process.exit(2);
  } catch (e) {
    console.error(`Erreur: ${e.message}`);
    console.error('\nUsage:');
    console.error('  node .agents/skills/kinn-connector-creator/scripts/bulk-generate-actions.js <inventory.json|.jsonl> [--dry-run] [--force] [--continue-on-error] [--keep-sample-node]');
    process.exit(1);
  }
}

if (require.main === module) main();
