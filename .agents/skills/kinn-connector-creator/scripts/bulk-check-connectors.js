#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { readInput, toSnake } = require('./lib/bulk-utils');

function parseArgs(argv) {
  const opts = {
    continueOnError: false,
    fromRepos: false
  };
  const positional = [];

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith('--')) {
      positional.push(a);
      continue;
    }
    if (a === '--continue-on-error') { opts.continueOnError = true; continue; }
    if (a === '--from-repos') { opts.fromRepos = true; continue; }
    throw new Error(`Option inconnue: ${a}`);
  }

  if (opts.fromRepos) return opts;
  if (!positional[0]) throw new Error('Fichier inventaire manquant (ou utiliser --from-repos).');
  opts.input = positional[0];
  return opts;
}

function connectorsFromInventory(filePath) {
  const abs = path.resolve(process.cwd(), filePath);
  const raw = readInput(abs);
  const items = Array.isArray(raw) ? raw : (Array.isArray(raw.items) ? raw.items : []);
  const names = items.map((x) => toSnake(x && (x.connector || x.name || x.key))).filter(Boolean);
  return [...new Set(names)];
}

function connectorsFromRepos() {
  const reposDir = path.resolve(process.cwd(), 'API/src/plugins/repos');
  if (!fs.existsSync(reposDir)) throw new Error(`Répertoire introuvable: ${reposDir}`);
  return fs.readdirSync(reposDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => toSnake(d.name))
    .filter(Boolean)
    .sort();
}

function runCheck(connector) {
  const script = path.resolve(process.cwd(), '.agents/skills/kinn-connector-creator/scripts/check-connector.js');
  execFileSync(process.execPath, [script, connector], { stdio: 'pipe' });
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const connectors = args.fromRepos ? connectorsFromRepos() : connectorsFromInventory(args.input);
    if (!connectors.length) throw new Error('Aucun connecteur à vérifier.');

    const rows = [];
    let failures = 0;

    for (const connector of connectors) {
      try {
        runCheck(connector);
        rows.push({ ok: true, connector });
      } catch (e) {
        failures += 1;
        const stderr = e && e.stderr ? String(e.stderr) : (e.message || 'check failed');
        rows.push({ ok: false, connector, error: stderr.trim() });
        if (!args.continueOnError) break;
      }
    }

    for (const r of rows) {
      if (r.ok) console.log(`[ok] ${r.connector}`);
      else console.log(`[ko] ${r.connector} -> ${r.error}`);
    }

    console.log(`\nTerminé: ${rows.length - failures} succès, ${failures} erreurs.`);
    if (failures) process.exit(2);
  } catch (e) {
    console.error(`Erreur: ${e.message}`);
    console.error('\nUsage:');
    console.error('  node .agents/skills/kinn-connector-creator/scripts/bulk-check-connectors.js <inventory.json|.jsonl> [--continue-on-error]');
    console.error('  node .agents/skills/kinn-connector-creator/scripts/bulk-check-connectors.js --from-repos [--continue-on-error]');
    process.exit(1);
  }
}

if (require.main === module) main();
