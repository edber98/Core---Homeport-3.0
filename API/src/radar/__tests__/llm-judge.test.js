// Juge LLM — vérifie la cohérence SÉMANTIQUE des mappings radar des manifests
// pilotes : pour chaque capacité du contrat de famille, le NodeTemplate ciblé
// fait-il bien ce que la capacité promet ?
//
// Ces tests appellent l'API Anthropic : ils sont sautés si ANTHROPIC_API_KEY
// n'est pas définie. Lancer : ANTHROPIC_API_KEY=... node --test src/radar/__tests__/llm-judge.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { FAMILIES, normalizeRadarBlocks } = require('../families');

const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
const SKIP = !API_KEY ? 'ANTHROPIC_API_KEY absente — tests LLM sautés' : false;

const REPOS_DIR = path.resolve(__dirname, '../../plugins/repos');
const PILOTS = ['odoo', 'gmail', 'nextcloud'];

function loadManifest(repo) {
  return JSON.parse(fs.readFileSync(path.join(REPOS_DIR, repo, 'manifest.json'), 'utf8'));
}

async function completeJSON(prompt) {
  const { createLlmClient } = require('../../ai/llm');
  const llm = createLlmClient('anthropic', { apiKey: API_KEY, model: MODEL, maxTokens: 3000, temperature: 0 });
  let text = '';
  for await (const ev of llm.stream([{ role: 'user', content: prompt }], [])) {
    if (ev.type === 'text_delta') text += ev.text;
  }
  const match = text.match(/\{[\s\S]*\}/);
  assert.ok(match, `réponse LLM sans JSON: ${text.slice(0, 300)}`);
  return JSON.parse(match[0]);
}

// Décrit les mappings d'un bloc radar avec les métadonnées réelles des templates ciblés
function describeMappings(manifest, block) {
  const byKey = new Map((manifest.nodeTemplates || []).map(t => [t.key, t]));
  return Object.entries(block.capabilities).map(([cap, spec]) => {
    const contract = FAMILIES[block.family].capabilities[cap];
    const tmpl = byKey.get(spec.template) || {};
    return {
      capability: cap,
      attendu: contract ? `${contract.description} (${contract.kind})` : 'INCONNU',
      template: spec.template,
      templateTitle: tmpl.title || '',
      templateDescription: tmpl.description || '',
      argsParDefaut: spec.args || {},
    };
  });
}

function judgePrompt(providerKey, family, mappings) {
  return `Tu es un auditeur technique. Le système "Radar" définit des familles de connecteurs avec des capacités sémantiques. Chaque provider mappe ces capacités vers ses propres fonctions (NodeTemplates).

Famille : "${family}" — ${FAMILIES[family].description}
Provider : "${providerKey}"

Pour chaque mapping ci-dessous, juge si le template ciblé (titre + description + args par défaut) accomplit bien ce que la capacité promet. Un mapping est INCORRECT si le template fait autre chose, opère sur le mauvais type d'objet, ou si les args par défaut contredisent la capacité (ex: lister des factures FOURNISSEURS avec un filtre de factures clients).

Mappings à auditer :
${JSON.stringify(mappings, null, 2)}

Réponds UNIQUEMENT avec un JSON de cette forme, sans texte autour :
{"verdicts": [{"capability": "...", "ok": true, "reason": "..."}]}
Sois strict mais raisonnable : un template plus générique que la capacité (ex: une liste filtrable par args) est OK si les args par défaut le spécialisent correctement.`;
}

for (const repo of PILOTS) {
  test(`juge LLM : mappings radar de ${repo} sémantiquement corrects`, { skip: SKIP, timeout: 120_000 }, async () => {
    const manifest = loadManifest(repo);
    for (const p of (manifest.providers || []).filter(x => x.radar)) {
      for (const block of normalizeRadarBlocks(p.radar)) {
        const mappings = describeMappings(manifest, block);
        const out = await completeJSON(judgePrompt(p.key, block.family, mappings));
        assert.ok(Array.isArray(out.verdicts), `verdicts manquants pour ${p.key}/${block.family}`);
        assert.equal(out.verdicts.length, mappings.length,
          `${p.key}/${block.family}: ${out.verdicts.length} verdicts pour ${mappings.length} mappings`);
        const bad = out.verdicts.filter(v => !v.ok);
        assert.equal(bad.length, 0,
          `${p.key}/${block.family} — mappings jugés incorrects:\n` + bad.map(v => `  - ${v.capability}: ${v.reason}`).join('\n'));
      }
    }
  });
}

test('juge LLM : le contrat des familles est exploitable par un agent', { skip: SKIP, timeout: 120_000 }, async () => {
  // Vérifie que les descriptions de capacités sont assez claires et non ambiguës
  // pour qu'un agent (le superviseur radar) choisisse la bonne capacité.
  const contract = Object.fromEntries(Object.entries(FAMILIES).map(([k, f]) => [k, {
    description: f.description,
    capabilities: Object.fromEntries(Object.entries(f.capabilities).map(([c, s]) => [c, `${s.description} (${s.kind})`])),
  }]));
  const scenarios = [
    { question: 'Lister les factures fournisseurs saisies ce mois-ci dans la compta', attendu: { family: 'accounting', capability: 'listSupplierInvoices' } },
    { question: 'Récupérer les pièces jointes du mail de l\'expert-comptable', attendu: { family: 'email', capability: 'getAttachments' } },
    { question: 'Voir quels devis n\'ont pas eu de réponse', attendu: { family: 'crm', capability: 'listQuotes' } },
    { question: 'Parcourir le dossier /Compta/Fournisseurs/2026', attendu: { family: 'storage', capability: 'listTree' } },
  ];
  const out = await completeJSON(`Voici le contrat des familles d'un système d'agent d'entreprise :
${JSON.stringify(contract, null, 2)}

Pour chaque besoin ci-dessous, choisis LA capacité la plus adaptée.
${JSON.stringify(scenarios.map(s => s.question), null, 2)}

Réponds UNIQUEMENT en JSON : {"choices": [{"question": "...", "family": "...", "capability": "..."}]}`);
  assert.ok(Array.isArray(out.choices) && out.choices.length === scenarios.length, 'choices invalides');
  for (let i = 0; i < scenarios.length; i++) {
    const got = out.choices[i];
    const exp = scenarios[i].attendu;
    assert.equal(`${got.family}.${got.capability}`, `${exp.family}.${exp.capability}`,
      `scénario "${scenarios[i].question}" : le contrat a induit le mauvais choix (${got.family}.${got.capability}) — descriptions à clarifier`);
  }
});
