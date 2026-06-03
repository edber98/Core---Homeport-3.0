#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

function usage() {
  console.error(`Usage:
node update-connector-logo.js <connector> --icon-url <url> [--icon-class <class>] [--color <hex>] [--logo-color <hex>] [--mix <0..1>] [--manifest <path>] [--dry-run]

Examples:
node update-connector-logo.js notion --icon-url https://cdn.simpleicons.org/notion --icon-class "fa-solid fa-book" --logo-color "#000000"
node update-connector-logo.js airtable --icon-url https://example.com/logo.png --icon-class "fa-solid fa-table-cells" --color "#f2f2f2"
`);
  process.exit(1);
}

function parseArgs(argv) {
  const connector = argv[2];
  if (!connector || connector.startsWith("-")) usage();

  const opts = {
    connector,
    mix: 0.88,
    dryRun: false,
  };

  for (let i = 3; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") {
      opts.dryRun = true;
      continue;
    }

    const value = argv[i + 1];
    if (!value || value.startsWith("--")) usage();
    i += 1;

    if (arg === "--icon-url") opts.iconUrl = value;
    else if (arg === "--icon-class") opts.iconClass = value;
    else if (arg === "--color") opts.color = value;
    else if (arg === "--logo-color") opts.logoColor = value;
    else if (arg === "--mix") opts.mix = Number(value);
    else if (arg === "--manifest") opts.manifest = value;
    else usage();
  }

  if (!opts.iconUrl) usage();
  if (!opts.color && !opts.logoColor) {
    console.error("Provide --color for an exact background or --logo-color to derive one.");
    process.exit(1);
  }
  if (!Number.isFinite(opts.mix) || opts.mix < 0 || opts.mix > 1) {
    console.error("--mix must be a number between 0 and 1.");
    process.exit(1);
  }

  return opts;
}

function normalizeHex(hex, label) {
  const input = String(hex || "").trim();
  const match = input.match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!match) {
    console.error(`${label} must be a 3- or 6-digit hex color.`);
    process.exit(1);
  }

  let value = match[1].toLowerCase();
  if (value.length === 3) {
    value = value
      .split("")
      .map((char) => char + char)
      .join("");
  }
  return `#${value}`;
}

function hexToRgb(hex) {
  const value = normalizeHex(hex, "color").slice(1);
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b]
    .map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0"))
    .join("")}`;
}

function mixWithWhite(hex, mix) {
  const rgb = hexToRgb(hex);
  return rgbToHex({
    r: rgb.r + (255 - rgb.r) * mix,
    g: rgb.g + (255 - rgb.g) * mix,
    b: rgb.b + (255 - rgb.b) * mix,
  });
}

function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const channels = [r, g, b].map((value) => {
    const normalized = value / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function withVisualFieldsAfterTitle(provider, updates) {
  const next = {};
  let inserted = false;

  for (const [key, value] of Object.entries(provider)) {
    if (key === "iconClass" || key === "iconUrl" || key === "color") continue;
    next[key] = value;

    if (key === "title") {
      next.iconClass = updates.iconClass;
      next.iconUrl = updates.iconUrl;
      next.color = updates.color;
      inserted = true;
    }
  }

  if (!inserted) {
    next.iconClass = updates.iconClass;
    next.iconUrl = updates.iconUrl;
    next.color = updates.color;
  }

  return next;
}

function main() {
  const opts = parseArgs(process.argv);
  const manifestPath =
    opts.manifest ||
    path.join(process.cwd(), "API", "src", "plugins", "repos", opts.connector, "manifest.json");

  if (!fs.existsSync(manifestPath)) {
    console.error(`Manifest not found: ${manifestPath}`);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (!Array.isArray(manifest.providers) || manifest.providers.length === 0) {
    console.error("manifest.providers must contain at least one provider.");
    process.exit(1);
  }

  const providerIndex = manifest.providers.findIndex((provider) => provider.key === opts.connector);
  const index = providerIndex >= 0 ? providerIndex : 0;
  const provider = manifest.providers[index];

  const logoColor = opts.logoColor ? normalizeHex(opts.logoColor, "logo-color") : null;
  const color = normalizeHex(opts.color || mixWithWhite(logoColor, opts.mix), "color");

  if (logoColor && relativeLuminance(color) <= relativeLuminance(logoColor)) {
    console.error(`Background ${color} must be lighter than logo color ${logoColor}.`);
    process.exit(1);
  }

  const updates = {
    iconClass: opts.iconClass || provider.iconClass || "fa-solid fa-puzzle-piece",
    iconUrl: opts.iconUrl,
    color,
  };

  manifest.providers[index] = withVisualFieldsAfterTitle(provider, updates);

  const output = `${JSON.stringify(manifest, null, 2)}\n`;
  if (!opts.dryRun) {
    fs.writeFileSync(manifestPath, output);
  }

  console.log(`${opts.dryRun ? "Would update" : "Updated"} ${manifestPath}`);
  console.log(JSON.stringify({
    provider: manifest.providers[index].key || opts.connector,
    iconClass: updates.iconClass,
    iconUrl: updates.iconUrl,
    color: updates.color,
  }, null, 2));
}

main();
