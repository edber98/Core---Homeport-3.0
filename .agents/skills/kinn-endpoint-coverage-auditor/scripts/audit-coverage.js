#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { buildSpec } = require("../../kinn-connector-creator/scripts/generate-spec-from-endpoints-json.js");

function usage() {
  console.error("Usage: node .agents/skills/kinn-endpoint-coverage-auditor/scripts/audit-coverage.js <connector> <automation-endpoints.json> [--output <report.json>]");
  process.exit(1);
}

function parseArgs(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      if (!opts.connector) opts.connector = arg;
      else if (!opts.input) opts.input = arg;
      else usage();
      continue;
    }
    if (arg === "--output") {
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) usage();
      opts.output = next;
      i += 1;
      continue;
    }
    usage();
  }
  if (!opts.connector || !opts.input) usage();
  return opts;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function flattenFields(fields) {
  const out = [];
  for (const field of fields || []) {
    if (!field || typeof field !== "object") continue;
    if (Array.isArray(field.fields) && field.fields.length) out.push(...flattenFields(field.fields));
    else out.push(field);
  }
  return out;
}

function existingBodyFieldKeys(template) {
  const fields = flattenFields(template && template.args && template.args.fields);
  return new Set(
    fields
      .filter((field) => field && (field.bodyPath || field.in === "body" || field.key))
      .map((field) => String(field.key || "").trim())
      .filter(Boolean)
  );
}

function expectedNodeKey(providerKey, resourceKey, actionKey) {
  return `${providerKey}_${resourceKey}_${actionKey}`;
}

function auditConnector(connector, input) {
  const repoDir = path.join(process.cwd(), "API", "src", "plugins", "repos", connector);
  const manifestPath = path.join(repoDir, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest introuvable: ${manifestPath}`);
  }

  const manifest = readJson(manifestPath);
  const provider = Array.isArray(manifest.providers) && manifest.providers.length ? manifest.providers[0] : null;
  if (!provider || !provider.key) {
    throw new Error(`Provider introuvable dans ${manifestPath}`);
  }

  const specBundle = buildSpec(input, {
    connector,
    providerKey: provider.key,
    providerName: provider.title || provider.name || provider.key
  });
  const spec = specBundle.spec;
  const templateMap = new Map((manifest.nodeTemplates || []).map((node) => [node.key, node]));
  const rows = [];
  let covered = 0;
  let missing = 0;

  for (const resource of spec.resources || []) {
    for (const action of resource.actions || []) {
      const nodeKey = expectedNodeKey(spec.providerKey, resource.key, action.key);
      const node = templateMap.get(nodeKey);
      const expectedBodyArgs = (action.args || []).filter((arg) => arg && arg.in === "body");
      const expectedBodyKeys = expectedBodyArgs.map((arg) => arg.key);
      const foundBodyKeys = node ? existingBodyFieldKeys(node) : new Set();
      const missingBodyKeys = node
        ? expectedBodyKeys.filter((key) => !foundBodyKeys.has(key))
        : expectedBodyKeys;
      const status = node ? "COVERED" : "MISSING";

      if (status === "COVERED") covered += 1;
      else missing += 1;

      rows.push({
        status,
        method: action.method,
        path: action.path,
        expectedNodeKey: nodeKey,
        existingNodeKey: node ? node.key : null,
        title: node ? node.title || "" : "",
        resource: resource.key,
        action: action.key,
        expectedBodyAttributes: expectedBodyKeys,
        foundBodyAttributes: node ? expectedBodyKeys.filter((key) => foundBodyKeys.has(key)) : [],
        missingBodyAttributes: missingBodyKeys
      });
    }
  }

  const excludedRows = (input.excluded_endpoints || []).map((endpoint) => ({
    status: "EXCLUDED",
    method: endpoint.method,
    path: endpoint.path,
    expectedNodeKey: null,
    existingNodeKey: null,
    title: "",
    resource: null,
    action: null,
    exclusionReason: endpoint.exclusion_reason || null,
    expectedBodyAttributes: [],
    foundBodyAttributes: [],
    missingBodyAttributes: []
  }));

  return {
    connector,
    generatedAt: new Date().toISOString(),
    source: {
      manifest: manifestPath,
      endpointCount: Array.isArray(input.endpoints) ? input.endpoints.length : 0,
      excludedEndpointCount: Array.isArray(input.excluded_endpoints) ? input.excluded_endpoints.length : 0
    },
    summary: {
      covered,
      missing,
      excluded: excludedRows.length,
      coveragePercent: covered + missing ? Math.round((covered / (covered + missing)) * 100) : 100
    },
    rows: [...rows, ...excludedRows]
  };
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const inputPath = path.resolve(process.cwd(), opts.input);
  const input = readJson(inputPath);
  const report = auditConnector(opts.connector, input);
  const outputPath = path.resolve(
    process.cwd(),
    opts.output || path.join("API", "src", "plugins", "repos", opts.connector, "coverage-audit.json")
  );
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(outputPath);
  console.log(JSON.stringify(report.summary, null, 2));
}

if (require.main === module) main();

module.exports = { auditConnector };
