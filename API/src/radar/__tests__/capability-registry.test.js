// Tests de la résolution des capacités (parties pures, sans DB) et des
// garde-fous d'execCapability qui s'exécutent avant tout accès Mongo.

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  resolveCapabilityMapping,
  listAvailableCapabilities,
  listWatchSpecs,
  execCapability,
} = require('../capability-registry');

const PROVIDER_RADAR = [
  {
    family: 'accounting',
    capabilities: {
      listSupplierInvoices: { template: 'odoo_invoices_list', args: { move_type: 'in_invoice', limit: 100 } },
      listCustomerInvoices: { template: 'odoo_invoices_list', args: { move_type: 'out_invoice' } },
      createDraftInvoice: { template: 'odoo_invoice_create' },
    },
    watch: [{ entity: 'supplier_invoice', via: 'listSupplierInvoices', key: 'id' }],
  },
  {
    family: 'crm',
    capabilities: { listOpportunities: { template: 'odoo_leads_list' } },
  },
];

test('resolveCapabilityMapping résout depuis le bloc radar du provider', () => {
  const m = resolveCapabilityMapping({ providerRadar: PROVIDER_RADAR, family: 'accounting', capability: 'listSupplierInvoices' });
  assert.deepEqual(m, { template: 'odoo_invoices_list', args: { move_type: 'in_invoice', limit: 100 } });
});

test('resolveCapabilityMapping priorise les overrides du connecteur', () => {
  const m = resolveCapabilityMapping({
    providerRadar: PROVIDER_RADAR,
    capabilityOverrides: { listSupplierInvoices: { template: 'custom_tmpl', args: { foo: 1 } } },
    family: 'accounting',
    capability: 'listSupplierInvoices',
  });
  assert.deepEqual(m, { template: 'custom_tmpl', args: { foo: 1 } });
});

test('resolveCapabilityMapping permet un mapping par overrides sans bloc radar provider', () => {
  const m = resolveCapabilityMapping({
    providerRadar: null,
    capabilityOverrides: { listMessages: { template: 'imap_list' } },
    family: 'email',
    capability: 'listMessages',
  });
  assert.deepEqual(m, { template: 'imap_list', args: {} });
});

test('resolveCapabilityMapping retourne null si non mappé ou hors contrat', () => {
  assert.equal(resolveCapabilityMapping({ providerRadar: PROVIDER_RADAR, family: 'accounting', capability: 'listPayments' }), null);
  assert.equal(resolveCapabilityMapping({ providerRadar: PROVIDER_RADAR, family: 'email', capability: 'listMessages' }), null);
  assert.equal(resolveCapabilityMapping({ providerRadar: PROVIDER_RADAR, family: 'accounting', capability: 'inexistante' }), null);
  assert.equal(resolveCapabilityMapping({ providerRadar: PROVIDER_RADAR, family: 'inconnue', capability: 'listSupplierInvoices' }), null);
});

test('resolveCapabilityMapping copie les args (pas de mutation du manifest)', () => {
  const m = resolveCapabilityMapping({ providerRadar: PROVIDER_RADAR, family: 'accounting', capability: 'listSupplierInvoices' });
  m.args.limit = 1;
  assert.equal(PROVIDER_RADAR[0].capabilities.listSupplierInvoices.args.limit, 100);
});

test('listAvailableCapabilities retourne les capacités mappées avec kind et description', () => {
  const caps = listAvailableCapabilities({ providerRadar: PROVIDER_RADAR, family: 'accounting' });
  const names = caps.map(c => c.capability).sort();
  assert.deepEqual(names, ['createDraftInvoice', 'listCustomerInvoices', 'listSupplierInvoices']);
  const create = caps.find(c => c.capability === 'createDraftInvoice');
  assert.equal(create.kind, 'write');
  assert.ok(create.description);
  assert.deepEqual(listAvailableCapabilities({ providerRadar: PROVIDER_RADAR, family: 'storage' }), []);
  assert.deepEqual(listAvailableCapabilities({ providerRadar: null, family: 'inconnue' }), []);
});

test('listWatchSpecs retourne les entrées watch de la famille', () => {
  assert.equal(listWatchSpecs({ providerRadar: PROVIDER_RADAR, family: 'accounting' }).length, 1);
  assert.deepEqual(listWatchSpecs({ providerRadar: PROVIDER_RADAR, family: 'crm' }), []);
});

// Garde-fous d'execCapability évalués avant tout accès DB

test('execCapability refuse un connecteur manquant', async () => {
  const out = await execCapability({ connector: null, capability: 'listMessages' });
  assert.deepEqual(out, { ok: false, error: 'connector_missing' });
});

test('execCapability refuse une capacité hors contrat', async () => {
  const out = await execCapability({ connector: { family: 'email', providerKey: 'gmail' }, capability: 'listInvoices' });
  assert.equal(out.ok, false);
  assert.match(out.error, /capability_unknown/);
});

test('execCapability refuse une capacité write sans allowWrite', async () => {
  const out = await execCapability({ connector: { family: 'email', providerKey: 'gmail' }, capability: 'sendMessage' });
  assert.deepEqual(out, { ok: false, error: 'write_capability_requires_approval' });
});
