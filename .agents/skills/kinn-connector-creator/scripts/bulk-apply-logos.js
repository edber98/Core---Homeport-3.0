#!/usr/bin/env node

const path = require('path');
const { execFileSync } = require('child_process');
const { readInput, toKebab, titleCase } = require('./lib/bulk-utils');

function parseArgs(argv) {
  const opts = {
    dryRun: false,
    continueOnError: false,
    mix: null,
    defaultColor: '#f2f2f2'
  };
  const positional = [];

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith('--')) {
      positional.push(a);
      continue;
    }
    if (a === '--dry-run') { opts.dryRun = true; continue; }
    if (a === '--continue-on-error') { opts.continueOnError = true; continue; }

    const key = a.slice(2).replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) throw new Error(`Option --${key} requiert une valeur.`);
    opts[key] = next;
    i += 1;
  }

  if (!positional[0]) throw new Error('Fichier inventaire manquant.');
  opts.input = positional[0];
  return opts;
}

function slugForIcon(item) {
  const providerName = String(item.providerName || item.connector || item.name || item.key || '').trim();
  return toKebab(providerName || 'provider');
}

function iconClassFallback(item) {
  if (item.iconClass) return item.iconClass;
  const txt = String(item.category || '').toLowerCase();
  if (txt.includes('crm')) return 'fa-solid fa-address-book';
  if (txt.includes('ai')) return 'fa-solid fa-brain';
  if (txt.includes('data')) return 'fa-solid fa-database';
  return 'fa-solid fa-puzzle-piece';
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const inputPath = path.resolve(process.cwd(), args.input);
    const raw = readInput(inputPath);
    const items = Array.isArray(raw) ? raw : (Array.isArray(raw.items) ? raw.items : []);
    if (!items.length) throw new Error('Inventaire vide.');

    const logoScript = path.resolve(process.cwd(), '.agents/skills/kinn-connector-logo/scripts/update-connector-logo.js');
    const rows = [];
    let failures = 0;

    for (let i = 0; i < items.length; i += 1) {
      const it = items[i] || {};
      const connector = String(it.connector || it.name || it.key || '').trim();
      if (!connector) {
        failures += 1;
        rows.push({ ok: false, connector: `item_${i + 1}`, error: 'connector manquant' });
        if (!args.continueOnError) break;
        continue;
      }

      const iconUrl = it.iconUrl || `https://cdn.simpleicons.org/${slugForIcon(it)}`;
      const iconClass = iconClassFallback(it);
      const color = it.color || args.defaultColor;

      const cmdArgs = [
        logoScript,
        connector,
        '--icon-url', iconUrl,
        '--icon-class', iconClass,
        '--color', color
      ];
      if (args.mix !== null && args.mix !== undefined) {
        cmdArgs.push('--mix', String(args.mix));
      }
      if (args.dryRun) cmdArgs.push('--dry-run');

      try {
        execFileSync(process.execPath, cmdArgs, { stdio: 'pipe' });
        rows.push({ ok: true, connector, iconUrl, iconClass, color });
      } catch (e) {
        failures += 1;
        const stderr = e && e.stderr ? String(e.stderr) : (e.message || 'logo update failed');
        rows.push({ ok: false, connector, error: stderr.trim() });
        if (!args.continueOnError) break;
      }
    }

    for (const r of rows) {
      if (r.ok) console.log(`[ok] ${r.connector} -> ${r.iconUrl}`);
      else console.log(`[ko] ${r.connector} -> ${r.error}`);
    }

    console.log(`\nTerminé: ${rows.length - failures} succès, ${failures} erreurs.`);
    if (failures) process.exit(2);
  } catch (e) {
    console.error(`Erreur: ${e.message}`);
    console.error('\nUsage:');
    console.error('  node .agents/skills/kinn-connector-creator/scripts/bulk-apply-logos.js <inventory.json|.jsonl> [--dry-run] [--continue-on-error] [--defaultColor "#f2f2f2"]');
    process.exit(1);
  }
}

if (require.main === module) main();
