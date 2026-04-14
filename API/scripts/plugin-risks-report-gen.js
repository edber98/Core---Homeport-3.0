#!/usr/bin/env node
// Generates plugin-risks-report.md by reading all manifests and counting risks.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', 'src', 'plugins');
const OUT = path.join(__dirname, 'plugin-risks-report.md');

function walkManifests(){
  const out = [];
  for (const base of ['local', 'repos']){
    const dir = path.join(ROOT, base);
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)){
      const p = path.join(dir, name, 'manifest.json');
      if (fs.existsSync(p)) out.push({ path: p, name, base });
    }
  }
  return out;
}

const total = { safe: 0, write: 0, destructive: 0, elevated: 0, unset: 0 };
const perPlugin = [];
const ambiguous = []; // items with risk=safe and no riskReason on function-kind templates

for (const m of walkManifests()){
  const raw = fs.readFileSync(m.path, 'utf8');
  let j;
  try { j = JSON.parse(raw); } catch { continue; }
  const fns = Array.isArray(j.nodeTemplates) ? j.nodeTemplates : [];
  const counts = { safe: 0, write: 0, destructive: 0, elevated: 0, unset: 0 };
  for (const fn of fns){
    const r = fn.risk || 'unset';
    if (counts[r] != null) counts[r]++;
    else counts.unset++;
    if (total[r] != null) total[r]++;
    else total.unset++;
    // Heuristic ambiguity marker: function/agent with risk=safe but no explicit reason
    const kind = String(fn.nodeKind || fn.type || 'function').toLowerCase();
    if (fn.risk === 'safe' && !fn.riskReason && (kind === 'function' || kind === 'agent' || kind === 'tool_ai')){
      ambiguous.push({ plugin: `${m.base}/${m.name}`, key: fn.key, title: fn.title });
    }
  }
  perPlugin.push({ name: `${m.base}/${m.name}`, total: fns.length, ...counts });
}

let md = '';
md += '# Plugin risk annotation — report\n\n';
md += `Generated: ${new Date().toISOString()}\n\n`;
md += '## Totals\n\n';
md += `- Manifests processed: **${perPlugin.length}**\n`;
md += `- Functions annotated: **${total.safe + total.write + total.destructive + total.elevated}**\n`;
md += `  - safe: **${total.safe}**\n`;
md += `  - write: **${total.write}**\n`;
md += `  - destructive: **${total.destructive}**\n`;
md += `  - elevated: **${total.elevated}**\n`;
if (total.unset) md += `  - **unset (bug): ${total.unset}**\n`;

md += '\n## Breakdown per plugin\n\n';
md += '| Plugin | Total | safe | write | destructive | elevated |\n';
md += '|---|---:|---:|---:|---:|---:|\n';
for (const p of perPlugin.sort((a, b) => a.name.localeCompare(b.name))){
  md += `| ${p.name} | ${p.total} | ${p.safe} | ${p.write} | ${p.destructive} | ${p.elevated} |\n`;
}

md += '\n## Items still classified as `safe` but without explicit `riskReason`\n\n';
md += 'These were auto-classified by the heuristic as safe (read-only) and MAY deserve\n';
md += 'another human pass if they perform any external call. They are listed so reviewers\n';
md += 'can quickly spot-check and add `riskReason` or upgrade to `write` where appropriate.\n\n';
md += `Total candidates: **${ambiguous.length}**\n\n`;
if (ambiguous.length){
  for (const a of ambiguous.slice(0, 200)){
    md += `- \`${a.plugin}\`  ·  \`${a.key}\`  —  ${a.title || ''}\n`;
  }
  if (ambiguous.length > 200) md += `- ... +${ambiguous.length - 200} more\n`;
}

md += '\n## Items defaulted to `write` (importer fallback)\n\n';
md += 'Any function without an explicit `risk` in its manifest is stored as `write` in\n';
md += 'the `NodeTemplate` document. After this annotation pass, all functions in the\n';
md += 'repository have explicit risk values, so the fallback should not trigger for\n';
md += 'first-party plugins. It still applies to newly imported third-party plugins.\n';

md += '\n## Recommended next steps\n\n';
md += '1. Merge the annotation pass and run `node scripts/annotate-plugin-risks.js --dry-run`\n';
md += '   on every new PR that touches a plugin manifest to catch missing annotations.\n';
md += '2. Add a linter rule (or unit test) that fails the build when a new `nodeTemplates[]`\n';
md += '   entry lacks a `risk` field.\n';
md += '3. Surface `risk` + `riskReason` in the node inspector (frontend) so creators see\n';
md += '   the classification at authoring time.\n';
md += '4. Wire `risk` into `runs.js` pre-exec checks to prompt user confirmation according\n';
md += '   to the thread `autonomyLevel`.\n';
md += '5. Revisit the ambiguous list above and either confirm `safe` or upgrade to `write`.\n';

fs.writeFileSync(OUT, md, 'utf8');
console.log(`Report written: ${OUT}`);
console.log(JSON.stringify({ total, plugins: perPlugin.length, ambiguous: ambiguous.length }, null, 2));
