#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const connector = args.find((arg) => !arg.startsWith("--"));
const runAll = args.includes("--all");
const invoke = args.includes("--invoke");
const json = args.includes("--json");

const root = findRepoRoot(process.cwd());
const reposDir = path.join(root, "API", "src", "plugins", "repos");
const failures = [];
const warnings = [];

function fail(message, meta) { failures.push({ message, ...(meta || {}) }); }
function warn(message, meta) { warnings.push({ message, ...(meta || {}) }); }
function rel(file) { return path.relative(root, file); }

const GENERIC_FIELD_KEYS = new Set([
  "body",
  "payload",
  "payloadjson",
  "data",
  "attributes",
  "input",
  "query",
  "headers",
  "options",
  "requestattributes",
  "request_root_key",
  "requestrootkey",
  "request_resource_id",
  "requestresourceid"
]);
const GENERIC_FIELD_TYPES = new Set(["json", "json_editor", "textarea", "text"]);

function findRepoRoot(start) {
  let dir = start;
  while (dir && dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, "API", "src", "plugins", "repos"))) return dir;
    dir = path.dirname(dir);
  }
  return start;
}

function usage() {
  console.error("Usage: node .agents/skills/kinn-connector-tester/scripts/test-connector.js <connector> [--invoke] [--json]");
  console.error("       node .agents/skills/kinn-connector-tester/scripts/test-connector.js --all [--json]");
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    fail(`JSON invalide: ${rel(file)}: ${e.message}`);
    return null;
  }
}

function functionNamesFromFile(file) {
  const text = fs.readFileSync(file, "utf8");
  return [...text.matchAll(/async\s+([a-zA-Z0-9_]+)\s*\(/g)].map((m) => m[1]);
}

async function validateManifest(connectorName) {
  const connectorDir = path.join(reposDir, connectorName);
  const manifestPath = path.join(connectorDir, "manifest.json");
  const functionsDir = path.join(connectorDir, "functions");
  const result = {
    connector: connectorName,
    manifest: rel(manifestPath),
    providers: 0,
    templates: 0,
    handlers: 0,
    invoked: 0,
    invokeFailures: 0
  };

  if (!fs.existsSync(connectorDir)) {
    fail(`Connecteur introuvable: ${connectorName}`);
    return result;
  }
  if (!fs.existsSync(manifestPath)) {
    fail(`manifest.json introuvable: ${rel(manifestPath)}`);
    return result;
  }
  if (!fs.existsSync(functionsDir)) {
    fail(`Dossier functions/ introuvable: ${rel(functionsDir)}`);
    return result;
  }

  const manifest = readJson(manifestPath);
  if (!manifest) return result;

  const variables = manifest.variables && typeof manifest.variables === "object" ? manifest.variables : {};
  const variableKeys = new Set(Object.keys(variables));
  const providers = Array.isArray(manifest.providers) ? manifest.providers : [];
  const providerKeys = new Set(providers.map((p) => p && p.key).filter(Boolean));
  const templates = Array.isArray(manifest.nodeTemplates) ? manifest.nodeTemplates : [];
  const templateKeys = new Set();
  result.providers = providers.length;
  result.templates = templates.length;

  if (!manifest.repo || !manifest.repo.name) fail(`${connectorName}: manifest.repo.name requis`);
  if (manifest.repo && manifest.repo.name && manifest.repo.name !== connectorName) {
    warn(`${connectorName}: manifest.repo.name (${manifest.repo.name}) diffère du dossier`);
  }
  if (!providers.length) fail(`${connectorName}: providers[] vide ou absent`);
  if (!templates.length) fail(`${connectorName}: nodeTemplates[] vide ou absent`);

  for (const provider of providers) {
    if (!provider || !provider.key) fail(`${connectorName}: provider sans key`);
    if (provider && provider.hasCredentials && !provider.credentialsForm) warn(`${connectorName}: provider ${provider.key} sans credentialsForm`);
  }

  for (const [name, schema] of Object.entries(variables)) {
    if (!schema || !Array.isArray(schema.fields)) warn(`${connectorName}: variable ${name} sans fields[]`);
  }

  for (const t of templates) {
    if (!t || !t.key) {
      fail(`${connectorName}: nodeTemplate sans key`);
      continue;
    }
    if (templateKeys.has(t.key)) fail(`${connectorName}: nodeTemplate dupliqué: ${t.key}`);
    templateKeys.add(t.key);
    if (!/^[a-z0-9_]+$/.test(t.key)) fail(`${connectorName}: key non snake_case: ${t.key}`);
    if (!t.name || !/^[a-z][A-Za-z0-9]*$/.test(t.name)) warn(`${connectorName}: name devrait être camelCase: ${t.key}`);
    if (t.schemaVersion !== 2) fail(`${connectorName}: schemaVersion doit valoir 2: ${t.key}`);
    if (!t.providerKey) fail(`${connectorName}: providerKey requis: ${t.key}`);
    if (t.providerKey && providerKeys.size && !providerKeys.has(t.providerKey)) fail(`${connectorName}: providerKey inconnu ${t.providerKey}: ${t.key}`);
    if (!Array.isArray(t.outputHandles) || !t.outputHandles.length) fail(`${connectorName}: outputHandles[] requis: ${t.key}`);
    validateArgsFields(connectorName, t);
    for (const h of t.outputHandles || []) {
      const handleId = h && h.id ? String(h.id) : "ok";
      const isErrorHandle = handleId === "err" || handleId === "error";
      if (h && h.type === "payload" && !isErrorHandle) {
        if (!h.schema) fail(`${connectorName}: output payload sans schema: ${t.key}`);
        if (typeof h.schema === "string" && h.schema.startsWith("$var:") && !variableKeys.has(h.schema.slice(5))) {
          fail(`${connectorName}: schema absent ${h.schema}: ${t.key}`);
        }
      }
    }
  }

  const handlerNames = new Set();
  const files = fs.readdirSync(functionsDir).filter((file) => file.endsWith(".js")).sort();
  if (!files.includes("utils.js")) warn(`${connectorName}: functions/utils.js absent`);
  for (const file of files) {
    const full = path.join(functionsDir, file);
    const text = fs.readFileSync(full, "utf8");
    if (text.includes("node.args")) fail(`${connectorName}: ${file} utilise node.args; utiliser inputs`);
    const names = functionNamesFromFile(full);
    for (const name of names) handlerNames.add(name);
    if (file !== "utils.js" && names.length > 1) warn(`${connectorName}: ${file} exporte ${names.length} handlers`);
    try {
      delete require.cache[require.resolve(full)];
      require(full);
    } catch (e) {
      fail(`${connectorName}: require échoue pour ${rel(full)}: ${e.message}`);
    }
  }
  result.handlers = handlerNames.size;

  for (const t of templates) {
    if (!t || !t.key) continue;
    const kind = String(t.nodeKind || t.type || "").toLowerCase();
    const isEvent = kind === "event" || kind === "start" || kind === "start_form" || t.key.endsWith("_webhook_event");
    if (!isEvent && !handlerNames.has(t.key)) fail(`${connectorName}: handler manquant pour ${t.key}`);
  }

  if (invoke) await invokeTemplates(connectorName, templates, functionsDir, providers, result);
  return result;
}

function credentialFixture(providers) {
  const credentials = {};
  for (const p of providers || []) {
    for (const field of (p.credentialsForm && p.credentialsForm.fields) || []) {
      const key = field.key;
      if (!key) continue;
      credentials[key] = field.default !== undefined ? field.default : sampleValue(key, field);
    }
  }
  return credentials;
}

function inputFixture(template) {
  const inputs = {};
  for (const field of flattenFields((template.args && template.args.fields) || [])) {
    if (!field.key) continue;
    inputs[field.key] = field.default !== undefined ? field.default : sampleValue(field.key, field);
  }
  return inputs;
}

function flattenFields(fields) {
  const out = [];
  for (const field of fields || []) {
    if (!field || typeof field !== "object") continue;
    if ((field.type === "section" || field.type === "section_array") && Array.isArray(field.fields)) out.push(...flattenFields(field.fields));
    else out.push(field);
  }
  return out;
}

function validateArgsFields(connectorName, template) {
  const argsFields = (template.args && Array.isArray(template.args.fields)) ? template.args.fields : [];
  const flatFields = flattenFields(argsFields);
  if (!flatFields.length) return;
  if (String(template.key || "").includes("custom_request")) return;

  const genericFields = flatFields.filter((field) => {
    const key = String(field.key || "").toLowerCase();
    const type = String(field.type || "").toLowerCase();
    if (!GENERIC_FIELD_KEYS.has(key) || !GENERIC_FIELD_TYPES.has(type)) return false;

    const label = String(field.label || "").toLowerCase();
    const description = String(field.description || "").toLowerCase();
    const text = `${label} ${description}`.trim();
    const mentionsGenericJson = /(json|payload|query|header|option|input|corps json|body json)/.test(text);

    if (key === "body" && (type === "text" || type === "textarea") && !mentionsGenericJson) {
      return false;
    }

    if (key === "query" && (type === "text" || type === "textarea")) {
      return false;
    }

    return type === "json" || type === "json_editor" || mentionsGenericJson;
  });

  if (genericFields.length === 1 && flatFields.length === 1) {
    const field = genericFields[0];
    fail(`${connectorName}: ${template.key} utilise un champ générique unique ${field.key}; exposer des champs explicites alignés sur les attributs réellement acceptés par l endpoint`);
    return;
  }

  if (genericFields.length) {
    fail(`${connectorName}: ${template.key} expose des champs génériques (${genericFields.map((field) => field.key).join(', ')}); modéliser des champs explicites, ou réserver cela à un noeud custom request`);
  }

  const pseudoStructuredKeys = new Set(["requestrootkey", "request_root_key", "requestresourceid", "request_resource_id", "requestattributes", "request_attributes"]);
  const pseudoStructuredFields = flatFields.filter((field) => pseudoStructuredKeys.has(String(field.key || "").toLowerCase()));
  if (pseudoStructuredFields.length) {
    fail(`${connectorName}: ${template.key} utilise des champs pseudo-structurés (${pseudoStructuredFields.map((field) => field.key).join(', ')}); exposer les vrais attributs du body un par un`);
  }
}

function sampleValue(key, field) {
  const k = String(key || "").toLowerCase();
  const type = String(field.type || "").toLowerCase();
  if (type === "checkbox" || type === "switch") return false;
  if (type === "number") return 1;
  if (type === "json") return {};
  if (k.includes("url")) return "https://example.test";
  if (k.includes("email")) return "test@example.test";
  if (k.includes("token") || k.includes("secret") || k.includes("key") || k.includes("password")) return "test-token";
  if (k.includes("entity")) return "sensor.test";
  if (k.includes("domain")) return "test";
  if (k.includes("service")) return "test";
  if (k.includes("id")) return "test-id";
  if (k.includes("date") || k.includes("time") || k === "start" || k === "end") return "2026-01-01T00:00:00Z";
  if (k.includes("template")) return "{{ 1 + 1 }}";
  if (k.includes("data") || k.includes("attributes") || k.includes("input") || k.includes("query") || k.includes("headers") || k.includes("options")) return {};
  return "test";
}

function installMockFetch() {
  const previous = global.fetch;
  global.fetch = async (url, options = {}) => {
    const u = String(url);
    const method = String(options.method || "GET").toUpperCase();
    let data = {};
    if (u.includes("/states")) data = method === "GET" && !/\/states\/[^/?]+/.test(u) ? [] : statePayload();
    else if (u.includes("/services")) data = method === "GET" ? [{ domain: "test", services: { test: { name: "Test", description: "Test", fields: {} } } }] : [];
    else if (u.includes("/events")) data = method === "GET" ? [{ event: "state_changed", listener_count: 1 }] : { message: "Event fired." };
    else if (u.includes("/template")) data = "2";
    else if (u.includes("/history")) data = [[statePayload()]];
    else if (u.includes("/logbook")) data = [{ name: "Test", entity_id: "sensor.test", message: "changed", when: "2026-01-01T00:00:00Z", domain: "sensor" }];
    else if (u.includes("/config")) data = { location_name: "Test", version: "2026.1.0", result: "valid" };
    else if (u.includes("/components")) data = ["sensor", "automation"];
    else if (u.includes("/calendars/")) data = [{ summary: "Test", start: { dateTime: "2026-01-01T00:00:00Z" }, end: { dateTime: "2026-01-01T01:00:00Z" } }];
    else if (u.includes("/calendars")) data = [{ entity_id: "calendar.test", name: "Test" }];
    else if (u.includes("/conversation/process")) data = { conversation_id: "test", response: { speech: { plain: { speech: "OK" } } } };
    else if (u.includes("/intent/handle")) data = { response_type: "action_done" };
    else if (u.includes("/camera_proxy")) return response("image", 200, "image/jpeg");
    else if (u.endsWith("/api") || u.includes("/api?")) data = { message: "API running." };
    return response(data);
  };
  return () => { global.fetch = previous; };
}

function statePayload() {
  return {
    entity_id: "sensor.test",
    state: "on",
    last_changed: "2026-01-01T00:00:00Z",
    last_updated: "2026-01-01T00:00:00Z",
    attributes: {},
    context: {}
  };
}

function response(data, status = 200, contentType = "application/json") {
  const body = contentType === "application/json" ? JSON.stringify(data) : String(data);
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => String(name).toLowerCase() === "content-type" ? contentType : null },
    text: async () => body,
    arrayBuffer: async () => Buffer.from(body)
  };
}

function connectorDirs() {
  return fs.readdirSync(reposDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== "_shared")
    .map((d) => d.name)
    .sort();
}

function readConnecteursStatus(file) {
  const status = new Map();
  if (!fs.existsSync(file)) return status;
  const text = fs.readFileSync(file, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\|\s*([^|]+?)\s*\|\s*(Oui|Non)\s*\|$/i);
    if (!match) continue;
    const name = match[1].trim();
    if (name && name !== "---" && name.toLowerCase() !== "connecteur") {
      status.set(name, match[2].trim().toLowerCase() === "oui" ? "Oui" : "Non");
    }
  }
  return status;
}

function updateConnecteursMd(results) {
  const file = path.join(reposDir, "connecteurs.md");
  const previous = readConnecteursStatus(file);
  const existingConnectors = connectorDirs();
  const existingSet = new Set(existingConnectors);
  const passed = new Set(
    (results || [])
      .filter((r) => r && r.passed)
      .map((r) => r && r.connector)
      .filter((name) => name && existingSet.has(name))
  );
  const failed = new Set(
    (results || [])
      .filter((r) => r && !r.passed)
      .map((r) => r && r.connector)
      .filter((name) => name && existingSet.has(name))
  );

  const lines = [
    "# Connecteurs",
    "",
    "| Connecteur | Testé |",
    "| --- | --- |"
  ];
  for (const name of existingConnectors) {
    const value = passed.has(name) ? "Oui" : failed.has(name) ? "Non" : previous.get(name) === "Oui" ? "Oui" : "Non";
    lines.push(`| ${name} | ${value} |`);
  }
  fs.writeFileSync(file, `${lines.join("\n")}\n`);
}

async function invokeTemplates(connectorName, templates, functionsDir, providers, result) {
  const restoreFetch = installMockFetch();
  const credentials = credentialFixture(providers);
  try {
    for (const t of templates) {
      if (!t || !t.key) continue;
      const kind = String(t.nodeKind || t.type || "").toLowerCase();
      if (kind === "event" || kind === "start" || kind === "start_form") continue;
      const handler = loadHandler(functionsDir, t.key);
      if (!handler) continue;
      result.invoked++;
      try {
        await handler({}, {}, inputFixture(t), { credentials, log: () => {} });
      } catch (e) {
        result.invokeFailures++;
        fail(`${connectorName}: invocation mockée échoue pour ${t.key}: ${e.message}`);
      }
    }
  } finally {
    restoreFetch();
  }
}

function loadHandler(functionsDir, key) {
  const files = fs.readdirSync(functionsDir).filter((file) => file.endsWith(".js"));
  for (const file of files) {
    const full = path.join(functionsDir, file);
    try {
      const mod = require(full);
      if (mod && typeof mod[key] === "function") return mod[key];
      if (mod && mod.handlers && typeof mod.handlers[key] === "function") return mod.handlers[key];
    } catch {}
  }
  return null;
}

async function main() {
  if (!connector && !runAll) {
    usage();
    process.exit(2);
  }
  const connectors = runAll
    ? connectorDirs()
    : [connector];
  const results = [];
  for (const name of connectors) {
    const failureStart = failures.length;
    const result = await validateManifest(name);
    result.passed = failures.length === failureStart;
    results.push(result);
  }
  updateConnecteursMd(results);
  const summary = { ok: failures.length === 0, failures, warnings, results };
  if (json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    for (const r of results) console.log(`OK scan ${r.connector}: ${r.providers} provider(s), ${r.templates} template(s), ${r.handlers} handler(s)${invoke ? `, ${r.invoked} invocation(s) mockées` : ""}`);
    for (const w of warnings) console.warn(`WARN: ${w.message}`);
    for (const f of failures) console.error(`ERROR: ${f.message}`);
    console.log(failures.length ? `Connector test failed: ${failures.length} error(s), ${warnings.length} warning(s).` : `Connector test passed: ${warnings.length} warning(s).`);
  }
  process.exit(failures.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
