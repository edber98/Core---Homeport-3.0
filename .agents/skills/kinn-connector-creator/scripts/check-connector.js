#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const connector = process.argv[2];
if (!connector) {
  console.error("Usage: node .agents/skills/kinn-connector-creator/scripts/check-connector.js <connector>");
  process.exit(2);
}

const root = process.cwd();
const connectorDir = path.join(root, "API", "src", "plugins", "repos", connector);
const manifestPath = path.join(connectorDir, "manifest.json");
const functionsDir = path.join(connectorDir, "functions");
const errors = [];
const warnings = [];

function fail(message) { errors.push(message); }
function warn(message) { warnings.push(message); }

if (!fs.existsSync(connectorDir)) fail(`Connector directory not found: ${connectorDir}`);
if (!fs.existsSync(manifestPath)) fail("manifest.json not found");
if (!fs.existsSync(functionsDir)) fail("functions/ directory not found");

let manifest = null;
if (fs.existsSync(manifestPath)) {
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch (e) {
    fail(`manifest.json is not valid JSON: ${e.message}`);
  }
}

if (manifest) {
  if (!manifest.repo || !manifest.repo.name) fail("manifest.repo.name is required");
  if (manifest.repo && manifest.repo.name && manifest.repo.name !== connector) {
    warn(`manifest.repo.name (${manifest.repo.name}) differs from folder (${connector})`);
  }
  if (!manifest.providers || !Array.isArray(manifest.providers) || manifest.providers.length === 0) {
    fail("providers[] must contain at least one provider");
  }
  if (!manifest.nodeTemplates || !Array.isArray(manifest.nodeTemplates) || manifest.nodeTemplates.length === 0) {
    fail("nodeTemplates[] must contain at least one node");
  }

  const variables = manifest.variables && typeof manifest.variables === "object" ? manifest.variables : {};
  const variableKeys = new Set(Object.keys(variables));
  const providerKeys = new Set((manifest.providers || []).map((p) => p && p.key).filter(Boolean));
  const templateKeys = new Set();
  const namesByProvider = new Map();
  const titlesByProvider = new Map();

  for (const t of manifest.nodeTemplates || []) {
    if (!t || !t.key) {
      fail("nodeTemplate without key");
      continue;
    }
    if (templateKeys.has(t.key)) fail(`duplicate nodeTemplate key: ${t.key}`);
    templateKeys.add(t.key);

    if (!/^[a-z0-9_]+$/.test(t.key)) fail(`nodeTemplate key must be snake_case: ${t.key}`);
    if (!t.name || !/^[a-z][A-Za-z0-9]*$/.test(t.name)) warn(`nodeTemplate.name should be camelCase: ${t.key}`);
    if (t.schemaVersion !== 2) fail(`schemaVersion must be 2: ${t.key}`);
    if (!t.providerKey) fail(`providerKey is required: ${t.key}`);
    if (t.providerKey && providerKeys.size && !providerKeys.has(t.providerKey)) {
      fail(`providerKey '${t.providerKey}' has no matching provider for ${t.key}`);
    }

    const providerKey = String(t.providerKey || "");
    if (providerKey) {
      if (!namesByProvider.has(providerKey)) namesByProvider.set(providerKey, new Set());
      if (!titlesByProvider.has(providerKey)) titlesByProvider.set(providerKey, new Set());

      const providerNames = namesByProvider.get(providerKey);
      const providerTitles = titlesByProvider.get(providerKey);

      if (t.name) {
        if (providerNames.has(t.name)) fail(`duplicate nodeTemplate.name for provider '${providerKey}': ${t.name}`);
        providerNames.add(t.name);
      }

      if (t.title) {
        if (providerTitles.has(t.title)) fail(`duplicate nodeTemplate.title for provider '${providerKey}': ${t.title}`);
        providerTitles.add(t.title);
      }
    }

    for (const h of t.outputHandles || []) {
      const handleId = h && h.id ? String(h.id) : "ok";
      const isErrorHandle = handleId === "err" || handleId === "error";
      if (h && h.type === "payload" && !isErrorHandle) {
        if (!h.schema) fail(`payload output '${h.id || "ok"}' missing schema on ${t.key}`);
        if (typeof h.schema === "string" && h.schema.startsWith("$var:")) {
          const schemaKey = h.schema.slice(5);
          if (!variableKeys.has(schemaKey)) fail(`schema ${h.schema} missing from variables for ${t.key}`);
        }
      }
    }
  }
}

const handlerNames = new Set();
if (fs.existsSync(functionsDir)) {
  const files = fs.readdirSync(functionsDir).filter((f) => f.endsWith(".js"));
  if (!files.includes("utils.js")) warn("functions/utils.js not found");
  for (const file of files) {
    const full = path.join(functionsDir, file);
    const text = fs.readFileSync(full, "utf8");
    if (text.includes("node.args")) fail(`${file} uses node.args; use inputs instead`);

    const asyncNames = text.matchAll(/async\s+([a-zA-Z0-9_]+)\s*\(/g);
    for (const match of asyncNames) handlerNames.add(match[1]);

    if (file !== "utils.js" && text.includes("module.exports = {")) {
      const exportedNames = text.matchAll(/async\s+([a-zA-Z0-9_]+)\s*\(/g);
      const count = Array.from(exportedNames).length;
      if (count > 1) warn(`${file} exports ${count} handlers; Notion-style prefers one handler per action`);
    }
  }
}

if (manifest) {
  for (const t of manifest.nodeTemplates || []) {
    if (!t || !t.key) continue;
    const kind = String(t.nodeKind || t.type || "").toLowerCase();
    const isEvent = kind === "event" || kind === "start" || kind === "start_form" || t.key.endsWith("_webhook_event");
    if (!isEvent && !handlerNames.has(t.key)) fail(`missing handler export for ${t.key}`);
  }
}

for (const warning of warnings) console.warn(`WARN: ${warning}`);
for (const error of errors) console.error(`ERROR: ${error}`);

if (errors.length) {
  console.error(`\nConnector check failed: ${errors.length} error(s), ${warnings.length} warning(s).`);
  process.exit(1);
}

console.log(`Connector check passed: ${connector} (${warnings.length} warning(s)).`);
