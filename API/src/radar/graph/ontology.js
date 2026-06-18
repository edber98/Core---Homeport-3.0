// Radar — registre d'ontologie (Étage 1 du cerveau).
//
// 8 coreTypes universels + sous-types, avec leurs champs canoniques. C'est LE
// vocabulaire pivot vers lequel tous les logiciels sont mappés. Défini ici en
// données (extensible) ; pourra migrer en collection Mongo plus tard.
//
// Le graphe (RadarEntity/RadarRelation) ne raisonne qu'en coreType/subtype/role,
// jamais en format Odoo/Dolibarr/SAP.

const CORE_TYPES = {
  Party:         { label: 'Acteur', subtypes: ['person', 'organization'] },
  Project:       { label: 'Projet', subtypes: ['project', 'deal', 'repository', 'campaign', 'case'] },
  WorkItem:      { label: 'Travail', subtypes: ['task', 'subtask', 'ticket', 'issue', 'merge_request', 'lead', 'milestone', 'work_order', 'maintenance_order'] },
  Transaction:   { label: 'Transaction', subtypes: ['invoice', 'supplier_invoice', 'payment', 'order', 'quote', 'credit_note', 'expense', 'bank_tx', 'material_movement'] },
  Document:      { label: 'Document', subtypes: ['file', 'attachment', 'contract', 'invoice_pdf', 'report', 'page', 'bom'] },
  Event:         { label: 'Événement', subtypes: ['calendar_event', 'meeting', 'deadline', 'pipeline_run', 'deployment', 'commit', 'absence', 'machine_stop', 'alarm', 'maintenance', 'production_run', 'quality_check'] },
  Communication: { label: 'Communication', subtypes: ['email', 'chat_message', 'comment', 'call', 'note'] },
  Asset:         { label: 'Ressource', subtypes: ['machine', 'equipment', 'sensor', 'production_line', 'product', 'license', 'server', 'folder'] },
  // Mesures haute fréquence (capteurs/production) — stockées en série temporelle
  // (RadarMeasurement), PAS comme nœud du graphe. Un franchissement de seuil crée un Event.
  Measurement:   { label: 'Mesure', subtypes: ['temperature', 'vibration', 'pressure', 'energy', 'piece_count', 'oee', 'humidity', 'level', 'speed'] },
};

// Champs canoniques par sous-type (ceux que le mapping doit remplir). Indicatif :
// un mapping peut remplir un sur-ensemble. Sert à la validation et à l'inférence LLM.
const CANONICAL_FIELDS = {
  'Party.person':            ['name', 'email', 'phone', 'identifiers'],
  'Party.organization':      ['name', 'email', 'phone', 'identifiers', 'address'],
  'Transaction.invoice':     ['number', 'amount_total', 'currency', 'state', 'date', 'payment_state', 'party'],
  'Transaction.supplier_invoice': ['number', 'amount_total', 'currency', 'state', 'date', 'payment_state', 'party'],
  'Transaction.payment':     ['number', 'amount_total', 'currency', 'date', 'party'],
  'Transaction.order':       ['number', 'amount_total', 'currency', 'state', 'date', 'party'],
  'Transaction.quote':       ['number', 'amount_total', 'currency', 'state', 'date', 'party'],
  'Project.project':         ['title', 'status', 'owner', 'startDate', 'dueDate'],
  'WorkItem.task':           ['title', 'status', 'assignee', 'dueDate', 'project'],
  'WorkItem.ticket':         ['title', 'status', 'priority', 'party'],
  'WorkItem.work_order':     ['number', 'product', 'quantity', 'status', 'dueDate'],
  'Document.bom':            ['name', 'product', 'quantity', 'status'],
  'Asset.product':           ['name', 'type', 'price', 'status'],
  'Event.calendar_event':    ['title', 'start', 'end', 'allDay', 'status'],
  'Communication.email':     ['from', 'to', 'subject', 'snippet', 'sentAt'],
};

// Vocabulaire fermé des relations (qualifiées par un rôle optionnel).
const RELATION_TYPES = [
  'party_of', 'part_of', 'child_of', 'derived_from', 'attached_to',
  'references', 'relates_to', 'assigned_to', 'scheduled_for', 'mentions',
  'blocks', 'depends_on', 'located_in',
];

// Libellés FR des relations (pour l'UI). Accents requis.
const RELATION_LABELS = {
  party_of: 'acteur', part_of: 'fait partie de', child_of: 'rattaché à',
  derived_from: 'issu de', attached_to: 'joint à', references: 'référence',
  relates_to: 'lié à', assigned_to: 'assigné à', scheduled_for: 'planifié pour',
  mentions: 'mentionne', blocks: 'bloque', depends_on: 'dépend de', located_in: 'situé dans',
};

// Rôles applicables aux entités (multi) et aux relations party_of.
const ROLES = [
  'client', 'supplier', 'prospect', 'employee', 'partner', 'contact',
  'author', 'assignee', 'attendee', 'owner', 'user', 'billed_to', 'caller',
];

// Libellés FR des rôles (pour l'UI). Accents requis.
const ROLE_LABELS = {
  client: 'Client', supplier: 'Fournisseur', prospect: 'Prospect', employee: 'Salarié',
  partner: 'Partenaire', contact: 'Contact', author: 'Auteur', assignee: 'Assigné',
  attendee: 'Participant', owner: 'Responsable', user: 'Utilisateur',
  billed_to: 'Facturé à', caller: 'Appelant',
};

const CORE_TYPE_KEYS = Object.keys(CORE_TYPES);

/** Le coreType fait-il partie du squelette universel FERMÉ (9 types) ? */
function isValidCoreType(coreType) { return !!CORE_TYPES[coreType]; }

/** Le sous-type est-il un sous-type CONNU (hardcodé) de ce coreType ? */
function isKnownSubtype(coreType, subtype) {
  const ct = CORE_TYPES[coreType];
  return !!ct && (subtype == null || ct.subtypes.includes(subtype));
}

/** Le couple (coreType, subtype) est-il valide ? (strict : sous-types hardcodés)
 *  Les SOUS-TYPES sont en réalité OUVERTS et spécifiques au domaine (le LLM peut en
 *  créer, ajoutés au registre RadarOntologyType). La validation structurelle porte
 *  sur le coreType (fermé) ; isValidType reste strict pour les mappings DÉCLARÉS. */
function isValidType(coreType, subtype) {
  const ct = CORE_TYPES[coreType];
  if (!ct) return false;
  if (subtype == null) return true;
  return ct.subtypes.includes(subtype);
}

/** Champs canoniques attendus pour un sous-type (vide si non spécifié). */
function canonicalFields(coreType, subtype) {
  return CANONICAL_FIELDS[`${coreType}.${subtype}`] || [];
}

function isValidRelation(type) { return RELATION_TYPES.includes(type); }
function isValidRole(role) { return ROLES.includes(role); }
function relationLabel(type) { return RELATION_LABELS[type] || type; }
function roleLabel(role) { return ROLE_LABELS[role] || role; }

module.exports = {
  CORE_TYPES, CORE_TYPE_KEYS, CANONICAL_FIELDS, RELATION_TYPES, RELATION_LABELS, ROLES, ROLE_LABELS,
  isValidType, isValidCoreType, isKnownSubtype, canonicalFields, isValidRelation, isValidRole, relationLabel, roleLabel,
};
