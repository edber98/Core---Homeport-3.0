// Seed du registre RadarOntologyType depuis ontology.js (source de vérité unique).
// Idempotent : ré-exécutable sans doublon. Les sous-types vivent dans le code
// (ontology.js) pour la validation pure ; le registre les expose en base pour
// l'UI, l'extension à chaud (sous-types métier par workspace) et l'inférence LLM.

const ont = require('./ontology');

// Libellés FR par sous-type (fallback : le sous-type brut). Accents requis.
const LABELS = {
  person: 'Personne', organization: 'Organisation',
  project: 'Projet', deal: 'Affaire', repository: 'Dépôt', campaign: 'Campagne', case: 'Dossier',
  task: 'Tâche', subtask: 'Sous-tâche', ticket: 'Ticket', issue: 'Incident',
  merge_request: 'Merge request', lead: 'Piste', milestone: 'Jalon',
  work_order: 'Ordre de fabrication', maintenance_order: 'Ordre de maintenance',
  invoice: 'Facture', supplier_invoice: 'Facture fournisseur', payment: 'Paiement',
  order: 'Commande', quote: 'Devis', credit_note: 'Avoir', expense: 'Dépense',
  bank_tx: 'Mouvement bancaire', material_movement: 'Mouvement de matière',
  file: 'Fichier', attachment: 'Pièce jointe', contract: 'Contrat',
  invoice_pdf: 'Facture (PDF)', report: 'Rapport', page: 'Page', bom: 'Nomenclature',
  calendar_event: 'Événement', meeting: 'Réunion', deadline: 'Échéance',
  pipeline_run: 'Exécution de pipeline', deployment: 'Déploiement', commit: 'Commit',
  absence: 'Absence', machine_stop: 'Arrêt machine', alarm: 'Alarme',
  maintenance: 'Maintenance', production_run: 'Série de production', quality_check: 'Contrôle qualité',
  email: 'Email', chat_message: 'Message', comment: 'Commentaire', call: 'Appel', note: 'Note',
  machine: 'Machine', equipment: 'Équipement', sensor: 'Capteur',
  production_line: 'Ligne de production', product: 'Produit', license: 'Licence',
  server: 'Serveur', folder: 'Dossier',
};

// Catégorie (famille radar) indicative par sous-type. Indicatif : un sous-type
// peut être alimenté par plusieurs familles ; on garde la plus naturelle.
const CATEGORY = {
  person: 'crm', organization: 'crm', deal: 'crm', lead: 'crm', prospect: 'crm',
  project: 'productivity', task: 'productivity', subtask: 'productivity', milestone: 'productivity',
  repository: 'devops', merge_request: 'devops', issue: 'devops', pipeline_run: 'devops',
  deployment: 'devops', commit: 'devops',
  invoice: 'accounting', supplier_invoice: 'accounting', payment: 'accounting',
  order: 'accounting', quote: 'crm', credit_note: 'accounting', expense: 'accounting',
  bank_tx: 'accounting', material_movement: 'industry',
  file: 'storage', attachment: 'email', contract: 'storage', invoice_pdf: 'storage',
  report: 'storage', page: 'productivity', bom: 'industry',
  calendar_event: 'calendar', meeting: 'calendar', deadline: 'calendar',
  absence: 'hr', machine_stop: 'industry', alarm: 'industry', maintenance: 'industry',
  production_run: 'industry', quality_check: 'industry',
  work_order: 'industry', maintenance_order: 'industry',
  email: 'email', chat_message: 'communication', comment: 'communication',
  call: 'telephony', note: 'productivity',
  ticket: 'support', campaign: 'marketing', case: 'support',
  machine: 'industry', equipment: 'industry', sensor: 'industry',
  production_line: 'industry', product: 'ecommerce', license: 'monitoring',
  server: 'monitoring', folder: 'storage',
};

/** Construit la liste des lignes de registre depuis ontology.js. Pure. */
function buildOntologyRows() {
  const rows = [];
  for (const coreType of ont.CORE_TYPE_KEYS) {
    const def = ont.CORE_TYPES[coreType];
    for (const subtype of def.subtypes) {
      const fieldNames = ont.canonicalFields(coreType, subtype);
      rows.push({
        key: `${coreType}.${subtype}`.toLowerCase(),
        coreType,
        subtype,
        label: LABELS[subtype] || subtype,
        canonicalFields: fieldNames.map(name => ({ name, type: 'string', required: false })),
        category: CATEGORY[subtype] || null,
        source: 'seed',
        status: 'active',
        workspaceId: null,
      });
    }
  }
  return rows;
}

/** Upsert idempotent des types globaux. Retourne le nombre de types seedés. */
async function seedOntologyTypes() {
  const RadarOntologyType = require('../../db/models/radar-ontology-type.model');
  const rows = buildOntologyRows();
  for (const row of rows) {
    await RadarOntologyType.updateOne(
      { key: row.key, workspaceId: null },
      { $set: row },
      { upsert: true }
    );
  }
  return rows.length;
}

module.exports = { buildOntologyRows, seedOntologyTypes, LABELS, CATEGORY };
