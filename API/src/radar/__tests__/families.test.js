// Tests du contrat des familles radar et de la validation des blocs manifest.

const test = require('node:test');
const assert = require('node:assert/strict');

const { FAMILIES, FAMILY_KEYS, normalizeRadarBlocks, validateRadarBlocks, capabilityKind } = require('../families');

test('chaque famille a un label, une description et au moins une capacité', () => {
  for (const key of FAMILY_KEYS) {
    const fam = FAMILIES[key];
    assert.ok(fam.label, `${key}: label manquant`);
    assert.ok(fam.description, `${key}: description manquante`);
    assert.ok(Object.keys(fam.capabilities).length > 0, `${key}: aucune capacité`);
  }
});

test('chaque capacité a un kind read|write et une description', () => {
  for (const key of FAMILY_KEYS) {
    for (const [cap, spec] of Object.entries(FAMILIES[key].capabilities)) {
      assert.ok(['read', 'write'].includes(spec.kind), `${key}.${cap}: kind invalide '${spec.kind}'`);
      assert.ok(spec.description, `${key}.${cap}: description manquante`);
    }
  }
});

test('testCapability existe dans le contrat et est une capacité de lecture', () => {
  for (const key of FAMILY_KEYS) {
    const fam = FAMILIES[key];
    assert.ok(fam.capabilities[fam.testCapability], `${key}: testCapability '${fam.testCapability}' hors contrat`);
    assert.equal(fam.capabilities[fam.testCapability].kind, 'read', `${key}: testCapability doit être read`);
  }
});

test('normalizeRadarBlocks accepte objet seul, tableau, et valeurs vides', () => {
  assert.deepEqual(normalizeRadarBlocks(null), []);
  assert.deepEqual(normalizeRadarBlocks(undefined), []);
  const block = { family: 'email', capabilities: {} };
  assert.deepEqual(normalizeRadarBlocks(block), [block]);
  assert.deepEqual(normalizeRadarBlocks([block, null]), [block]);
});

const VALID_BLOCK = {
  family: 'email',
  capabilities: {
    listMessages: { template: 'gmail_messages_list' },
    sendMessage: { template: 'gmail_messages_send', args: { format: 'full' } },
  },
  watch: [{ entity: 'email_message', via: 'listMessages', key: 'id', hashFields: ['labelIds'] }],
};

test('validateRadarBlocks accepte un bloc valide (avec et sans templateKeys)', () => {
  assert.deepEqual(validateRadarBlocks(VALID_BLOCK), { ok: true, errors: [] });
  const withKeys = validateRadarBlocks(VALID_BLOCK, { templateKeys: ['gmail_messages_list', 'gmail_messages_send'] });
  assert.deepEqual(withKeys, { ok: true, errors: [] });
});

test('validateRadarBlocks rejette une famille inconnue', () => {
  const v = validateRadarBlocks({ family: 'banane', capabilities: { x: { template: 't' } } });
  assert.equal(v.ok, false);
  assert.match(v.errors[0], /famille inconnue/);
});

test('validateRadarBlocks rejette une capacité hors contrat', () => {
  const v = validateRadarBlocks({ family: 'email', capabilities: { listInvoices: { template: 't' } } });
  assert.equal(v.ok, false);
  assert.match(v.errors[0], /hors contrat/);
});

test('validateRadarBlocks rejette un template manquant ou inconnu', () => {
  const noTemplate = validateRadarBlocks({ family: 'email', capabilities: { listMessages: {} } });
  assert.equal(noTemplate.ok, false);
  assert.match(noTemplate.errors[0], /'template' manquant/);

  const unknown = validateRadarBlocks(VALID_BLOCK, { templateKeys: ['gmail_messages_list'] });
  assert.equal(unknown.ok, false);
  assert.match(unknown.errors[0], /template inconnu 'gmail_messages_send'/);
});

test('validateRadarBlocks rejette des args non-objet', () => {
  const v = validateRadarBlocks({ family: 'email', capabilities: { listMessages: { template: 't', args: [1] } } });
  assert.equal(v.ok, false);
  assert.match(v.errors[0], /'args' doit être un objet/);
});

test('validateRadarBlocks valide les entrées watch', () => {
  const badVia = validateRadarBlocks({
    family: 'email',
    capabilities: { listMessages: { template: 't' } },
    watch: [{ entity: 'msg', via: 'getMessage', key: 'id' }],
  });
  assert.equal(badVia.ok, false);
  assert.match(badVia.errors[0], /'via' doit référencer une capacité déclarée/);

  const viaWrite = validateRadarBlocks({
    family: 'email',
    capabilities: { listMessages: { template: 't' }, sendMessage: { template: 't2' } },
    watch: [{ entity: 'msg', via: 'sendMessage', key: 'id' }],
  });
  assert.equal(viaWrite.ok, false);
  assert.match(viaWrite.errors[0], /capacité de lecture/);

  const noKey = validateRadarBlocks({
    family: 'email',
    capabilities: { listMessages: { template: 't' } },
    watch: [{ entity: 'msg', via: 'listMessages' }],
  });
  assert.equal(noKey.ok, false);
  assert.match(noKey.errors[0], /'key' manquant/);
});

test('validateRadarBlocks rejette une famille déclarée deux fois et un bloc vide', () => {
  const dup = validateRadarBlocks([
    { family: 'email', capabilities: { listMessages: { template: 't' } } },
    { family: 'email', capabilities: { getMessage: { template: 't2' } } },
  ]);
  assert.equal(dup.ok, false);
  assert.match(dup.errors[0], /déclarée deux fois/);

  assert.equal(validateRadarBlocks(null).ok, false);
  assert.equal(validateRadarBlocks([]).ok, false);
  assert.equal(validateRadarBlocks({ family: 'email' }).ok, false);
});

test('capabilityKind retourne le kind ou null', () => {
  assert.equal(capabilityKind('email', 'listMessages'), 'read');
  assert.equal(capabilityKind('email', 'sendMessage'), 'write');
  assert.equal(capabilityKind('email', 'inconnu'), null);
  assert.equal(capabilityKind('inconnue', 'listMessages'), null);
});
