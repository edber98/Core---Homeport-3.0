#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const DEFAULT_EXCLUDES = [
  { reason: "admin_config", pattern: /(^|[\s/_-])(admin|administration|config|configuration|settings?|preferences?|workspace|organization|organisation|tenant|project settings|team settings)([\s/_-]|$)/i },
  { reason: "identity_security", pattern: /(^|[\s/_-])(role|roles|permission|permissions|policy|policies|member|members|user management|security|sso|scim|apikey|api key|token|oauth|credential|credentials|secret|secrets)([\s/_-]|$)/i },
  { reason: "billing", pattern: /(^|[\s/_-])(billing|invoice|invoices|subscription|subscriptions|plan|plans|payment|payments|payment method|metering|usage costs?)([\s/_-]|$)/i },
  { reason: "internal_technical", pattern: /(^|[\s/_-])(audit|audits|diagnostic|diagnostics|health|healthcheck|status page|internal|system|feature flag|feature flags|maintenance|telemetry|debug|debugging)([\s/_-]|$)/i },
  { reason: "credential_setup", pattern: /(^|[\s/_-])(webhook secret|rotate secret|rotate key|regenerate key|access token|refresh token)([\s/_-]|$)/i }
];

const ACTION_HINTS = [
  /(^|[\s/_-])(list|get|search|find|query|create|update|upsert|delete|archive|restore|send|run|execute|deploy|cancel|retry|approve|reject|publish|unpublish|assign|move|tag|comment|upload|download|export|import|sync)([\s/_-]|$)/i
];

const BUSINESS_HINTS = [
  /(^|[\s/_-])(contact|company|deal|ticket|issue|project|task|page|document|file|message|comment|lead|invoice|order|customer|payment|transaction|event|job|run|deployment|build|campaign|segment|product|subscription|contact group|contactgroup)([\s/_-]|$)/i
];

function usage() {
  console.error("Usage: node .agents/skills/automation-endpoint-pruner/scripts/filter-automation-endpoints.js <endpoints.json> [--output <filtered.json>] [--include <regex>] [--exclude <regex>]");
  process.exit(1);
}

function parseArgs(argv) {
  const opts = {
    includes: [],
    excludes: []
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      if (!opts.input) opts.input = arg;
      else usage();
      continue;
    }

    if (arg === "--output") {
      opts.output = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--include") {
      opts.includes.push(new RegExp(argv[i + 1], "i"));
      i += 1;
      continue;
    }
    if (arg === "--exclude") {
      opts.excludes.push(new RegExp(argv[i + 1], "i"));
      i += 1;
      continue;
    }
    usage();
  }

  if (!opts.input) usage();
  return opts;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function stringifyEndpoint(endpoint) {
  const tags = Array.isArray(endpoint.tags) ? endpoint.tags.join(" ") : "";
  return [
    endpoint.method,
    endpoint.path,
    endpoint.operation_id,
    endpoint.summary,
    endpoint.description,
    tags
  ]
    .filter(Boolean)
    .join(" ");
}

function hasActionHint(text) {
  return ACTION_HINTS.some((pattern) => pattern.test(text));
}

function hasBusinessHint(text) {
  return BUSINESS_HINTS.some((pattern) => pattern.test(text));
}

function detectExclusion(text, extraExcludes) {
  for (const { reason, pattern } of DEFAULT_EXCLUDES) {
    if (pattern.test(text)) return reason;
  }
  for (const pattern of extraExcludes) {
    if (pattern.test(text)) return "manual_exclude";
  }
  return null;
}

function shouldForceInclude(text, includes) {
  return includes.some((pattern) => pattern.test(text));
}

function filterEndpoints(input, opts) {
  const sourceEndpoints = Array.isArray(input.endpoints) ? input.endpoints : [];
  const kept = [];
  const removed = [];
  const reasons = {};

  for (const endpoint of sourceEndpoints) {
    const text = stringifyEndpoint(endpoint);
    const forcedInclude = shouldForceInclude(text, opts.includes);
    const exclusionReason = detectExclusion(text, opts.excludes);

    if (forcedInclude) {
      kept.push(endpoint);
      continue;
    }

    if (exclusionReason && !hasBusinessHint(text)) {
      reasons[exclusionReason] = (reasons[exclusionReason] || 0) + 1;
      removed.push({ ...endpoint, exclusion_reason: exclusionReason });
      continue;
    }

    kept.push(endpoint);
  }

  return {
    api: input.api || {},
    source_endpoint_count: sourceEndpoints.length,
    endpoint_count: kept.length,
    endpoints: kept,
    excluded_endpoint_count: removed.length,
    excluded_endpoints: removed,
    filter_report: {
      kept: kept.length,
      removed: removed.length,
      reasons
    }
  };
}

function defaultOutputPath(inputPath) {
  const abs = path.resolve(process.cwd(), inputPath);
  if (abs.endsWith(".json")) return abs.replace(/\.json$/i, "-automation.json");
  return `${abs}-automation.json`;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const inputPath = path.resolve(process.cwd(), opts.input);
  const input = readJson(inputPath);
  const output = filterEndpoints(input, opts);
  const outputPath = path.resolve(process.cwd(), opts.output || defaultOutputPath(inputPath));
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(outputPath);
  console.log(JSON.stringify(output.filter_report, null, 2));
}

main();
