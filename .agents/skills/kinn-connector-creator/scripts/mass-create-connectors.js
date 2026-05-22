#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { scaffoldConnector } = require('./scaffold-connector');
const { generateFromSpec } = require('./generate-actions-from-spec');
const { readInput, toSnake, toKebab } = require('./lib/bulk-utils');
const { buildSpecFromOpenApi } = require('./lib/endpoint-selector');

function parseArgs(argv) {
  const opts = {
    force: false,
    dryRun: false,
    continueOnError: false,
    noLogo: false,
    noCheck: false,
    noActions: false,
    keepSampleNode: false,
    skipExisting: true,
    defaultColor: '#f2f2f2',
    includeDeprecated: false,
    strictAutomation: true
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
    if (a === '--no-logo') { opts.noLogo = true; continue; }
    if (a === '--no-check') { opts.noCheck = true; continue; }
    if (a === '--no-actions') { opts.noActions = true; continue; }
    if (a === '--keep-sample-node') { opts.keepSampleNode = true; continue; }
    if (a === '--no-skip-existing') { opts.skipExisting = false; continue; }
    if (a === '--include-deprecated') { opts.includeDeprecated = true; continue; }
    if (a === '--no-strict-automation') { opts.strictAutomation = false; continue; }

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

function manifestPath(connector) {
  return path.resolve(process.cwd(), 'API/src/plugins/repos', connector, 'manifest.json');
}

function logoDefaults(item, connector) {
  const slug = toKebab(item.providerName || connector);
  return {
    iconUrl: item.iconUrl || `https://cdn.simpleicons.org/${slug}`,
    iconClass: item.iconClass || 'fa-solid fa-puzzle-piece',
    color: item.color || '#f2f2f2'
  };
}

function runLogo(connector, item, opts) {
  const logoScript = path.resolve(process.cwd(), '.agents/skills/kinn-connector-logo/scripts/update-connector-logo.js');
  const { iconUrl, iconClass, color } = logoDefaults(item, connector);
  const cmdArgs = [logoScript, connector, '--icon-url', iconUrl, '--icon-class', iconClass, '--color', color];
  if (opts.dryRun) cmdArgs.push('--dry-run');
  execFileSync(process.execPath, cmdArgs, { stdio: 'pipe' });
}

function runCheck(connector, opts) {
  const checkScript = path.resolve(process.cwd(), '.agents/skills/kinn-connector-creator/scripts/check-connector.js');
  if (opts.dryRun) return;
  execFileSync(process.execPath, [checkScript, connector], { stdio: 'pipe' });
}

function enforceStrictCoverage(report) {
  const failures = [];
  for (const [resource, row] of Object.entries((report && report.coverage) || {})) {
    if (!row.hasRead) failures.push(`${resource}: aucune action de lecture (list/search/get)`);
    if (row.writeCandidate && !row.hasWrite) failures.push(`${resource}: aucune action d'écriture (create/update/delete/...)`);
  }
  return failures;
}

function buildSpec(item, connector, invBaseDir, opts) {
  if (item.specFile) {
    const specPath = path.resolve(invBaseDir, item.specFile);
    return JSON.parse(fs.readFileSync(specPath, 'utf8'));
  }
  if (item.openapiFile) {
    const openapiPath = path.resolve(invBaseDir, item.openapiFile);
    const openapi = JSON.parse(fs.readFileSync(openapiPath, 'utf8'));
    const out = buildSpecFromOpenApi(openapi, {
      connector,
      providerKey: item.providerKey,
      providerName: item.providerName,
      includePatterns: item.includePatterns,
      excludePatterns: item.excludePatterns,
      includeDeprecated: item.includeDeprecated !== undefined ? item.includeDeprecated === true : !!opts.includeDeprecated
    });
    return out;
  }
  if (Array.isArray(item.resources) && item.resources.length) {
    return {
      connector,
      providerKey: item.providerKey,
      providerName: item.providerName,
      resources: item.resources
    };
  }
  return null;
}

function runOne(item, opts, invBaseDir) {
  const connector = toSnake(item.connector || item.name || item.key);
  if (!connector) throw new Error('connector manquant.');

  const mPath = manifestPath(connector);
  const exists = fs.existsSync(mPath);

  if (!exists || !opts.skipExisting || opts.force) {
    scaffoldConnector({
      connector,
      providerKey: item.providerKey,
      providerName: item.providerName,
      label: item.label,
      iconClass: item.iconClass,
      iconUrl: item.iconUrl,
      color: item.color || opts.defaultColor,
      tags: Array.isArray(item.tags) ? item.tags : [],
      categories: Array.isArray(item.categories) ? item.categories : [],
      withSampleNode: true
    }, {
      rootDir: process.cwd(),
      force: opts.force,
      dryRun: opts.dryRun
    });
  }

  if (!opts.noActions) {
    const specOrBundle = buildSpec(item, connector, invBaseDir, opts);
    if (specOrBundle) {
      let spec = specOrBundle;
      if (specOrBundle.spec && specOrBundle.report) {
        const strictOn = item.strictAutomation !== undefined ? !!item.strictAutomation : !!opts.strictAutomation;
        if (strictOn) {
          const strictFailures = enforceStrictCoverage(specOrBundle.report);
          if (strictFailures.length) {
            throw new Error(`Coverage automation insuffisante:\\n- ${strictFailures.join('\\n- ')}`);
          }
        }
        spec = specOrBundle.spec;
      }
      const manifestExistsNow = fs.existsSync(mPath);
      if (opts.dryRun && !manifestExistsNow) {
        // In dry-run we do not materialize scaffold files, so action generation is only announced.
      } else {
        generateFromSpec(spec, {
          connector,
          rootDir: process.cwd(),
          force: opts.force,
          dryRun: opts.dryRun,
          removeSampleNode: !opts.keepSampleNode
        });
      }
    }
  }

  const manifestExistsFinal = fs.existsSync(mPath);
  if (!opts.noLogo) {
    if (opts.dryRun && !manifestExistsFinal) {
      // Skip real logo dry-run call when manifest does not exist yet.
    } else {
      runLogo(connector, item, opts);
    }
  }
  if (!opts.noCheck) {
    if (opts.dryRun && !manifestExistsFinal) {
      // Skip static check in dry-run when connector files are not materialized.
    } else {
      runCheck(connector, opts);
    }
  }

  return connector;
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const invPath = path.resolve(process.cwd(), args.input);
    const raw = readInput(invPath);
    const items = Array.isArray(raw) ? raw : (Array.isArray(raw.items) ? raw.items : []);
    if (!items.length) throw new Error('Inventaire vide.');

    const invBaseDir = path.dirname(invPath);
    const rows = [];
    let failures = 0;

    for (let i = 0; i < items.length; i += 1) {
      const item = items[i] || {};
      const connector = toSnake(item.connector || item.name || item.key || `item_${i + 1}`);
      try {
        runOne(item, args, invBaseDir);
        rows.push({ ok: true, connector });
      } catch (e) {
        failures += 1;
        rows.push({ ok: false, connector, error: e.message });
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
    console.error('  node .agents/skills/kinn-connector-creator/scripts/mass-create-connectors.js <inventory.json|.jsonl> [--dry-run] [--force] [--continue-on-error] [--no-logo] [--no-check] [--no-actions] [--keep-sample-node] [--include-deprecated] [--no-strict-automation]');
    process.exit(1);
  }
}

if (require.main === module) main();
