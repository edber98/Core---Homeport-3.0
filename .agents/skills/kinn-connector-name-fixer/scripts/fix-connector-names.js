#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function toSnake(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function toCamel(value) {
  const s = toSnake(value);
  return s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
}

function parseArgs(argv) {
  const options = {
    dryRun: false
  };
  const positional = [];

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith('--')) {
      positional.push(a);
      continue;
    }
    if (a === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    throw new Error(`Option inconnue: ${a}`);
  }

  if (!positional.length) throw new Error('Nom du connecteur manquant.');
  options.connector = positional[0];
  return options;
}

const STOPWORDS = new Set([
  'a', 'an', 'the', 'to', 'for', 'of', 'on', 'in', 'at', 'by', 'with', 'into', 'from', 'as', 'is',
  'be', 'or', 'and', 'this', 'that', 'these', 'those', 'all', 'many', 'one', 'two', 'three',
  'up', 'via', 'using', 'use', 'post', 'put', 'patch',
  'api', 'apis', 'docs', 'doc', 'reference', 'endpoint', 'endpoints', 'request', 'response',
  'http', 'https', 'v1', 'v2', 'v3', 'v4'
]);

const VERB_TRANSLATIONS = new Map([
  ['list', 'Lister'],
  ['search', 'Rechercher'],
  ['find', 'Rechercher'],
  ['get', 'Récupérer'],
  ['read', 'Lire'],
  ['create', 'Créer'],
  ['update', 'Mettre à jour'],
  ['delete', 'Supprimer'],
  ['remove', 'Retirer'],
  ['archive', 'Archiver'],
  ['restore', 'Restaurer'],
  ['upsert', 'Mettre à jour ou créer'],
  ['publish', 'Publier'],
  ['unpublish', 'Dépublier'],
  ['assign', 'Assigner'],
  ['move', 'Déplacer'],
  ['send', 'Envoyer'],
  ['trigger', 'Déclencher'],
  ['run', 'Exécuter'],
  ['execute', 'Exécuter'],
  ['deploy', 'Déployer'],
  ['cancel', 'Annuler'],
  ['retry', 'Relancer'],
  ['approve', 'Approuver'],
  ['reject', 'Rejeter'],
  ['query', 'Interroger'],
  ['pause', 'Mettre en pause'],
  ['resume', 'Reprendre'],
  ['activate', 'Activer'],
  ['deactivate', 'Désactiver'],
  ['tag', 'Taguer'],
  ['comment', 'Commenter'],
  ['webhook', 'Gérer webhook'],
  ['mark', 'Marquer'],
  ['attach', 'Associer'],
  ['detach', 'Dissocier'],
  ['save', 'Enregistrer'],
  ['enrich', 'Enrichir'],
  ['download', 'Télécharger'],
  ['upload', 'Téléverser'],
  ['submit', 'Soumettre'],
  ['start', 'Démarrer'],
  ['stop', 'Arrêter'],
  ['enable', 'Activer'],
  ['disable', 'Désactiver'],
  ['sign', 'Signer'],
  ['validate', 'Valider'],
  ['close', 'Fermer'],
  ['open', 'Ouvrir'],
  ['show', 'Afficher'],
  ['retrieve', 'Récupérer'],
  ['add', 'Ajouter']
]);

const STRONG_VERBS = new Set([
  'list', 'search', 'find', 'get', 'read', 'create', 'update', 'delete', 'remove', 'archive', 'restore',
  'upsert', 'publish', 'unpublish', 'assign', 'move', 'send', 'trigger', 'run', 'execute', 'deploy',
  'cancel', 'retry', 'approve', 'reject', 'query', 'pause', 'resume', 'activate', 'deactivate', 'mark',
  'attach', 'detach', 'save', 'enrich', 'download', 'upload', 'submit', 'start', 'stop', 'enable',
  'disable', 'sign', 'validate', 'close', 'open', 'show', 'retrieve', 'add'
]);

const VERB_PRIORITIES = new Map([
  ['delete', 120],
  ['remove', 120],
  ['update', 120],
  ['create', 120],
  ['get', 120],
  ['read', 120],
  ['list', 120],
  ['search', 120],
  ['find', 120],
  ['upsert', 120],
  ['archive', 110],
  ['restore', 110],
  ['deactivate', 130],
  ['activate', 130],
  ['pause', 110],
  ['resume', 110],
  ['send', 100],
  ['assign', 100],
  ['move', 100],
  ['trigger', 100],
  ['run', 100],
  ['execute', 100],
  ['deploy', 100],
  ['cancel', 100],
  ['retry', 100],
  ['approve', 100],
  ['reject', 100],
  ['query', 100],
  ['mark', 90],
  ['attach', 90],
  ['detach', 90],
  ['save', 90],
  ['enrich', 90],
  ['download', 100],
  ['upload', 100],
  ['submit', 90],
  ['start', 100],
  ['stop', 100],
  ['enable', 120],
  ['disable', 120],
  ['sign', 90],
  ['validate', 90],
  ['close', 90],
  ['open', 90],
  ['show', 100],
  ['retrieve', 100],
  ['add', 100],
  ['tag', 70],
  ['comment', 70],
  ['webhook', 60]
]);

const WORD_TRANSLATIONS = new Map([
  ['in', 'Entrée'],
  ['success', 'Succès'],
  ['error', 'Erreur'],
  ['received', 'Reçu'],
  ['utility', 'Utilitaire'],
  ['utilities', 'Utilitaires'],
  ['child', 'enfant'],
  ['children', 'enfants'],
  ['page', 'page'],
  ['pages', 'pages'],
  ['database', 'base de données'],
  ['databases', 'bases de données'],
  ['block', 'bloc'],
  ['blocks', 'blocs'],
  ['user', 'utilisateur'],
  ['users', 'utilisateurs'],
  ['comment', 'commentaire'],
  ['comments', 'commentaires'],
  ['thread', 'fil'],
  ['threads', 'fils'],
  ['record', 'enregistrement'],
  ['records', 'enregistrements'],
  ['entry', 'entrée'],
  ['entries', 'entrées'],
  ['value', 'valeur'],
  ['values', 'valeurs'],
  ['view', 'vue'],
  ['views', 'vues'],
  ['property', 'propriété'],
  ['properties', 'propriétés'],
  ['event', 'événement'],
  ['events', 'événements'],
  ['get', 'récupération'],
  ['list', 'liste'],
  ['create', 'création'],
  ['update', 'mise à jour'],
  ['delete', 'suppression'],
  ['search', 'recherche'],
  ['incoming', 'entrant'],
  ['current', 'actuel'],
  ['result', 'résultat'],
  ['results', 'résultats'],
  ['webhook', 'webhook'],
  ['webhooks', 'webhooks'],
  ['contact', 'contact'],
  ['contacts', 'contacts'],
  ['lead', 'prospect'],
  ['leads', 'prospects'],
  ['campaign', 'campagne'],
  ['campaigns', 'campagnes'],
  ['company', 'entreprise'],
  ['companies', 'entreprises'],
  ['conversation', 'conversation'],
  ['conversations', 'conversations'],
  ['transcription', 'transcription'],
  ['transcriptions', 'transcriptions'],
  ['message', 'message'],
  ['messages', 'messages'],
  ['call', 'appel'],
  ['calls', 'appels'],
  ['activity', 'activité'],
  ['activities', 'activités'],
  ['bulk', 'lot'],
  ['tier', 'palier'],
  ['tiers', 'paliers'],
  ['index', 'liste'],
  ['add', 'ajout'],
  ['data', 'données'],
  ['recording', 'enregistrement'],
  ['recordings', 'enregistrements'],
  ['registration', 'inscription'],
  ['registrations', 'inscriptions'],
  ['competitor', 'concurrent'],
  ['competitors', 'concurrents'],
  ['calendar', 'calendrier'],
  ['calendars', 'calendriers'],
  ['metadata', 'métadonnées'],
  ['info', 'information'],
  ['information', 'information'],
  ['tag', 'tag'],
  ['tags', 'tags'],
  ['completion', 'complétion'],
  ['completions', 'complétions'],
  ['memory', 'mémoire'],
  ['memories', 'mémoires'],
  ['metric', 'métrique'],
  ['metrics', 'métriques'],
  ['analytic', 'analytique'],
  ['analytics', 'analytiques'],
  ['background', 'arrière-plan'],
  ['mapping', 'correspondance'],
  ['mappings', 'correspondances'],
  ['enrichment', 'enrichissement'],
  ['enrichments', 'enrichissements'],
  ['associated', 'associé'],
  ['autoscaling', 'mise à l\'échelle automatique'],
  ['availability', 'disponibilité'],
  ['unsubscribed', 'désinscrit'],
  ['access', 'accès'],
  ['token', 'jeton'],
  ['tokens', 'jetons'],
  ['refresh', 'rafraîchissement'],
  ['timeout', 'délai d\'attente'],
  ['network', 'réseau'],
  ['connect', 'connexion'],
  ['pause', 'pause'],
  ['playbook', 'playbook'],
  ['chainlet', 'chainlet'],
  ['chain', 'chaîne'],
  ['weight', 'poids'],
  ['latest', 'dernier'],
  ['wise', 'wise'],
  ['status', 'statut'],
  ['stats', 'statistiques'],
  ['overall', 'global'],
  ['daily', 'quotidien'],
  ['activate', 'activation'],
  ['activates', 'activations'],
  ['deactivate', 'désactivation'],
  ['deactivates', 'désactivations'],
  ['pause', 'pause'],
  ['pauses', 'pauses'],
  ['resume', 'reprise'],
  ['resumes', 'reprises'],
  ['create', 'création'],
  ['creates', 'créations'],
  ['save', 'sauvegarde'],
  ['saves', 'sauvegardes'],
  ['production', 'production'],
  ['deployment', 'déploiement'],
  ['deployments', 'déploiements'],
  ['development', 'développement'],
  ['developments', 'développements'],
  ['download', 'téléchargement'],
  ['downloads', 'téléchargements'],
  ['upload', 'téléversement'],
  ['uploads', 'téléversements'],
  ['file', 'fichier'],
  ['files', 'fichiers'],
  ['url', 'URL'],
  ['uri', 'URI'],
  ['auth', 'authentification'],
  ['code', 'code'],
  ['codes', 'codes'],
  ['training', 'entraînement'],
  ['trainer', 'entraîneur'],
  ['batch', 'lot'],
  ['batches', 'lots'],
  ['checkpoint', 'point de contrôle'],
  ['checkpoints', 'points de contrôle'],
  ['loop', 'boucle'],
  ['loops', 'boucles'],
  ['model', 'modèle'],
  ['models', 'modèles'],
  ['job', 'tâche'],
  ['jobs', 'tâches'],
  ['server', 'serveur'],
  ['servers', 'serveurs'],
  ['capability', 'capacité'],
  ['capabilities', 'capacités'],
  ['credential', 'identifiant'],
  ['credentials', 'identifiants'],
  ['snapshot', 'instantané'],
  ['snapshots', 'instantanés'],
  ['sampler', 'échantillonneur'],
  ['samplers', 'échantillonneurs'],
  ['queue', 'file'],
  ['queues', 'files'],
  ['session', 'session'],
  ['sessions', 'sessions'],
  ['interactive', 'interactive'],
  ['audio', 'audio'],
  ['speech', 'parole'],
  ['log', 'journal'],
  ['logs', 'journaux'],
  ['blob', 'blob'],
  ['environment', 'environnement'],
  ['health', 'santé'],
  ['filter', 'filtre'],
  ['filters', 'filtres'],
  ['member', 'membre'],
  ['members', 'membres'],
  ['project', 'projet'],
  ['projects', 'projets'],
  ['new', 'nouveau'],
  ['bis', 'base'],
  ['llm', 'LLM'],
  ['history', 'historique'],
  ['version', 'version'],
  ['versions', 'versions'],
  ['library', 'bibliothèque'],
  ['libraries', 'bibliothèques'],
  ['listing', 'liste'],
  ['listings', 'listes'],
  ['summary', 'résumé'],
  ['detail', 'détail'],
  ['details', 'détails'],
  ['option', 'option'],
  ['options', 'options'],
  ['group', 'groupe'],
  ['groups', 'groupes'],
  ['merge', 'fusion'],
  ['stages', 'étapes'],
  ['stage', 'étape'],
  ['phone', 'téléphone'],
  ['number', 'numéro'],
  ['numbers', 'numéros'],
  ['account', 'compte'],
  ['accounts', 'comptes'],
  ['opportunity', 'opportunité'],
  ['opportunities', 'opportunités'],
  ['task', 'tâche'],
  ['tasks', 'tâches'],
  ['note', 'note'],
  ['notes', 'notes'],
  ['template', 'modèle'],
  ['templates', 'modèles'],
  ['setting', 'paramètre'],
  ['settings', 'paramètres'],
  ['subscription', 'abonnement'],
  ['subscriptions', 'abonnements'],
  ['label', 'étiquette'],
  ['labels', 'étiquettes'],
  ['import', 'import'],
  ['exports', 'exports'],
  ['export', 'export'],
  ['close', 'fermeture'],
  ['open', 'ouverture'],
  ['fine', 'fin'],
  ['tune', 'ajustement'],
  ['realtime', 'temps réel'],
  ['websocket', 'websocket'],
  ['websockets', 'websockets'],
  ['submit', 'soumission'],
  ['submits', 'soumissions'],
  ['subsequence', 'sous-séquence'],
  ['subsequences', 'sous-séquences'],
  ['reminder', 'rappel'],
  ['reminders', 'rappels'],
  ['unread', 'non lus'],
  ['sent', 'envoyés'],
  ['scheduled', 'planifiés'],
  ['report', 'rapport'],
  ['reports', 'rapports'],
  ['sender', 'expéditeur'],
  ['senders', 'expéditeurs'],
  ['channel', 'canal'],
  ['channels', 'canaux'],
  ['entity', 'entité'],
  ['entities', 'entités'],
  ['statu', 'statut'],
  ['statuse', 'statut'],
  ['statuses', 'statuts'],
  ['statute', 'statut'],
  ['statutes', 'statuts'],
  ['retrieve', 'récupération'],
  ['lookup', 'recherche'],
  ['look', 'recherche'],
  ['patch', 'mise à jour'],
  ['video', 'vidéo'],
  ['videos', 'vidéos'],
  ['inbox', 'boîte de réception'],
  ['inboxes', 'boîtes de réception'],
  ['reply', 'réponse'],
  ['replies', 'réponses'],
  ['hook', 'hook'],
  ['hooks', 'hooks'],
  ['workspace', 'espace de travail'],
  ['schema', 'schéma'],
  ['schemas', 'schémas'],
  ['node', 'noeud'],
  ['nodes', 'noeuds'],
  ['sandbox', 'sandbox'],
  ['sandboxes', 'sandboxes'],
  ['sandboxid', 'sandbox ID'],
  ['nodeid', 'noeud ID'],
  ['volumeid', 'volume ID'],
  ['accesstokenid', 'jeton d\'accès ID'],
  ['refreshe', 'rafraîchissement'],
  ['refreshes', 'rafraîchissements'],
  ['connect', 'connexion'],
  ['custom', 'personnalisé'],
  ['field', 'champ'],
  ['fields', 'champs'],
  ['object', 'objet'],
  ['type', 'type'],
  ['id', 'ID'],
  ['email', 'email'],
  ['emails', 'emails']
]);

const PHRASE_TRANSLATIONS = new Map([
  ['custom tag', 'tag personnalisé'],
  ['custom tags', 'tags personnalisés'],
  ['custom field', 'champ personnalisé'],
  ['custom fields', 'champs personnalisés'],
  ['custom object type', 'type d\'objet personnalisé'],
  ['custom object types', 'types d\'objets personnalisés'],
  ['overall stats', 'statistiques globales'],
  ['sending status', 'statut d\'envoi'],
  ['comment thread', 'fil de commentaires'],
  ['comment threads', 'fils de commentaires'],
  ['email account', 'compte email'],
  ['email accounts', 'comptes email'],
  ['batch job', 'tâche par lot'],
  ['batch jobs', 'tâches par lot'],
  ['training job', 'tâche d\'entraînement'],
  ['training jobs', 'tâches d\'entraînement'],
  ['job event', 'événement de tâche'],
  ['job events', 'événements de tâche'],
  ['checkpoint file', 'fichier de point de contrôle'],
  ['checkpoint files', 'fichiers de points de contrôle'],
  ['auth code', 'code d\'authentification'],
  ['auth codes', 'codes d\'authentification'],
  ['interactive session', 'session interactive'],
  ['interactive sessions', 'sessions interactives'],
  ['background job', 'tâche en arrière-plan'],
  ['background jobs', 'tâches en arrière-plan'],
  ['account campaign mapping', 'correspondance compte-campagne'],
  ['account campaign mappings', 'correspondances compte-campagne'],
  ['access token', 'jeton d\'accès'],
  ['access tokens', 'jetons d\'accès'],
  ['library listing', 'liste de bibliothèque'],
  ['file metadata', 'métadonnées de fichier'],
  ['voice message', 'message vocal'],
  ['voice messages', 'messages vocaux'],
  ['email unsubscribed', 'email désinscrit'],
  ['call data record', 'enregistrement de données d\'appel'],
  ['call data records', 'enregistrements de données d\'appel'],
  ['conversation recording', 'enregistrement de conversation'],
  ['conversation recordings', 'enregistrements de conversation'],
  ['calendar availability', 'disponibilité du calendrier'],
  ['calendar availabilities', 'disponibilités du calendrier'],
  ['competitor listing', 'liste de concurrents'],
  ['fine tune', 'ajustement fin'],
  ['fine tunes', 'ajustements fins'],
  ['model deployment', 'déploiement de modèle'],
  ['model deployments', 'déploiements de modèles'],
  ['model weight snapshot', 'instantané des poids du modèle']
]);

const OBJECT_LIKE_VERBS = new Set(['webhook', 'comment', 'tag']);
const ACRONYM_TOKENS = new Set(['ai', 'api', 'id', 'ids', 'url', 'uri', 'ssh', 's3', 'sms', 'crm', 'bt', 'json', 'csv']);

function normalizeSpaces(value) {
  return value.replace(/\s+/g, ' ').replace(/\s+([,.;:!?])/g, '$1').trim();
}

function splitWords(value) {
  return String(value || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function singularizeEnglish(word) {
  const w = String(word || '').toLowerCase();
  if (!w) return w;
  if (w === 'statuses') return 'status';
  if (w === 'statutes') return 'statute';
  if (w.endsWith('ies') && w.length > 3) return `${w.slice(0, -3)}y`;
  if (w.endsWith('sses') || w.endsWith('shes') || w.endsWith('ches') || w.endsWith('xes') || w.endsWith('zes')) {
    return w.slice(0, -2);
  }
  if (w.endsWith('s') && !w.endsWith('ss') && w.length > 3) return w.slice(0, -1);
  return w;
}

function pluralizeFrench(word) {
  const w = String(word || '').trim();
  if (!w) return w;
  if (w.endsWith('s') || w.endsWith('x') || w.endsWith('z')) return w;
  return `${w}s`;
}

function canonicalizeVerb(word) {
  const w = String(word || '').toLowerCase();
  if (!w) return '';

  const aliases = [
    ['listing', 'list'],
    ['searches', 'search'],
    ['searched', 'search'],
    ['finds', 'find'],
    ['finding', 'find'],
    ['gets', 'get'],
    ['getting', 'get'],
    ['creates', 'create'],
    ['creating', 'create'],
    ['created', 'create'],
    ['updates', 'update'],
    ['updating', 'update'],
    ['updated', 'update'],
    ['deletes', 'delete'],
    ['deleting', 'delete'],
    ['deleted', 'delete'],
    ['removes', 'remove'],
    ['removing', 'remove'],
    ['activates', 'activate'],
    ['activated', 'activate'],
    ['deactivates', 'deactivate'],
    ['deactivated', 'deactivate'],
    ['comments', 'comment'],
    ['commenting', 'comment'],
    ['tags', 'tag'],
    ['tagging', 'tag'],
    ['webhooks', 'webhook'],
    ['pauses', 'pause'],
    ['paused', 'pause'],
    ['resumes', 'resume'],
    ['resumed', 'resume'],
    ['reads', 'read'],
    ['runs', 'run'],
    ['running', 'run'],
    ['executes', 'execute'],
    ['executed', 'execute'],
    ['deployed', 'deploy'],
    ['deploys', 'deploy'],
    ['retries', 'retry'],
    ['approved', 'approve'],
    ['approves', 'approve'],
    ['cancels', 'cancel'],
    ['cancelled', 'cancel'],
    ['rejected', 'reject'],
    ['rejects', 'reject'],
    ['queries', 'query'],
    ['marked', 'mark'],
    ['marks', 'mark'],
    ['attaches', 'attach'],
    ['attached', 'attach'],
    ['detaches', 'detach'],
    ['detached', 'detach'],
    ['saves', 'save'],
    ['saved', 'save'],
    ['enriches', 'enrich'],
    ['enriched', 'enrich'],
    ['downloads', 'download'],
    ['downloaded', 'download'],
    ['uploads', 'upload'],
    ['uploaded', 'upload'],
    ['submits', 'submit'],
    ['submitted', 'submit'],
    ['starts', 'start'],
    ['started', 'start'],
    ['stops', 'stop'],
    ['stopped', 'stop'],
    ['enables', 'enable'],
    ['enabled', 'enable'],
    ['disables', 'disable'],
    ['disabled', 'disable'],
    ['signs', 'sign'],
    ['signed', 'sign'],
    ['validates', 'validate'],
    ['validated', 'validate'],
    ['closes', 'close'],
    ['closed', 'close'],
    ['opens', 'open'],
    ['opened', 'open'],
    ['shows', 'show'],
    ['showed', 'show'],
    ['shown', 'show'],
    ['retrieve', 'get'],
    ['retrieves', 'get'],
    ['retrieved', 'get'],
    ['lookup', 'search'],
    ['look', 'search'],
    ['patch', 'update'],
    ['adds', 'add'],
    ['added', 'add']
  ];

  for (const [from, to] of aliases) {
    if (w === from) return to;
  }

  return w;
}

function isKnownToken(token) {
  const t = String(token || '').toLowerCase();
  if (!t) return false;
  if (ACRONYM_TOKENS.has(t)) return true;
  if (VERB_TRANSLATIONS.has(canonicalizeVerb(t))) return true;
  if (WORD_TRANSLATIONS.has(t)) return true;
  const singular = singularizeEnglish(t);
  if (WORD_TRANSLATIONS.has(singular)) return true;
  if (STOPWORDS.has(t)) return true;
  return false;
}

function translateWordToken(token) {
  const word = String(token || '');
  if (!word) return '';
  const lc = word.toLowerCase();
  if (WORD_TRANSLATIONS.has(lc)) return WORD_TRANSLATIONS.get(lc);

  const singular = singularizeEnglish(lc);
  if (singular !== lc && WORD_TRANSLATIONS.has(singular)) {
    const translatedSingular = WORD_TRANSLATIONS.get(singular);
    return pluralizeFrench(translatedSingular);
  }

  return lc;
}

function translateTokenPreserveCase(token) {
  const translated = translateWordToken(token);
  if (!translated) return translated;
  if (/^[A-Z0-9]/.test(token)) return translated.charAt(0).toUpperCase() + translated.slice(1);
  return translated;
}

function translateText(value, options = {}) {
  if (typeof value !== 'string') return value;
  const raw = value.trim();
  if (!raw) return value;

  const words = splitWords(raw);
  if (!words.length) return raw;

  const phraseKey = words.map((w) => w.toLowerCase()).join(' ');
  if (PHRASE_TRANSLATIONS.has(phraseKey)) return PHRASE_TRANSLATIONS.get(phraseKey);

  const mode = options.mode || 'auto';
  const canUseLeadingVerb =
    mode === 'action' ||
    (mode === 'auto' && words.length > 1 && VERB_TRANSLATIONS.has(canonicalizeVerb(words[0])));

  const out = [];
  for (let i = 0; i < words.length; i += 1) {
    const original = words[i];
    const canonicalVerb = canonicalizeVerb(original);
    if (i === 0 && canUseLeadingVerb && VERB_TRANSLATIONS.has(canonicalVerb)) {
      out.push(VERB_TRANSLATIONS.get(canonicalVerb));
      continue;
    }
    if (STOPWORDS.has(original.toLowerCase())) continue;
    out.push(translateTokenPreserveCase(original));
  }

  return normalizeSpaces(out.join(' ')) || raw;
}

function dedupePreserveOrder(values) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const key = String(value || '').toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

function parseKeyTokens(node) {
  const keyTokens = String(node && node.key || '').split('_').filter(Boolean);
  const providerTokens = String(node && node.providerKey || '').split('_').filter(Boolean);

  if (!keyTokens.length) return [];
  let start = 0;
  while (start < keyTokens.length && start < providerTokens.length && keyTokens[start] === providerTokens[start]) {
    start += 1;
  }

  return keyTokens
    .slice(start)
    .flatMap((token) => expandCompactToken(token))
    .map((w) => w.toLowerCase());
}

function expandCompactToken(token) {
  const rawWords = splitWords(token);
  if (rawWords.length !== 1) return rawWords;

  const raw = rawWords[0].toLowerCase();
  if (raw.length < 6 || isKnownToken(raw)) return [raw];

  const best = new Array(raw.length + 1).fill(null);
  best[0] = [];

  for (let i = 0; i < raw.length; i += 1) {
    if (!best[i]) continue;
    for (let j = i + 2; j <= Math.min(raw.length, i + 20); j += 1) {
      const part = raw.slice(i, j);
      if (part.length < 3 && !ACRONYM_TOKENS.has(part)) continue;
      if (!isKnownToken(part)) continue;
      const candidate = [...best[i], part];
      if (!best[j] || candidate.length < best[j].length) {
        best[j] = candidate;
      }
    }
  }

  const segments = best[raw.length];
  if (segments && segments.length > 1) return segments;
  return [raw];
}

function findVerbIndex(tokens) {
  let bestIndex = -1;
  let bestPriority = -1;

  for (let i = 0; i < tokens.length; i += 1) {
    const canonical = canonicalizeVerb(tokens[i]);
    if (!VERB_TRANSLATIONS.has(canonical)) continue;
    const priority = VERB_PRIORITIES.has(canonical) ? VERB_PRIORITIES.get(canonical) : (STRONG_VERBS.has(canonical) ? 80 : 40);
    if (priority > bestPriority || (priority === bestPriority && (bestIndex < 0 || i < bestIndex))) {
      bestPriority = priority;
      bestIndex = i;
    }
  }

  return bestIndex;
}

function isMeaningfulToken(token) {
  const t = String(token || '').toLowerCase();
  if (!t) return false;
  if (STOPWORDS.has(t)) return false;
  if (/^v\d+$/.test(t)) return false;
  return true;
}

function collectMeaningfulTokens(tokens) {
  return tokens.filter(isMeaningfulToken).map((t) => t.toLowerCase());
}

function stripVerbLikeTokens(tokens) {
  return tokens.filter((t) => !VERB_TRANSLATIONS.has(canonicalizeVerb(t)));
}

function translateObjectWord(token) {
  return translateWordToken(singularizeEnglish(token));
}

function translateObjectTokens(tokens) {
  const clean = tokens.map((t) => String(t || '').toLowerCase()).filter(Boolean);
  const phraseKey = clean.join(' ');
  if (PHRASE_TRANSLATIONS.has(phraseKey)) {
    return splitWords(PHRASE_TRANSLATIONS.get(phraseKey)).map((w) => w.toLowerCase());
  }
  return dedupePreserveOrder(clean.map((w) => translateObjectWord(w)));
}

function buildActionParts(node) {
  const tokens = parseKeyTokens(node);
  const subtitleTokens = splitWords(node && node.subtitle || '');
  if (!tokens.length) {
    return {
      title: node && node.title ? translateText(node.title) : 'Action',
      objectWords: collectMeaningfulTokens(subtitleTokens),
      qualifierWords: []
    };
  }

  const verbIndex = findVerbIndex(tokens);
  const fallbackWords = collectMeaningfulTokens(subtitleTokens);

  if (verbIndex < 0) {
    const words = collectMeaningfulTokens(tokens);
    const objectWords = stripVerbLikeTokens(words);
    const baseObject = objectWords.length ? objectWords : fallbackWords;
    const translatedObject = translateObjectTokens(baseObject);
    const obj = translatedObject.join(' ');
    return {
      title: obj ? `Gérer ${obj}` : (node && node.title ? translateText(node.title) : 'Action'),
      objectWords: translatedObject,
      qualifierWords: []
    };
  }

  const verb = canonicalizeVerb(tokens[verbIndex]);
  const verbFr = VERB_TRANSLATIONS.get(verb) || 'Gérer';

  let after = collectMeaningfulTokens(tokens.slice(verbIndex + 1));
  let before = collectMeaningfulTokens(tokens.slice(0, verbIndex));
  after = after.filter((t) => {
    const canonical = canonicalizeVerb(t);
    if (!VERB_TRANSLATIONS.has(canonical)) return true;
    if (canonical === verb) return false;
    return OBJECT_LIKE_VERBS.has(canonical);
  });
  before = stripVerbLikeTokens(before);

  let objectTokens = after.length ? after : before;
  if (!objectTokens.length) objectTokens = fallbackWords;
  const hasOpaqueTokens = objectTokens.some((t) => String(t || '').length >= 10 && !isKnownToken(t));
  if (hasOpaqueTokens && fallbackWords.length) objectTokens = fallbackWords;

  const translatedObjectWords = translateObjectTokens(objectTokens);
  const qualifierSource = dedupePreserveOrder([...before, ...after]);
  const qualifierWords = qualifierSource
    .map((w) => translateObjectWord(w))
    .filter((w) => translatedObjectWords.indexOf(w) === -1);

  const objectPhrase = translatedObjectWords.join(' ');
  const title = objectPhrase ? `${verbFr} ${objectPhrase}` : verbFr;

  return {
    title: normalizeSpaces(title),
    objectWords: translatedObjectWords,
    qualifierWords
  };
}

function buildUniqueTitle(node, usedTitles) {
  const parts = buildActionParts(node);
  const candidates = [];

  if (parts.title) candidates.push(refineReadablePhrase(parts.title));

  const qualifierWords = parts.qualifierWords || [];
  for (let i = 1; i <= Math.min(4, qualifierWords.length); i += 1) {
    const suffix = qualifierWords.slice(0, i).join(' ');
    if (!suffix) continue;
    candidates.push(refineReadablePhrase(`${parts.title} - ${suffix}`));
  }

  const keyHintTokens = stripVerbLikeTokens(collectMeaningfulTokens(parseKeyTokens(node)));
  const compactKeyHint = translateObjectTokens(keyHintTokens).join(' ');
  if (compactKeyHint) candidates.push(refineReadablePhrase(`${parts.title} - ${compactKeyHint}`));

  const fallback = translateText(node && node.title || 'Action', { mode: 'noun' });
  if (fallback) candidates.push(refineReadablePhrase(fallback));

  for (const candidate of candidates) {
    const normalized = normalizeSpaces(candidate);
    if (!normalized) continue;
    if (!usedTitles.has(normalized)) {
      usedTitles.add(normalized);
      return normalized;
    }
  }

  const hardFallback = `${parts.title} - ${String(node && node.key || 'node').replace(/_/g, ' ')}`;
  const normalized = normalizeSpaces(hardFallback);
  usedTitles.add(normalized);
  return normalized;
}

function uniqueName(base, usedNames) {
  const root = String(base || '').trim() || 'node';
  let candidate = root;
  let index = 2;
  while (usedNames.has(candidate)) {
    candidate = `${root}${index}`;
    index += 1;
  }
  usedNames.add(candidate);
  return candidate;
}

function dedupeNodesByProvider(nodeTemplates) {
  const templates = Array.isArray(nodeTemplates) ? nodeTemplates : [];
  const byProvider = new Map();

  for (const node of templates) {
    const providerKey = String(node && node.providerKey || '');
    if (!byProvider.has(providerKey)) byProvider.set(providerKey, []);
    byProvider.get(providerKey).push(node);
  }

  let renamedCount = 0;
  let retitledCount = 0;

  for (const nodes of byProvider.values()) {
    const usedNames = new Set();
    const usedTitles = new Set();

    for (const node of nodes) {
      if (!node || typeof node !== 'object') continue;

      const nameBase = node.name || toCamel(node.key || 'node');
      const nextName = uniqueName(nameBase, usedNames);
      if (node.name !== nextName) {
        node.name = nextName;
        renamedCount += 1;
      }

      const nextTitle = buildUniqueTitle(node, usedTitles);
      if (node.title !== nextTitle) {
        node.title = nextTitle;
        retitledCount += 1;
      }

      const subtitleFromAction = buildSubtitleFromAction(node);
      if (subtitleFromAction && node.subtitle !== subtitleFromAction) {
        node.subtitle = subtitleFromAction;
      }

      const nextDescription = buildNodeDescription(nextTitle);
      if (node.description !== nextDescription) {
        node.description = nextDescription;
      }

      if (node.args && typeof node.args === 'object') {
        node.args.title = nextTitle;
      }
    }
  }

  return { renamedCount, retitledCount };
}

function toSentenceCase(value) {
  const s = String(value || '').trim();
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function buildSubtitleFromAction(node) {
  const parts = buildActionParts(node);
  const phrase = normalizeSpaces((parts.objectWords || []).join(' '));
  if (!phrase) return refineReadablePhrase(translateText(node && node.subtitle ? node.subtitle : '', { mode: 'noun' }));
  return refineReadablePhrase(toSentenceCase(phrase));
}

function buildNodeDescription(title) {
  const t = refineReadablePhrase(normalizeSpaces(String(title || '').replace(/[.]+$/g, '')));
  if (!t) return 'Action disponible.';
  return `${t}.`;
}

function refineReadablePhrase(value) {
  let s = normalizeSpaces(String(value || ''));
  if (!s) return s;

  const replacements = [
    [/\bbibliothèque liste\b/gi, 'liste de bibliothèques'],
    [/\bbibliothèque listes\b/gi, 'listes de bibliothèques'],
    [/\bbase llm\b/gi, 'Base LLM'],
    [/\bnouveau Base LLM déploiement version\b/gi, 'nouvelle version de déploiement Base LLM'],
    [/\bnouveau Base LLM déploiement\b/gi, 'déploiement Base LLM'],
    [/\bnouveau\b/gi, 'nouveau'],
    [/\bsandboxe\b/gi, 'sandbox'],
    [/\bstatuse\b/gi, 'statut'],
    [/\bstatutes\b/gi, 'statuts'],
    [/\bstatute\b/gi, 'statut']
  ];

  for (const [pattern, replacement] of replacements) {
    s = s.replace(pattern, replacement);
  }

  return normalizeSpaces(s);
}

function translateNodeTemplateUi(node) {
  if (!node || typeof node !== 'object') return 0;
  let changed = 0;

  const apply = (obj, key, options) => {
    if (!obj || typeof obj !== 'object' || typeof obj[key] !== 'string') return;
    const next = translateText(obj[key], options);
    if (next !== obj[key]) {
      obj[key] = next;
      changed += 1;
    }
  };

  apply(node, 'subtitle', { mode: 'noun' });
  apply(node, 'group', { mode: 'noun' });
  apply(node, 'description');

  if (Array.isArray(node.inputHandles)) {
      for (const h of node.inputHandles) apply(h, 'name', { mode: 'noun' });
  }
  if (Array.isArray(node.outputHandles)) {
      for (const h of node.outputHandles) apply(h, 'name', { mode: 'noun' });
  }

  if (node.args && typeof node.args === 'object') {
    if (Array.isArray(node.args.fields)) {
      for (const f of node.args.fields) {
        apply(f, 'label', { mode: 'noun' });
        apply(f, 'description');
        apply(f, 'title', { mode: 'noun' });
      }
    }
  }

  return changed;
}

function fixConnectorNames(connector, options = {}) {
  const root = process.cwd();
  const manifestPath = path.join(root, 'API', 'src', 'plugins', 'repos', connector, 'manifest.json');
  if (!fs.existsSync(manifestPath)) throw new Error(`Manifest introuvable: ${manifestPath}`);

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const nodes = Array.isArray(manifest.nodeTemplates) ? manifest.nodeTemplates : [];

  let translatedFields = 0;
  for (const node of nodes) translatedFields += translateNodeTemplateUi(node);

  const { renamedCount, retitledCount } = dedupeNodesByProvider(nodes);

  if (!options.dryRun) {
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  }

  return {
    connector,
    manifestPath,
    nodes: nodes.length,
    translatedFields,
    renamedCount,
    retitledCount,
    dryRun: !!options.dryRun
  };
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const out = fixConnectorNames(args.connector, { dryRun: args.dryRun });

    const prefix = out.dryRun ? '[dry-run] ' : '';
    console.log(`${prefix}Correction noms terminée pour ${out.connector}`);
    console.log(`Manifest: ${out.manifestPath}`);
    console.log(`Nodes: ${out.nodes}`);
    console.log(`Champs traduits: ${out.translatedFields}`);
    console.log(`Noms dédupliqués: ${out.renamedCount}`);
    console.log(`Titres dédupliqués: ${out.retitledCount}`);
  } catch (e) {
    console.error(`Erreur: ${e.message}`);
    console.error('\nUsage:');
    console.error('  node .agents/skills/kinn-connector-name-fixer/scripts/fix-connector-names.js <connector> [--dry-run]');
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { fixConnectorNames, translateText, buildActionParts };
