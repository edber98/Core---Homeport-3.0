// Radar — familles de connecteurs et contrat sémantique.
//
// Une famille définit CE QUE le radar peut demander (capacités), indépendamment
// du logiciel concret. Chaque provider déclare dans son manifest un bloc `radar`
// qui mappe les capacités de sa famille vers ses NodeTemplates réels.
//
// Bloc manifest (sur une entrée de `providers`) :
//   "radar": [{
//     "family": "accounting",
//     "capabilities": {
//       "listSupplierInvoices": { "template": "odoo_invoices_list", "args": { "move_type": "in_invoice" } }
//     },
//     "watch": [
//       { "entity": "supplier_invoice", "via": "listSupplierInvoices", "key": "id", "hashFields": ["state","amount_total"] }
//     ]
//   }]
// `radar` accepte un objet seul ou un tableau (un provider peut servir plusieurs familles).

const FAMILIES = {
  storage: {
    label: 'Stockage & fichiers',
    description: 'Drive, GED, serveurs de fichiers — arborescence, documents, archivage.',
    capabilities: {
      listTree:     { kind: 'read',  description: 'Lister les fichiers et dossiers d\'un chemin' },
      readFile:     { kind: 'read',  description: 'Télécharger / lire le contenu d\'un fichier' },
      searchFiles:  { kind: 'read',  description: 'Rechercher des fichiers par nom ou contenu' },
      moveFile:     { kind: 'write', description: 'Déplacer ou renommer un fichier' },
      uploadFile:   { kind: 'write', description: 'Téléverser un fichier' },
      createFolder: { kind: 'write', description: 'Créer un dossier' },
    },
    testCapability: 'listTree',
  },
  email: {
    label: 'Email',
    description: 'Boîtes mail — messages, pièces jointes, brouillons.',
    capabilities: {
      listMessages:   { kind: 'read',  description: 'Lister les messages (filtre / depuis une date)' },
      getMessage:     { kind: 'read',  description: 'Récupérer le contenu complet d\'un message' },
      getAttachments: { kind: 'read',  description: 'Récupérer les pièces jointes d\'un message' },
      createDraft:    { kind: 'write', description: 'Créer un brouillon de réponse' },
      sendMessage:    { kind: 'write', description: 'Envoyer un message' },
    },
    testCapability: 'listMessages',
  },
  accounting: {
    label: 'Comptabilité & facturation',
    description: 'Factures clients/fournisseurs, paiements, bons de commande, trésorerie.',
    capabilities: {
      listSupplierInvoices: { kind: 'read',  description: 'Lister les factures fournisseurs' },
      listCustomerInvoices: { kind: 'read',  description: 'Lister les factures clients' },
      listPayments:         { kind: 'read',  description: 'Lister les paiements / encaissements' },
      listPurchaseOrders:   { kind: 'read',  description: 'Lister les bons de commande' },
      createDraftInvoice:   { kind: 'write', description: 'Créer une facture en brouillon' },
    },
    testCapability: 'listCustomerInvoices',
  },
  crm: {
    label: 'CRM & ventes',
    description: 'Opportunités, devis, activité commerciale.',
    capabilities: {
      listOpportunities: { kind: 'read',  description: 'Lister les opportunités / leads' },
      listQuotes:        { kind: 'read',  description: 'Lister les devis (avec statut)' },
      listContacts:      { kind: 'read',  description: 'Lister les tiers / contacts (organisations, clients, fournisseurs)' },
      listContactPersons:{ kind: 'read',  description: 'Lister les contacts PERSONNES (interlocuteurs des tiers)' },
      listSalesOrders:   { kind: 'read',  description: 'Lister les commandes clients' },
      createOpportunity: { kind: 'write', description: 'Créer une opportunité' },
    },
    testCapability: 'listOpportunities',
  },
  catalog: {
    label: 'Catalogue & stock',
    description: 'Produits, articles, prestations de service, niveaux de stock — ERP, e-commerce, PIM.',
    capabilities: {
      listProducts:       { kind: 'read', description: 'Lister les produits / articles / services (avec stock)' },
      listStockMovements: { kind: 'read', description: 'Lister les mouvements de stock' },
    },
    testCapability: 'listProducts',
  },
  productivity: {
    label: 'Productivité & tâches',
    description: 'Gestion de tâches et de projets — Trello, Notion, ClickUp…',
    capabilities: {
      listTasks:    { kind: 'read',  description: 'Lister les tâches (filtre, retard)' },
      listProjects: { kind: 'read',  description: 'Lister les projets' },
      createTask:   { kind: 'write', description: 'Créer une tâche' },
    },
    testCapability: 'listTasks',
  },
  calendar: {
    label: 'Agenda',
    description: 'Événements, échéances, disponibilités.',
    capabilities: {
      listEvents:  { kind: 'read',  description: 'Lister les événements d\'une période' },
      createEvent: { kind: 'write', description: 'Créer un événement' },
    },
    testCapability: 'listEvents',
  },
  communication: {
    label: 'Communication d\'équipe',
    description: 'Slack, Teams, messagerie interne — canaux, messages, réunions.',
    capabilities: {
      listChannels:   { kind: 'read',  description: 'Lister les canaux / conversations' },
      searchMessages: { kind: 'read',  description: 'Rechercher des messages' },
      postMessage:    { kind: 'write', description: 'Publier un message' },
    },
    testCapability: 'listChannels',
  },
  support: {
    label: 'Support client',
    description: 'Tickets, réclamations, conversations clients — Zendesk, Freshdesk, helpdesk ERP.',
    capabilities: {
      listTickets: { kind: 'read',  description: 'Lister les tickets / conversations clients' },
      getTicket:   { kind: 'read',  description: 'Récupérer le détail d\'un ticket' },
      createTicket: { kind: 'write', description: 'Créer un ticket' },
      replyTicket: { kind: 'write', description: 'Répondre à un ticket' },
    },
    testCapability: 'listTickets',
  },
  hr: {
    label: 'Ressources humaines',
    description: 'Salariés, absences, contrats.',
    capabilities: {
      listEmployees: { kind: 'read', description: 'Lister les salariés' },
      listAbsences:  { kind: 'read', description: 'Lister les absences' },
    },
    testCapability: 'listEmployees',
  },
  monitoring: {
    label: 'Surveillance technique',
    description: 'Connexions, serveurs, anomalies de sécurité.',
    capabilities: {
      listLoginEvents: { kind: 'read', description: 'Lister les événements de connexion' },
      listAnomalies:   { kind: 'read', description: 'Lister les anomalies détectées' },
    },
    testCapability: 'listAnomalies',
  },
  industry: {
    label: 'Production & industrie',
    description: 'MES / production : ordres de fabrication, machines, arrêts, maintenance, capteurs (SAP PP/PM, MES, IoT).',
    capabilities: {
      listProductionOrders: { kind: 'read', description: 'Lister les ordres de fabrication (OF)' },
      listMachines:         { kind: 'read', description: 'Lister les machines / équipements' },
      listDowntimes:        { kind: 'read', description: 'Lister les arrêts machine / pannes' },
      listMaintenanceOrders:{ kind: 'read', description: 'Lister les ordres de maintenance' },
      listSensorReadings:   { kind: 'read', description: 'Lire les relevés capteurs (séries temporelles)' },
    },
    testCapability: 'listProductionOrders',
  },
  database: {
    label: 'Base de données',
    description: 'Connexion directe à une base (MongoDB, MariaDB, PostgreSQL…) pour les logiciels sans API — le Radar analyse les collections/tables et en déduit les catégories.',
    capabilities: {
      listCollections: { kind: 'read', description: 'Lister les collections / tables' },
      queryCollection: { kind: 'read', description: 'Lire les documents / lignes d\'une collection' },
    },
    testCapability: 'listCollections',
  },
};

const FAMILY_KEYS = Object.keys(FAMILIES);

/** Normalise un bloc radar de manifest (objet seul ou tableau) en tableau. */
function normalizeRadarBlocks(radar) {
  if (!radar) return [];
  return Array.isArray(radar) ? radar.filter(Boolean) : [radar];
}

/**
 * Valide un bloc radar (objet seul ou tableau de blocs).
 * @param {object|Array} radar - bloc(s) radar du manifest
 * @param {object} [opts]
 * @param {Set<string>|Array<string>} [opts.templateKeys] - clés de templates connues ;
 *   si fourni, chaque capacité doit pointer vers un template existant.
 * @returns {{ ok: boolean, errors: string[] }}
 */
function validateRadarBlocks(radar, opts = {}) {
  const errors = [];
  const blocks = normalizeRadarBlocks(radar);
  const templateKeys = opts.templateKeys ? new Set([...opts.templateKeys]) : null;

  if (!blocks.length) return { ok: false, errors: ['bloc radar vide'] };

  const seenFamilies = new Set();
  blocks.forEach((block, i) => {
    const at = `radar[${i}]`;
    if (!block || typeof block !== 'object') { errors.push(`${at}: bloc invalide`); return; }
    const family = block.family;
    if (!family || !FAMILIES[family]) {
      errors.push(`${at}: famille inconnue '${family}' (attendu: ${FAMILY_KEYS.join(', ')})`);
      return;
    }
    if (seenFamilies.has(family)) errors.push(`${at}: famille '${family}' déclarée deux fois`);
    seenFamilies.add(family);

    const contract = FAMILIES[family].capabilities;
    const caps = block.capabilities;
    if (!caps || typeof caps !== 'object' || !Object.keys(caps).length) {
      errors.push(`${at}: aucune capacité déclarée`);
      return;
    }
    for (const [capName, spec] of Object.entries(caps)) {
      if (!contract[capName]) {
        errors.push(`${at}: capacité '${capName}' hors contrat de la famille '${family}' (attendu: ${Object.keys(contract).join(', ')})`);
        continue;
      }
      if (!spec || typeof spec !== 'object' || !spec.template || typeof spec.template !== 'string') {
        errors.push(`${at}.${capName}: 'template' manquant`);
        continue;
      }
      if (templateKeys && !templateKeys.has(spec.template)) {
        errors.push(`${at}.${capName}: template inconnu '${spec.template}'`);
      }
      if (spec.args != null && (typeof spec.args !== 'object' || Array.isArray(spec.args))) {
        errors.push(`${at}.${capName}: 'args' doit être un objet`);
      }
    }

    for (const [j, w] of (block.watch || []).entries()) {
      const wat = `${at}.watch[${j}]`;
      if (!w || typeof w !== 'object') { errors.push(`${wat}: entrée invalide`); continue; }
      if (!w.entity || typeof w.entity !== 'string') errors.push(`${wat}: 'entity' manquant`);
      if (!w.via || !caps[w.via]) errors.push(`${wat}: 'via' doit référencer une capacité déclarée (reçu: '${w.via}')`);
      else if (contract[w.via] && contract[w.via].kind !== 'read') errors.push(`${wat}: 'via' doit être une capacité de lecture`);
      if (!w.key || typeof w.key !== 'string') errors.push(`${wat}: 'key' manquant (champ identifiant stable)`);
      if (w.hashFields != null && !Array.isArray(w.hashFields)) errors.push(`${wat}: 'hashFields' doit être un tableau`);
    }
  });

  return { ok: errors.length === 0, errors };
}

/** Retourne le kind ('read'|'write') d'une capacité, ou null si hors contrat. */
function capabilityKind(family, capability) {
  return FAMILIES[family]?.capabilities?.[capability]?.kind || null;
}

module.exports = { FAMILIES, FAMILY_KEYS, normalizeRadarBlocks, validateRadarBlocks, capabilityKind };
