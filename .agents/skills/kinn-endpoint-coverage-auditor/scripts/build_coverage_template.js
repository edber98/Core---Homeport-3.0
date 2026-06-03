#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const connector = process.argv[2];
if (!connector) {
  console.error("Usage: node scripts/build_coverage_template.js <connector>");
  process.exit(1);
}

const repo = path.join(process.cwd(), "API", "src", "plugins", "repos", connector);
const manifestPath = path.join(repo, "manifest.json");
if (!fs.existsSync(manifestPath)) {
  console.error(`Manifest introuvable: ${manifestPath}`);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const rows = (manifest.nodeTemplates || []).map((n) => ({
  nodeKey: n.key,
  title: n.title || "",
  group: n.group || "",
  status: "COVERED",
  endpoint: "",
  note: ""
}));

const template = {
  connector,
  generatedAt: new Date().toISOString(),
  summary: {
    covered: rows.length,
    missing: 0,
    excluded: 0
  },
  rows
};

const out = path.join(repo, "coverage-template.json");
fs.writeFileSync(out, JSON.stringify(template, null, 2) + "\n");
console.log(out);
