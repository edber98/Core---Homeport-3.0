// Tests unitaires (purs, sans DB) du graphe : ontologie + application de mapping.

const test = require('node:test');
const assert = require('node:assert/strict');

const ont = require('../graph/ontology');
const { applyMapping, buildCanonicalKey, schemaChecksum } = require('../graph/mapping');
const { DOLIBARR_MAPPINGS } = require('../graph/mappings-dolibarr');

// ── Ontologie ──

test('ontologie : 9 coreTypes (dont Measurement), chacun avec des sous-types', () => {
  assert.equal(ont.CORE_TYPE_KEYS.length, 9);
  for (const k of ont.CORE_TYPE_KEYS) assert.ok(ont.CORE_TYPES[k].subtypes.length > 0, `${k} sans sous-type`);
});

test('isValidType : couples valides/invalides', () => {
  assert.equal(ont.isValidType('Transaction', 'invoice'), true);
  assert.equal(ont.isValidType('Party', 'organization'), true);
  assert.equal(ont.isValidType('Transaction', 'banane'), false);
  assert.equal(ont.isValidType('Inconnu', 'x'), false);
  assert.equal(ont.isValidType('Party', null), true); // coreType seul OK
});

test('relations et rôles : vocabulaire fermé', () => {
  assert.ok(ont.isValidRelation('party_of'));
  assert.ok(ont.isValidRelation('derived_from'));
  assert.ok(!ont.isValidRelation('invente_moi'));
  assert.ok(ont.isValidRole('client') && ont.isValidRole('supplier'));
  assert.ok(!ont.isValidRole('xxx'));
});

// ── Application de mapping ──

const invoiceMapping = DOLIBARR_MAPPINGS.find(m => m.rawEntityType === 'customer_invoice');
const partyMapping = DOLIBARR_MAPPINGS.find(m => m.rawEntityType === 'party');

test('applyMapping : facture → Transaction/invoice + relation billed_to', () => {
  const raw = { id: '14', ref: 'FA-2026-014', total_ttc: '2542.00', date: 1781568000, statut: '1', paye: '0', socid: '74' };
  const m = applyMapping(raw, invoiceMapping);
  assert.equal(m.coreType, 'Transaction');
  assert.equal(m.subtype, 'invoice');
  assert.equal(m.attributes.number, 'FA-2026-014');
  assert.equal(m.attributes.amount_total, '2542.00');
  assert.equal(m.attributes.state, 'émise');         // valueMap 1 → émise
  assert.equal(m.attributes.payment_state, 'impayée'); // valueMap 0 → impayée
  assert.equal(m.externalId, '14');
  assert.equal(m.canonicalKey, 'dolibarr:customer_invoice:14'); // pas d'identityField
  // relation billed_to → party 74
  assert.equal(m.relations.length, 1);
  assert.equal(m.relations[0].type, 'party_of');
  assert.equal(m.relations[0].role, 'billed_to');
  assert.equal(m.relations[0].toKey, 'dolibarr:party:74');
});

test('applyMapping : tiers → identité forte par email + rôles conditionnels', () => {
  const client = applyMapping({ id: '74', name: 'Cartonnage', email: 'a@b.fr', client: '1', fournisseur: '0' }, partyMapping);
  assert.equal(client.canonicalKey, 'email:a@b.fr');  // identityField email prioritaire
  assert.deepEqual(client.roles, ['client']);          // roleRule client=1
  const supplier = applyMapping({ id: '78', name: 'ITBS', email: 'x@it-bs.fr', client: '0', fournisseur: '1' }, partyMapping);
  assert.deepEqual(supplier.roles, ['supplier']);
  const both = applyMapping({ id: '9', name: 'Mixte', email: 'm@m.fr', client: '1', fournisseur: '1' }, partyMapping);
  assert.deepEqual(both.roles.sort(), ['client', 'supplier']);
});

// ── lineRules : lignes d'articles → relations references vers les produits ──

test('applyMapping : lignes de facture → une relation references par produit', () => {
  const raw = {
    id: '20', ref: 'FA-2026-020', total_ttc: '3000', date: 1781568000, statut: '1', paye: '0', socid: '74',
    lines: [
      { fk_product: '9', product_label: 'Serveur NAS', qty: 2 },
      { fk_product: '12', product_label: 'Licence M365', qty: 10 },
      { desc: 'Ligne libre sans produit', qty: 1 },   // pas de fk_product → ignorée
    ],
  };
  const m = applyMapping(raw, invoiceMapping);
  const lineRels = m.relations.filter(r => r.role === 'line_item');
  assert.equal(lineRels.length, 2);                                   // 2 produits, la ligne libre ignorée
  assert.deepEqual(lineRels.map(r => r.toKey).sort(), ['dolibarr:product:12', 'dolibarr:product:9']);
  assert.equal(lineRels.every(r => r.type === 'references'), true);
  assert.equal(lineRels.every(r => r.target.coreType === 'Asset' && r.target.subtype === 'product'), true);
  // résumé des lignes conservé en attribut
  assert.equal(m.attributes.line_items.length, 2);
  assert.equal(m.attributes.line_items.find(l => l.product === '9').qty, 2);
  // la relation client billed_to est toujours là
  assert.ok(m.relations.some(r => r.type === 'party_of' && r.role === 'billed_to'));
});

// ── Apprentissage de schéma + détection de doute (predict-or-ask) ──

test('inferSchema : types, optionnalité et tableaux d\'objets (lignes)', () => {
  const { inferSchema } = require('../graph/learn-mapping');
  const { schema, doubts, arrayObjectFields } = inferSchema([
    { id: 1, ref: 'A', statut: 0, lines: [{ fk_product: 5, qty: 2 }] },
    { id: 2, ref: 'B', statut: 1, lines: [{ fk_product: 6, qty: 1 }], note: 'x' },
  ]);
  assert.equal(schema.id.type, 'number');
  assert.equal(schema.note.optional, true);              // absent du 1er échantillon
  assert.equal(schema.lines.type, 'array<object>');
  assert.deepEqual(schema.lines.lineFields, ['fk_product', 'qty']);
  assert.deepEqual(arrayObjectFields, ['lines']);
  assert.equal(doubts.length, 0);
});

test('inferSchema : types hétérogènes d\'un même champ → doute', () => {
  const { inferSchema } = require('../graph/learn-mapping');
  const { doubts } = inferSchema([{ id: 1, montant: 100 }, { id: 2, montant: 'cent' }]);
  assert.ok(doubts.some(d => d.includes('montant')));    // number vs string → structure douteuse
});

test('applyMapping : sans clé → null ; relation ignorée si champ vide', () => {
  assert.equal(applyMapping({ ref: 'x' }, invoiceMapping), null); // pas d'id
  const noSoc = applyMapping({ id: '1', ref: 'r', socid: '' }, invoiceMapping);
  assert.equal(noSoc.relations.length, 0); // socid vide → pas de relation
});

test('buildCanonicalKey : forte si dispo, sinon provider:type:id', () => {
  assert.equal(buildCanonicalKey({ id: '5', email: 'z@z.fr' }, partyMapping), 'email:z@z.fr');
  assert.equal(buildCanonicalKey({ id: '5' }, partyMapping), 'dolibarr:party:5');
});

test('schemaChecksum : stable, change si les champs changent', () => {
  const a = schemaChecksum({ id: 1, ref: 'x', total: 2 });
  const b = schemaChecksum({ ref: 'y', total: 9, id: 7 }); // mêmes CHAMPS, valeurs diff
  const c = schemaChecksum({ id: 1, ref: 'x', total: 2, nouveau: 3 }); // champ en plus
  assert.equal(a, b);          // même schéma
  assert.notEqual(a, c);       // schéma différent → dérive détectable
});

test('cohérence : tous les mappings Dolibarr ciblent des types valides', () => {
  for (const m of DOLIBARR_MAPPINGS) {
    assert.ok(ont.isValidType(m.target.coreType, m.target.subtype), `${m.rawEntityType} → ${m.target.coreType}.${m.target.subtype} invalide`);
    for (const r of m.relationRules || []) {
      assert.ok(ont.isValidRelation(r.type), `${m.rawEntityType}: relation ${r.type} invalide`);
      assert.ok(ont.isValidType(r.targetCoreType, r.targetSubtype), `${m.rawEntityType}: cible ${r.targetCoreType}.${r.targetSubtype} invalide`);
    }
  }
});
