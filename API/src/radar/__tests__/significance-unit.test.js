// Tests unitaires (purs) du filtre de signifiance — étage 1 (règles).

const test = require('node:test');
const assert = require('node:assert/strict');

const { classifyDeltaRules, summarizeDeltas, compactDeltaForLlm } = require('../significance');

function emailDelta(after, type = 'created') {
  return { id: 'rdel_x', family: 'email', entityType: 'email_message', type, after };
}

test('règles : bruit email certain ignoré (no-reply, newsletter)', () => {
  assert.equal(classifyDeltaRules(emailDelta({ from: 'no-reply@github.com', subject: 'CI passed' })).decision, 'ignore');
  assert.equal(classifyDeltaRules(emailDelta({ from: 'newsletter@shop.fr', subject: 'Offres' })).decision, 'ignore');
  assert.equal(classifyDeltaRules(emailDelta({ from: 'contact@client.fr', subject: 'Notre newsletter de juin' })).decision, 'ignore');
  assert.equal(classifyDeltaRules(emailDelta({ from: 'x@y.fr', subject: 'Cliquez pour vous désabonner' })).decision, 'ignore');
});

test('règles : email humain → ambigu (lecture LLM nécessaire)', () => {
  const r = classifyDeltaRules(emailDelta({ from: 'cabinet@expert-comptable.fr', subject: 'Factures avril' }));
  assert.equal(r.decision, 'ambiguous');
});

test('règles : message supprimé ignoré', () => {
  assert.equal(classifyDeltaRules(emailDelta({ from: 'x@y.fr' }, 'deleted')).decision, 'ignore');
});

test('règles : changement métier → signal direct avec catégorie de famille', () => {
  const r = classifyDeltaRules({ family: 'accounting', entityType: 'supplier_invoice', type: 'created', after: { amount_total: 500 } });
  assert.equal(r.decision, 'signal');
  assert.equal(r.category, 'accounting_change');
  assert.equal(r.urgency, 'normal');
});

test('règles : gros montant → urgence haute (seuil par défaut 10 000, surchargé par policy)', () => {
  const big = { family: 'accounting', entityType: 'supplier_invoice', type: 'created', after: { amount_total: 12500 } };
  assert.equal(classifyDeltaRules(big).urgency, 'high');
  assert.equal(classifyDeltaRules({ ...big, after: { amount_total: 9000 } }).urgency, 'normal');
  assert.equal(classifyDeltaRules({ ...big, after: { amount_total: 9000 } }, { highAmountThreshold: 5000 }).urgency, 'high');
  // le montant du before compte aussi (suppression d'une grosse facture)
  assert.equal(classifyDeltaRules({ family: 'accounting', entityType: 'supplier_invoice', type: 'deleted', before: { amount_total: 20000 } }).urgency, 'high');
});

test('règles : famille communication ambiguë, famille inconnue → signal générique', () => {
  assert.equal(classifyDeltaRules({ family: 'communication', entityType: 'talk_room', type: 'updated', after: { title: 'Projet X' } }).decision, 'ambiguous');
  const r = classifyDeltaRules({ family: 'bizarre', entityType: 'thing', type: 'created', after: {} });
  assert.equal(r.decision, 'signal');
  assert.equal(r.category, 'bizarre_change');
});

test('summarizeDeltas : compte par type et liste les clés', () => {
  const s = summarizeDeltas([
    { entityType: 'supplier_invoice', type: 'created', entityKey: '101' },
    { entityType: 'supplier_invoice', type: 'created', entityKey: '102' },
    { entityType: 'supplier_invoice', type: 'updated', entityKey: '103' },
  ]);
  assert.match(s, /supplier_invoice/);
  assert.match(s, /2 créé/);
  assert.match(s, /1 modifié/);
  assert.match(s, /101, 102, 103/);
});

test('compactDeltaForLlm : ne garde que les champs utiles, tronqués', () => {
  const c = compactDeltaForLlm({
    id: 'rdel_1', family: 'email', entityType: 'email_message', type: 'created',
    after: { from: 'a@b.fr', subject: 'S'.repeat(600), body: 'x'.repeat(3000), text: 'y'.repeat(3000), internalRawPayload: { huge: true } },
  });
  assert.equal(c.id, 'rdel_1');
  assert.equal(c.after.from, 'a@b.fr');
  // contenu (body/text) : cap large pour donner du contexte au classificateur
  assert.equal(c.after.body.length, 1500);
  assert.equal(c.after.text.length, 1500);
  // champs courts : cap 400
  assert.equal(c.after.subject.length, 400);
  assert.equal(c.after.internalRawPayload, undefined);
});
