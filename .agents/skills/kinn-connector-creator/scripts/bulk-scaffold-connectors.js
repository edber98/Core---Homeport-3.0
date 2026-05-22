#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { scaffoldConnector } = require('./scaffold-connector');

function parseArgs(argv) {
  const options = {
    force: false,
    dryRun: false,
    continueOnError: false
  };
  const positional = [];

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith('--')) {
      positional.push(a);
      continue;
    }

    if (a === '--force') { options.force = true; continue; }
    if (a === '--dry-run') { options.dryRun = true; continue; }
    if (a === '--continue-on-error') { options.continueOnError = true; continue; }

    throw new Error(`Option inconnue: ${a}`);
  }

  if (positional.length === 0) throw new Error('Chemin du fichier d inventaire manquant.');
  options.inputPath = positional[0];
  return options;
}

function readInput(filePath) {
  const abs = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(abs)) throw new Error(`Fichier introuvable: ${abs}`);

  const text = fs.readFileSync(abs, 'utf8');
  const ext = path.extname(abs).toLowerCase();

  if (ext === '.jsonl' || ext === '.ndjson') {
    return text
      .split(/\r?\n/g)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, i) => {
        try { return JSON.parse(line); }
        catch (e) { throw new Error(`Ligne ${i + 1} invalide dans ${abs}: ${e.message}`); }
      });
  }

  let data;
  try { data = JSON.parse(text); }
  catch (e) { throw new Error(`JSON invalide dans ${abs}: ${e.message}`); }

  if (!Array.isArray(data)) throw new Error(`Le fichier ${abs} doit contenir un tableau JSON.`);
  return data;
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const items = readInput(args.inputPath);
    if (!items.length) {
      console.log('Aucun connecteur dans le fichier.');
      return;
    }

    const results = [];
    let failures = 0;

    for (let i = 0; i < items.length; i += 1) {
      const item = items[i] || {};
      const connector = item.connector || item.name || item.key;
      if (!connector) {
        failures += 1;
        const err = `Item ${i + 1}: champ connector (ou name/key) manquant.`;
        results.push({ ok: false, error: err });
        if (!args.continueOnError) throw new Error(err);
        continue;
      }

      try {
        const out = scaffoldConnector({
          connector,
          providerKey: item.providerKey,
          providerName: item.providerName,
          label: item.label,
          iconClass: item.iconClass,
          iconUrl: item.iconUrl,
          color: item.color,
          tags: Array.isArray(item.tags) ? item.tags : [],
          categories: Array.isArray(item.categories) ? item.categories : [],
          withSampleNode: item.withSampleNode !== false
        }, {
          rootDir: process.cwd(),
          force: args.force,
          dryRun: args.dryRun
        });

        results.push({ ok: true, connector: out.connector, files: out.files });
      } catch (e) {
        failures += 1;
        results.push({ ok: false, connector, error: e.message });
        if (!args.continueOnError) throw e;
      }
    }

    for (const r of results) {
      if (r.ok) {
        console.log(`[ok] ${r.connector}`);
      } else {
        console.log(`[ko] ${r.connector || 'unknown'} -> ${r.error}`);
      }
    }

    console.log(`\nTermine: ${results.length - failures} succes, ${failures} erreurs.`);
    if (failures) process.exit(2);
  } catch (e) {
    console.error(`Erreur: ${e.message}`);
    console.error('\nUsage:');
    console.error('  node .agents/skills/kinn-connector-creator/scripts/bulk-scaffold-connectors.js <inventory.json|.jsonl> [--dry-run] [--force] [--continue-on-error]');
    console.error('\nFormat inventaire JSON:');
    console.error('  [');
    console.error('    { "connector": "hubspot", "providerName": "HubSpot", "iconUrl": "https://...", "iconClass": "fa-solid fa-plug", "color": "#f2f2f2", "tags": ["crm"], "categories": ["CRM"] }');
    console.error('  ]');
    process.exit(1);
  }
}

if (require.main === module) main();
