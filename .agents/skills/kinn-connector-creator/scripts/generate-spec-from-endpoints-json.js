#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { toSnake, titleCase, pluralize } = require("./lib/bulk-utils");

const GENERIC_TAGS = new Set(["api", "default", "general", "misc", "rest"]);
const GENERIC_SEGMENTS = new Set(["api", "v1", "v2", "v3", "rest", "public"]);

function usage() {
  console.error('Usage: node .agents/skills/kinn-connector-creator/scripts/generate-spec-from-endpoints-json.js <endpoints.json> --connector <name> [--provider-key <key>] [--provider-name "Provider"] [--out <spec.json>] [--report-out <report.json>]');
  process.exit(1);
}

function parseArgs(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      if (!opts.input) opts.input = arg;
      else usage();
      continue;
    }

    const next = argv[i + 1];
    if (!next || next.startsWith("--")) usage();

    if (arg === "--connector") opts.connector = next;
    else if (arg === "--provider-key") opts.providerKey = next;
    else if (arg === "--provider-name") opts.providerName = next;
    else if (arg === "--out") opts.out = next;
    else if (arg === "--report-out") opts.reportOut = next;
    else usage();
    i += 1;
  }

  if (!opts.input || !opts.connector) usage();
  return opts;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function singularize(word) {
  const value = String(word || "").trim();
  if (!value) return value;
  if (value.endsWith("ies")) return `${value.slice(0, -3)}y`;
  if (value.endsWith("ses")) return value.slice(0, -2);
  if (value.endsWith("s") && !value.endsWith("ss")) return value.slice(0, -1);
  return value;
}

function meaningfulSegments(pathTemplate) {
  return String(pathTemplate || "")
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .filter((segment) => !segment.startsWith("{") && !segment.endsWith("}"))
    .filter((segment) => !GENERIC_SEGMENTS.has(segment.toLowerCase()));
}

function resourceKeyFor(endpoint) {
  const tags = Array.isArray(endpoint.tags) ? endpoint.tags : [];
  for (const tag of tags) {
    const key = toSnake(tag);
    if (key && !GENERIC_TAGS.has(key)) return singularize(key);
  }

  const segments = meaningfulSegments(endpoint.path);
  for (const segment of segments) {
    const key = toSnake(segment);
    if (key) return singularize(key);
  }
  return "resource";
}

function basePathFor(endpoint) {
  const parts = String(endpoint.path || "").split("/").filter(Boolean);
  if (!parts.length) return "/";
  const last = parts[parts.length - 1];
  if (/^\{[^}]+\}$/.test(last)) return `/${parts.slice(0, -1).join("/")}`;
  return `/${parts.join("/")}`;
}

function inferAction(endpoint) {
  const method = String(endpoint.method || "GET").toUpperCase();
  const text = [endpoint.operation_id, endpoint.summary, endpoint.description, endpoint.path]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const verbPatterns = [
    ["search", /\b(search|find|lookup|query)\b/],
    ["send", /\b(send|email|mail|notify|message)\b/],
    ["archive", /\barchive\b/],
    ["restore", /\brestore\b/],
    ["publish", /\bpublish\b/],
    ["unpublish", /\bunpublish\b/],
    ["assign", /\bassign\b/],
    ["move", /\bmove\b/],
    ["approve", /\bapprove\b/],
    ["reject", /\breject\b/],
    ["cancel", /\bcancel\b/],
    ["retry", /\b(retry|rerun|replay)\b/],
    ["run", /\b(run|execute|invoke|dispatch)\b/],
    ["upload", /\bupload\b/],
    ["download", /\bdownload\b/],
    ["sync", /\bsync\b/],
    ["export", /\bexport\b/],
    ["import", /\bimport\b/]
  ];

  for (const [verb, pattern] of verbPatterns) {
    if (pattern.test(text)) return verb;
  }

  const segments = String(endpoint.path || "").split("/").filter(Boolean);
  const last = segments[segments.length - 1] || "";
  const endsWithId = /^\{[^}]+\}$/.test(last);

  if (method === "GET") return endsWithId ? "get" : "list";
  if (method === "POST") return "create";
  if (method === "PUT" || method === "PATCH") return "update";
  if (method === "DELETE") return "delete";
  return "run";
}

function fieldType(type, format) {
  const t = String(type || "").toLowerCase();
  const f = String(format || "").toLowerCase();
  if (f === "email") return "email";
  if (f === "uri" || f === "url") return "url";
  if (f === "date" || f === "date-time") return "date";
  if (t === "integer" || t === "number") return "number";
  if (t === "boolean") return "checkbox";
  if (t.startsWith("array") || t === "object" || t === "oneof" || t === "anyof" || t === "allof") return "json";
  return "text";
}

function bodyPathParts(name) {
  return String(name || "")
    .replace(/\[\]/g, "")
    .split(".")
    .map((part) => toSnake(part))
    .filter(Boolean);
}

function parameterArgs(endpoint) {
  const args = [];
  const seen = new Set();
  const groups = endpoint.parameters || {};

  for (const group of ["path", "query", "header"]) {
    const params = Array.isArray(groups[group]) ? groups[group] : [];
    for (const param of params) {
      const key = toSnake(param.name);
      if (!key || seen.has(`${group}:${key}`)) continue;
      seen.add(`${group}:${key}`);
      const arg = {
        key,
        type: fieldType(param.type, param.format),
        required: !!param.required,
        in: group
      };
      if (Array.isArray(param.enum) && param.enum.length) arg.options = param.enum.map((value) => ({ label: String(value), value }));
      args.push(arg);
    }
  }

  const requestBody = endpoint.request_body && Array.isArray(endpoint.request_body.attributes)
    ? endpoint.request_body.attributes
    : [];
  const collapsedJsonRoots = new Set();

  for (const attr of requestBody) {
    const rawName = String(attr.name || "").trim();
    if (!rawName) continue;

    const type = String(attr.type || "").toLowerCase();
    const arrayRoot = rawName.includes("[]") ? toSnake(rawName.split("[]")[0]) : "";

    if (arrayRoot) {
      if (collapsedJsonRoots.has(arrayRoot)) continue;
      collapsedJsonRoots.add(arrayRoot);
      args.push({
        key: arrayRoot,
        type: "json",
        required: false,
        in: "body",
        bodyPath: [arrayRoot]
      });
      continue;
    }

    const bodyPath = bodyPathParts(rawName);
    const key = toSnake(bodyPath.join("_"));
    if (!key || seen.has(`body:${key}`)) continue;
    seen.add(`body:${key}`);

    const arg = {
      key,
      type: fieldType(type, attr.format),
      required: !!attr.required,
      in: "body",
      bodyPath
    };
    if (Array.isArray(attr.enum) && attr.enum.length) arg.options = attr.enum.map((value) => ({ label: String(value), value }));
    args.push(arg);
  }

  return args;
}

function normalizeActionKey(action, endpoint, usedKeys) {
  const pathSuffix = meaningfulSegments(endpoint.path).slice(-1)[0] || "";
  let key = toSnake(action);
  if (usedKeys.has(key) && pathSuffix) key = toSnake(`${action}_${singularize(pathSuffix)}`);
  let index = 2;
  let candidate = key;
  while (usedKeys.has(candidate)) {
    candidate = `${key}_${index}`;
    index += 1;
  }
  usedKeys.add(candidate);
  return candidate;
}

function buildSpec(input, opts) {
  const connector = toSnake(opts.connector);
  const providerKey = toSnake(opts.providerKey || connector);
  const providerName = opts.providerName || titleCase(connector);
  const endpoints = Array.isArray(input.endpoints) ? input.endpoints : [];
  const resources = new Map();

  for (const endpoint of endpoints) {
    const resourceKey = toSnake(resourceKeyFor(endpoint)) || "resource";
    if (!resources.has(resourceKey)) {
      resources.set(resourceKey, {
        key: resourceKey,
        title: singularize(resourceKey),
        titlePlural: pluralize(singularize(resourceKey)),
        basePath: basePathFor(endpoint),
        actions: [],
        _usedKeys: new Set()
      });
    }

    const resource = resources.get(resourceKey);
    const action = inferAction(endpoint);
    const actionKey = normalizeActionKey(action, endpoint, resource._usedKeys);

    resource.actions.push({
      key: actionKey,
      action,
      method: endpoint.method,
      path: endpoint.path,
      output: action === "list" || action === "search" ? "list" : action === "delete" ? "action_result" : "item",
      disableDefaultArgs: true,
      args: parameterArgs(endpoint)
    });
  }

  const spec = {
    connector,
    providerKey,
    providerName,
    resources: [...resources.values()].map((resource) => {
      const { _usedKeys, ...clean } = resource;
      return clean;
    })
  };

  const report = {
    connector,
    providerKey,
    providerName,
    endpointCount: endpoints.length,
    resourceCount: spec.resources.length,
    actionCount: spec.resources.reduce((sum, resource) => sum + resource.actions.length, 0)
  };

  return { spec, report };
}

function defaultOut(connector) {
  return path.resolve(process.cwd(), ".agents/skills/kinn-connector-creator/tmp", `${connector}.from-endpoints.spec.json`);
}

function defaultReportOut(connector) {
  return path.resolve(process.cwd(), ".agents/skills/kinn-connector-creator/tmp", `${connector}.from-endpoints.report.json`);
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const input = readJson(path.resolve(process.cwd(), opts.input));
  const { spec, report } = buildSpec(input, opts);
  const outPath = path.resolve(process.cwd(), opts.out || defaultOut(spec.connector));
  const reportPath = path.resolve(process.cwd(), opts.reportOut || defaultReportOut(spec.connector));
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(spec, null, 2)}\n`);
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Spec généré: ${outPath}`);
  console.log(`Rapport: ${reportPath}`);
}

if (require.main === module) main();

module.exports = { buildSpec };
