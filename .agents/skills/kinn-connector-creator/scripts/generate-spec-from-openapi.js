#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { toSnake } = require('./lib/bulk-utils');
const { buildSpecFromOpenApi } = require('./lib/endpoint-selector');

function parseArgs(argv) {
  const opts = {
    includeDeprecated: false,
    strictAutomation: true,
    printReport: false,
    includes: [],
    excludes: []
  };

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--include-deprecated') { opts.includeDeprecated = true; continue; }
    if (a === '--no-strict-automation') { opts.strictAutomation = false; continue; }
    if (a === '--print-report') { opts.printReport = true; continue; }

    if (a === '--include') {
      const v = argv[i + 1];
      if (!v || v.startsWith('--')) throw new Error('Option --include requiert une valeur.');
      opts.includes.push(v);
      i += 1;
      continue;
    }

    if (a === '--exclude') {
      const v = argv[i + 1];
      if (!v || v.startsWith('--')) throw new Error('Option --exclude requiert une valeur.');
      opts.excludes.push(v);
      i += 1;
      continue;
    }

    if (!a.startsWith('--')) {
      if (!opts.openapi) opts.openapi = a;
      else throw new Error(`Argument inattendu: ${a}`);
      continue;
    }

    const key = a.slice(2).replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
    const v = argv[i + 1];
    if (!v || v.startsWith('--')) throw new Error(`Option --${key} requiert une valeur.`);
    opts[key] = v;
    i += 1;
  }

  if (!opts.openapi) throw new Error('Source OpenAPI manquante (fichier .json ou URL).');
  if (!opts.connector) throw new Error('Option --connector requise.');
  return opts;
}

async function loadOpenApi(source) {
  const s = String(source || '').trim();
  if (!s) throw new Error('Source OpenAPI vide.');

  if (/^https?:\/\//i.test(s)) {
    const res = await fetch(s);
    if (!res.ok) throw new Error(`Téléchargement OpenAPI impossible: HTTP ${res.status}`);
    const text = await res.text();
    try { return JSON.parse(text); }
    catch (e) { throw new Error(`OpenAPI URL doit être du JSON valide: ${e.message}`); }
  }

  const abs = path.resolve(process.cwd(), s);
  if (!fs.existsSync(abs)) throw new Error(`Fichier introuvable: ${abs}`);
  const text = fs.readFileSync(abs, 'utf8');
  try { return JSON.parse(text); }
  catch (e) { throw new Error(`OpenAPI local doit être du JSON valide: ${e.message}`); }
}

function enforceStrictCoverage(report) {
  const failures = [];
  for (const [resource, row] of Object.entries(report.coverage || {})) {
    if (!row.hasRead) failures.push(`${resource}: aucune action de lecture (list/search/get)`);
    if (row.writeCandidate && !row.hasWrite) failures.push(`${resource}: aucune action d'écriture (create/update/delete/... )`);
  }
  return failures;
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const openapi = await loadOpenApi(args.openapi);

    const connector = toSnake(args.connector);
    const out = buildSpecFromOpenApi(openapi, {
      connector,
      providerKey: args.providerKey,
      providerName: args.providerName,
      includePatterns: args.includes,
      excludePatterns: args.excludes,
      includeDeprecated: args.includeDeprecated
    });

    if (args.strictAutomation) {
      const strictFailures = enforceStrictCoverage(out.report);
      if (strictFailures.length) {
        throw new Error(`Coverage automation insuffisante:\n- ${strictFailures.join('\n- ')}`);
      }
    }

    const specOut = args.out
      ? path.resolve(process.cwd(), args.out)
      : path.resolve(process.cwd(), '.agents/skills/kinn-connector-creator/tmp', `${connector}.autogen-spec.json`);
    fs.mkdirSync(path.dirname(specOut), { recursive: true });
    fs.writeFileSync(specOut, `${JSON.stringify(out.spec, null, 2)}\n`);

    const reportOut = args.reportOut
      ? path.resolve(process.cwd(), args.reportOut)
      : path.resolve(process.cwd(), '.agents/skills/kinn-connector-creator/tmp', `${connector}.autogen-report.json`);
    fs.mkdirSync(path.dirname(reportOut), { recursive: true });
    fs.writeFileSync(reportOut, `${JSON.stringify(out.report, null, 2)}\n`);

    console.log(`Spec généré: ${specOut}`);
    console.log(`Rapport: ${reportOut}`);
    console.log(`Ressources: ${out.report.resources.length}, endpoints inclus: ${out.report.includedCount}, exclus: ${out.report.excludedCount}`);

    if (args.printReport) {
      console.log(JSON.stringify(out.report, null, 2));
    }
  } catch (e) {
    console.error(`Erreur: ${e.message}`);
    console.error('\nUsage:');
    console.error('  node .agents/skills/kinn-connector-creator/scripts/generate-spec-from-openapi.js <openapi.json|url> --connector <name> [--provider-key <key>] [--provider-name "Provider"] [--out <spec.json>] [--report-out <report.json>] [--include <regex>] [--exclude <regex>] [--include-deprecated] [--no-strict-automation] [--print-report]');
    process.exit(1);
  }
}

main();
