// Juge LLM de l'observation — vérifie que les RadarDelta produits par le
// collecteur sont réellement EXPLOITABLES par un agent : on déroule un
// scénario métier en base (Mongo local), puis on donne les deltas bruts au
// LLM qui doit répondre à des questions de supervision. S'il répond juste,
// c'est que le format des deltas porte bien l'information.
//
// Sautés si ANTHROPIC_API_KEY absente ou Mongo local injoignable.
// Lancer : ANTHROPIC_API_KEY=... node --test src/radar/__tests__/llm-judge-observation.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
const MONGO_URL = process.env.RADAR_TEST_MONGO_URL || 'mongodb://localhost:27017/homeport_radar_llm_test';

let ready = !!API_KEY;
let skipReason = API_KEY ? null : 'ANTHROPIC_API_KEY absente';
let deltas = [];

let invoices = [
  { id: 501, ref: 'FA-2026-0501', state: 'draft', amount_total: 1850, partner: 'Cartonnage du Château' },
  { id: 502, ref: 'FA-2026-0502', state: 'posted', amount_total: 2542, partner: 'Schneider' },
  { id: 503, ref: 'FA-2026-0503', state: 'draft', amount_total: 720, partner: 'ABC Visserie' },
];

test.before(async () => {
  if (!ready) return;
  try {
    await mongoose.connect(MONGO_URL, { serverSelectionTimeoutMS: 2000 });
    await mongoose.connection.db.dropDatabase();
  } catch {
    ready = false;
    skipReason = 'MongoDB local injoignable';
    return;
  }
  const Provider = require('../../db/models/provider.model');
  const RadarConnector = require('../../db/models/radar-connector.model');
  const RadarDelta = require('../../db/models/radar-delta.model');
  const { collectConnector } = require('../collector');
  const { registry } = require('../../plugins/registry');

  registry.register('fakellm_invoices_list', async () => ({ ok: true, invoices: JSON.parse(JSON.stringify(invoices)) }));
  await Provider.create({
    key: 'fakellm', name: 'FakeLLM', enabled: true,
    radar: [{
      family: 'accounting',
      capabilities: { listSupplierInvoices: { template: 'fakellm_invoices_list' } },
      watch: [{ entity: 'supplier_invoice', via: 'listSupplierInvoices', key: 'id', hashFields: ['state', 'amount_total'], detectDeletions: true, itemsField: 'invoices' }],
    }],
  });
  const connector = await RadarConnector.create({
    workspaceId: new mongoose.Types.ObjectId(), family: 'accounting', providerKey: 'fakellm', label: 'Compta LLM',
  });

  // Baseline puis scénario métier : validation d'une facture, nouvelle facture, facture supprimée
  await collectConnector(connector);
  invoices[0].state = 'posted';                                                                  // FA-0501 validée
  invoices.push({ id: 504, ref: 'FA-2026-0504', state: 'draft', amount_total: 12500, partner: 'Nouvel Atelier SARL' }); // nouvelle
  invoices = invoices.filter(i => i.id !== 503);                                                 // FA-0503 disparue
  await collectConnector(connector);

  deltas = await RadarDelta.find({ connectorId: connector._id }).select('-_id -__v -createdAt -updatedAt').lean();
});

test.after(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.db.dropDatabase();
    await mongoose.disconnect();
  }
});

async function completeJSON(prompt) {
  const { createLlmClient } = require('../../ai/llm');
  const llm = createLlmClient('anthropic', { apiKey: API_KEY, model: MODEL, maxTokens: 1500, temperature: 0 });
  let text = '';
  for await (const ev of llm.stream([{ role: 'user', content: prompt }], [])) {
    if (ev.type === 'text_delta') text += ev.text;
  }
  const match = text.match(/\{[\s\S]*\}/);
  assert.ok(match, `réponse LLM sans JSON: ${text.slice(0, 300)}`);
  return JSON.parse(match[0]);
}

test('juge LLM : un agent peut superviser l\'activité à partir des deltas bruts', { timeout: 120_000 }, async (t) => {
  if (!ready) return t.skip(skipReason);
  assert.equal(deltas.length, 3, 'le scénario doit produire exactement 3 deltas');

  const out = await completeJSON(`Tu es l'agent superviseur d'une entreprise. Le système d'observation t'a remonté ces changements (deltas) détectés dans le logiciel de comptabilité depuis le dernier passage :

${JSON.stringify(deltas, null, 2)}

Réponds à ces questions de supervision, UNIQUEMENT en JSON :
{
  "facture_validee": "<ref de la facture passée de draft à posted, ou null>",
  "nouvelle_facture": { "ref": "<ref>", "montant": <number>, "fournisseur": "<nom>" },
  "facture_disparue": "<ref de la facture qui n'apparaît plus, ou null>",
  "montant_total_nouveau": <montant de la nouvelle facture en attente de saisie>
}`);

  assert.equal(out.facture_validee, 'FA-2026-0501', 'le delta updated doit permettre d\'identifier la validation');
  assert.equal(out.nouvelle_facture.ref, 'FA-2026-0504');
  assert.equal(out.nouvelle_facture.montant, 12500);
  assert.match(out.nouvelle_facture.fournisseur, /Nouvel Atelier/);
  assert.equal(out.facture_disparue, 'FA-2026-0503', 'le delta deleted doit conserver le before');
  assert.equal(out.montant_total_nouveau, 12500);
});

test('juge LLM : le format des deltas est jugé suffisant pour un superviseur autonome', { timeout: 120_000 }, async (t) => {
  if (!ready) return t.skip(skipReason);
  const out = await completeJSON(`Tu audites le format de données d'un système d'observation d'entreprise. Voici des deltas réels produits par le système :

${JSON.stringify(deltas, null, 2)}

Pour qu'un agent superviseur autonome puisse traiter ces événements, il doit pouvoir : identifier l'entité concernée, savoir ce qui a changé, accéder à l'état avant/après, dater l'événement, et distinguer ce qui est déjà traité.

Réponds UNIQUEMENT en JSON : {"exploitable": true/false, "manques": ["..."]}
Sois strict : si une information indispensable manque dans les documents, exploitable=false.`);

  assert.equal(out.exploitable, true, `format jugé insuffisant: ${JSON.stringify(out.manques)}`);
});
