// P5 — Connectabilité générique : adaptateur APPRIS par LLM pour n'importe quel
// logiciel (pas seulement Dolibarr). Prouve que SAP & co. se branchent sans code.
//   A (pur)   : buildWatchSpec dérive une watch correcte d'un mapping.
//   B (stub)  : learnConnectorEntity orchestre échantillon→mapping→watch (sans LLM).
//   C (LLM)   : le LLM mappe une forme SAP cryptique (BELNR/WRBTR/KUNNR) → Transaction.

const test = require('node:test');
const assert = require('node:assert/strict');

const { buildWatchSpec, learnConnectorEntity } = require('../graph/learn-watch');
const { applyMapping } = require('../graph/mapping');

// ── A. buildWatchSpec (pur) ──

test('P5 — buildWatchSpec : watch dérivée du mapping (key + hashFields)', () => {
  const mapping = {
    rawEntityType: 'customer_invoice', keyField: 'id',
    fieldMap: { number: 'ref', amount_total: 'total_ttc', state: 'statut', date: 'date' },
    relationRules: [{ type: 'party_of', role: 'billed_to', viaField: 'socid' }],
    roleRules: [{ field: 'paye', role: 'paid' }],
  };
  const w = buildWatchSpec({ mapping, via: 'listCustomerInvoices' });
  assert.equal(w.entity, 'customer_invoice');
  assert.equal(w.via, 'listCustomerInvoices');
  assert.equal(w.key, 'id');
  // hashFields = champs mappés + viaField relation + champ rôle, SANS la clé
  assert.ok(w.hashFields.includes('total_ttc') && w.hashFields.includes('socid') && w.hashFields.includes('paye'));
  assert.ok(!w.hashFields.includes('id'), 'la clé ne doit pas être un hashField');
});

// ── B. Orchestration avec stubs (aucun LLM, aucune DB) ──

test('P5 — learnConnectorEntity : échantillon → mapping → watch (générique, stubbé)', async () => {
  const SAMPLES = [
    { rowid: 'X1', label: 'ACME', mail: 'a@acme.io', kind: 'C' },
    { rowid: 'X2', label: 'BETA', mail: 'b@beta.io', kind: 'C' },
  ];
  // execCapability stubbé : renvoie les échantillons
  const execCapability = async () => ({ ok: true, result: { data: SAMPLES } });
  // LLM stubbé : renvoie un mapping plausible (déterministe)
  const complete = async () => ({
    target: { coreType: 'Party', subtype: 'organization' },
    keyField: 'rowid', identityFields: ['mail'], labelField: 'label',
    fieldMap: { name: 'label', email: 'mail' }, relationRules: [],
  });
  const out = await learnConnectorEntity({
    connector: { providerKey: 'acme_crm', family: 'crm' },
    capability: 'listContacts', entity: 'contact',
    execCapability, complete,
  });
  assert.equal(out.ok, true, out.error);
  assert.equal(out.valid, true, (out.errors || []).join(', '));
  assert.equal(out.mapping.target.coreType, 'Party');
  // la watch dérivée est cohérente
  assert.equal(out.watch.entity, 'contact');
  assert.equal(out.watch.key, 'rowid');
  assert.ok(out.watch.hashFields.includes('label') && out.watch.hashFields.includes('mail'));
  // le mapping appris s'applique réellement
  const m = applyMapping(SAMPLES[0], out.mapping);
  assert.equal(m.coreType, 'Party');
  assert.equal(m.canonicalKey, 'mail:a@acme.io'); // identité forte par email
});

test('P5 — learnConnectorEntity : échec d\'échantillonnage géré proprement', async () => {
  const out = await learnConnectorEntity({
    connector: { providerKey: 'x', family: 'crm' }, capability: 'listContacts', entity: 'c',
    execCapability: async () => ({ ok: false, error: 'boom' }),
  });
  assert.equal(out.ok, false);
  assert.match(out.error, /sample_failed/);
});

// ── C. LLM réel : forme SAP cryptique → Transaction ──

const API_KEY = process.env.ANTHROPIC_API_KEY;

test('P5 — le LLM mappe une forme SAP (BELNR/WRBTR/KUNNR) vers l\'ontologie', { timeout: 120_000 }, async (t) => {
  if (!API_KEY) return t.skip('ANTHROPIC_API_KEY absente');
  // Échantillons façon SAP (FI) : pièce comptable client, champs cryptiques.
  const SAP = [
    { BELNR: '1900000012', BUKRS: '1000', WRBTR: '2542.00', WAERS: 'EUR', BLDAT: '20260415', KUNNR: 'C-0074', BSTAT: 'A' },
    { BELNR: '1900000013', BUKRS: '1000', WRBTR: '880.00', WAERS: 'EUR', BLDAT: '20260416', KUNNR: 'C-0074', BSTAT: 'A' },
    { BELNR: '1900000014', BUKRS: '1000', WRBTR: '1200.50', WAERS: 'EUR', BLDAT: '20260417', KUNNR: 'C-0099', BSTAT: 'A' },
  ];
  // execCapability stubbé (pas de vrai SAP), mais inférence LLM RÉELLE
  const out = await learnConnectorEntity({
    connector: { providerKey: 'sap', family: 'accounting' },
    capability: 'listCustomerInvoices', entity: 'sap_fi_document',
    execCapability: async () => ({ ok: true, result: { data: SAP } }),
  });
  assert.equal(out.ok, true, out.error);
  assert.equal(out.mapping.target.coreType, 'Transaction', `coreType=${out.mapping.target?.coreType}`);
  assert.ok(out.valid, `mapping invalide: ${(out.errors || []).join(', ')}`);
  // le LLM doit relier KUNNR (client) à une Party
  const partyRel = (out.mapping.relationRules || []).find(r => r.targetCoreType === 'Party');
  assert.ok(partyRel, 'relation vers le client (KUNNR) attendue');
  // la watch dérivée surveille le montant et la date
  assert.ok(out.watch.hashFields.includes('WRBTR'), 'le montant doit être surveillé');
  // le mapping s'applique aux échantillons SAP
  const m = applyMapping(SAP[0], out.mapping);
  assert.ok(m && m.coreType === 'Transaction', 'mapping SAP applicable');
  console.log(`[test] SAP → ${out.mapping.target.coreType}/${out.mapping.target.subtype}, key=${out.mapping.keyField}, montant=${out.mapping.fieldMap?.amount_total}, relation→${partyRel.targetCoreType} via ${partyRel.viaField}`);
});
