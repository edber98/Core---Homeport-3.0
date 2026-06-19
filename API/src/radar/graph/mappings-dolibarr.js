// Mappings Dolibarr déclarés (pilote) — raw → ontologie.
// Champs vérifiés en réel sur dolibarr.c4rbon.group. Ce sont des RadarMapping
// GLOBAUX (workspaceId null) : valent pour tous les workspaces.

const DOLIBARR_MAPPINGS = [
  // Tiers → Party/organization. Rôle client/fournisseur conditionnel.
  {
    providerKey: 'dolibarr', rawEntityType: 'party',
    target: { coreType: 'Party', subtype: 'organization' },
    keyField: 'id', identityFields: ['email'], labelField: 'name',
    fieldMap: { name: 'name', email: 'email', phone: 'phone', identifiers: 'idprof1' },
    roleRules: [
      { field: 'client', equals: '1', role: 'client' },
      { field: 'fournisseur', equals: '1', role: 'supplier' },
    ],
  },
  // Facture client → Transaction/invoice, billed_to → Party
  {
    providerKey: 'dolibarr', rawEntityType: 'customer_invoice',
    target: { coreType: 'Transaction', subtype: 'invoice' },
    keyField: 'id', labelField: 'ref',
    fieldMap: { number: 'ref', amount_total: 'total_ttc', date: 'date', state: 'statut', payment_state: 'paye', lines: 'lines' },
    valueMap: { state: { '0': 'brouillon', '1': 'émise', '2': 'payée', '3': 'annulée' }, payment_state: { '0': 'impayée', '1': 'payée' } },
    relationRules: [
      { type: 'party_of', role: 'billed_to', viaField: 'socid', targetRawType: 'party', targetCoreType: 'Party', targetSubtype: 'organization' },
      // lien natif si la facture a été créée DEPUIS une commande (origin_type=commande)
      { type: 'derived_from', viaField: 'origin_id', targetRawType: 'order', targetCoreType: 'Transaction', targetSubtype: 'order' },
    ],
    lineRules: [{ arrayField: 'lines', viaField: 'fk_product', qtyField: 'qty', labelField: 'product_label', priceField: 'subprice', tvaField: 'tva_tx', totalField: 'total_ttc', type: 'references', role: 'line_item', targetRawType: 'product', targetCoreType: 'Asset', targetSubtype: 'product' }],
  },
  // Facture fournisseur → Transaction/supplier_invoice
  {
    providerKey: 'dolibarr', rawEntityType: 'supplier_invoice',
    target: { coreType: 'Transaction', subtype: 'supplier_invoice' },
    keyField: 'id', labelField: 'ref',
    fieldMap: { number: 'ref', amount_total: 'total_ttc', date: 'date', state: 'statut', payment_state: 'paye', lines: 'lines' },
    relationRules: [{ type: 'party_of', role: 'supplier', viaField: 'socid', targetRawType: 'party', targetCoreType: 'Party', targetSubtype: 'organization' }],
  },
  // Devis → Transaction/quote
  {
    providerKey: 'dolibarr', rawEntityType: 'quote',
    target: { coreType: 'Transaction', subtype: 'quote' },
    keyField: 'id', labelField: 'ref',
    fieldMap: { number: 'ref', amount_total: 'total_ttc', date: 'date', state: 'statut', lines: 'lines' },
    valueMap: { state: { '0': 'brouillon', '1': 'validé', '2': 'signé', '3': 'refusé' } },
    relationRules: [
      { type: 'party_of', role: 'client', viaField: 'socid', targetRawType: 'party', targetCoreType: 'Party', targetSubtype: 'organization' },
      { type: 'part_of', viaField: 'fk_project', targetRawType: 'project', targetCoreType: 'Project', targetSubtype: 'project' },
    ],
    lineRules: [{ arrayField: 'lines', viaField: 'fk_product', qtyField: 'qty', labelField: 'product_label', priceField: 'subprice', tvaField: 'tva_tx', totalField: 'total_ttc', type: 'references', role: 'line_item', targetRawType: 'product', targetCoreType: 'Asset', targetSubtype: 'product' }],
  },
  // Commande → Transaction/order
  {
    providerKey: 'dolibarr', rawEntityType: 'order',
    target: { coreType: 'Transaction', subtype: 'order' },
    keyField: 'id', labelField: 'ref',
    fieldMap: { number: 'ref', amount_total: 'total_ttc', date: 'date', state: 'statut', lines: 'lines' },
    valueMap: { state: { '0': 'brouillon', '1': 'validée', '2': 'en cours', '3': 'livrée', '-1': 'annulée' } },
    relationRules: [
      { type: 'party_of', role: 'client', viaField: 'socid', targetRawType: 'party', targetCoreType: 'Party', targetSubtype: 'organization' },
      { type: 'part_of', viaField: 'fk_project', targetRawType: 'project', targetCoreType: 'Project', targetSubtype: 'project' },
    ],
    lineRules: [{ arrayField: 'lines', viaField: 'fk_product', qtyField: 'qty', labelField: 'product_label', priceField: 'subprice', tvaField: 'tva_tx', totalField: 'total_ttc', type: 'references', role: 'line_item', targetRawType: 'product', targetCoreType: 'Asset', targetSubtype: 'product' }],
  },
  // Projet → Project/project
  {
    providerKey: 'dolibarr', rawEntityType: 'project',
    target: { coreType: 'Project', subtype: 'project' },
    keyField: 'id', labelField: 'title',
    fieldMap: { title: 'title', status: 'statut', startDate: 'date_start' },
    valueMap: { status: { '0': 'brouillon', '1': 'ouvert', '2': 'fermé' } },
    relationRules: [{ type: 'party_of', role: 'client', viaField: 'socid', targetRawType: 'party', targetCoreType: 'Party', targetSubtype: 'organization' }],
  },
  // Tâche → WorkItem/task
  {
    providerKey: 'dolibarr', rawEntityType: 'task',
    target: { coreType: 'WorkItem', subtype: 'task' },
    keyField: 'id', labelField: 'label',
    fieldMap: { title: 'label', status: 'status', dueDate: 'date_end', progress: 'progress' },
    valueMap: { status: { '0': 'à faire', '1': 'en cours', '2': 'terminée' } },
    relationRules: [{ type: 'part_of', viaField: 'fk_project', targetRawType: 'project', targetCoreType: 'Project', targetSubtype: 'project' }],
  },
  // Ticket → WorkItem/ticket
  {
    providerKey: 'dolibarr', rawEntityType: 'ticket',
    target: { coreType: 'WorkItem', subtype: 'ticket' },
    keyField: 'id', labelField: 'subject',
    fieldMap: { title: 'subject', status: 'status', priority: 'severity_code' },
    valueMap: { status: { '0': 'non lu', '1': 'lu', '2': 'assigné', '3': 'en cours', '4': 'en attente', '5': 'résolu', '8': 'fermé', '9': 'annulé' } },
    relationRules: [{ type: 'party_of', role: 'client', viaField: 'fk_soc', targetRawType: 'party', targetCoreType: 'Party', targetSubtype: 'organization' }],
  },
  // Ordre de fabrication → WorkItem/work_order (production)
  {
    providerKey: 'dolibarr', rawEntityType: 'work_order',
    target: { coreType: 'WorkItem', subtype: 'work_order' },
    keyField: 'id', labelField: 'ref',
    fieldMap: { number: 'ref', quantity: 'qty', status: 'status' },
    valueMap: { status: { '0': 'brouillon', '1': 'validé', '2': 'en production', '3': 'fabriqué' } },
    relationRules: [{ type: 'references', viaField: 'fk_product', targetRawType: 'product', targetCoreType: 'Asset', targetSubtype: 'product' }],
  },
  // Ordre de fabrication (MO) → WorkItem/work_order, relié au produit fabriqué
  {
    providerKey: 'dolibarr', rawEntityType: 'mo',
    target: { coreType: 'WorkItem', subtype: 'work_order' },
    keyField: 'id', labelField: 'ref',
    fieldMap: { number: 'ref', quantity: 'qty', status: 'status', startDate: 'date_start_planned' },
    valueMap: { status: { '0': 'brouillon', '1': 'validé', '2': 'en production', '3': 'fabriqué', '9': 'annulé' } },
    relationRules: [
      { type: 'references', role: 'produces', viaField: 'fk_product', targetRawType: 'product', targetCoreType: 'Asset', targetSubtype: 'product' },
      { type: 'derived_from', viaField: 'fk_bom', targetRawType: 'bom', targetCoreType: 'Document', targetSubtype: 'bom' },
      { type: 'part_of', viaField: 'fk_project', targetRawType: 'project', targetCoreType: 'Project', targetSubtype: 'project' },
    ],
  },
  // Produit/article → Asset/product (porte le stock : révèle les ruptures/goulots)
  {
    providerKey: 'dolibarr', rawEntityType: 'product',
    target: { coreType: 'Asset', subtype: 'product' },
    keyField: 'id', labelField: 'label',
    fieldMap: { name: 'label', reference: 'ref', price: 'price', cost_price: 'cost_price', stock: 'stock_reel', type: 'type', status: 'status' },
    valueMap: { type: { '0': 'produit', '1': 'service' }, status: { '0': 'inactif', '1': 'actif' } },
  },
];

/** Insère/maj les mappings déclarés en base (globaux). Idempotent. */
async function seedDolibarrMappings() {
  const RadarMapping = require('../../db/models/radar-mapping.model');
  let n = 0;
  for (const m of DOLIBARR_MAPPINGS) {
    await RadarMapping.updateOne(
      { providerKey: m.providerKey, rawEntityType: m.rawEntityType, workspaceId: null },
      { $set: { ...m, workspaceId: null, learnedBy: 'manual', status: 'active' } },
      { upsert: true }
    );
    n++;
  }
  return n;
}

module.exports = { DOLIBARR_MAPPINGS, seedDolibarrMappings };
