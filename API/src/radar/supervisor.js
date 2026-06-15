// Radar — le superviseur d'entreprise.
//
// Agent événementiel par workspace : réveillé quand des RadarSignal sont en
// attente ou des RadarWakeup arrivent à échéance. Il ne poll jamais ; entre
// deux réveils il n'existe pas.
//
// Il dispose de méta-outils (pas de workflows codés en dur par cas d'usage) :
//   launch_mission     — écrit librement le prompt + critères d'une mission de fond
//   send_notification  — alerte l'utilisateur
//   resolve_signal     — clôt un signal (handled/dismissed + note)
//   schedule_wakeup    — se replanifie (mémoire prospective)
//   get_radar_overview — état des connecteurs / signaux / missions
//
// Boucle : runSpecialist (nouveau harness — jamais l'ancien agent-runner).
// Garde anti-boucle : un signal réveillé 3 fois sans résolution est auto-classé.

const { runSpecialist } = require('../ai/specialists/run-specialist');
const { resolveRadarLlmConfig } = require('./llm');
const { launchMission } = require('./missions');
const { resolveSystemActor } = require('./actor');
const { FAMILIES } = require('./families');

const MAX_SIGNALS_PER_PASS = 10;
const MAX_WORKSPACES_PER_PASS = 3;
const MAX_SIGNAL_ATTEMPTS = 3;
const SUPERVISOR_MAX_LOOPS = 8;

const SUPERVISOR_TOOL_DEFINITIONS = [
  {
    name: 'launch_mission',
    description: 'Lance une mission de fond exécutée par un agent autonome. TU écris le prompt : objectif précis, contexte utile, ce qu\'il faut chercher/croiser. IMPORTANT : la mission doit produire un résultat COURT et ACTIONNABLE (comme Claude Code) — ne demande JAMAIS un rapport en plusieurs sections, ni un verbatim intégral, ni la recopie de threads entiers. Les successCriteria portent sur le RÉSULTAT MÉTIER (ce qu\'on cherche à savoir/faire), pas sur le format ni l\'exhaustivité documentaire. Maximum 2-3 critères, centrés sur la conclusion utile. Exemple BON : ["Identifier si les factures d\'avril sont saisies dans Odoo", "Lister précisément celles qui manquent (n°, montant)"]. Exemple MAUVAIS (à éviter) : ["Section A avec tableau des UIDs", "Verbatim complet du thread", "Aucune phrase coupée"].',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Titre court de la mission' },
        prompt: { type: 'string', description: 'Prompt complet de la mission, rédigé par toi' },
        successCriteria: { type: 'array', items: { type: 'string' }, description: 'Critères de succès vérifiables' },
        maxAttempts: { type: 'number', description: 'Tentatives max (1-3, défaut 2)' },
        signalIds: { type: 'array', items: { type: 'string' }, description: 'Signaux à l\'origine de la mission' },
      },
      required: ['title', 'prompt', 'successCriteria'],
    },
  },
  {
    name: 'send_notification',
    description: 'Notifie l\'utilisateur du workspace (alerte, information importante, résultat de mission).',
    parameters: {
      type: 'object',
      properties: {
        severity: { type: 'string', enum: ['info', 'warning', 'error', 'critical'] },
        message: { type: 'string', description: 'Message en français, factuel et actionnable' },
        details: { type: 'object', description: 'Données structurées optionnelles' },
      },
      required: ['severity', 'message'],
    },
  },
  {
    name: 'resolve_signal',
    description: 'Clôt un signal traité. OBLIGATOIRE pour chaque signal du briefing avant de terminer : handled (action prise : mission lancée, notification envoyée…) ou dismissed (non pertinent).',
    parameters: {
      type: 'object',
      properties: {
        signalId: { type: 'string' },
        resolution: { type: 'string', enum: ['handled', 'dismissed'] },
        note: { type: 'string', description: 'Ce qui a été décidé et pourquoi' },
      },
      required: ['signalId', 'resolution', 'note'],
    },
  },
  {
    name: 'schedule_wakeup',
    description: 'Te replanifie un réveil futur (ex: « re-vérifier dans 3 jours si le client a répondu »).',
    parameters: {
      type: 'object',
      properties: {
        inMinutes: { type: 'number', description: 'Dans combien de minutes' },
        reason: { type: 'string', description: 'Pourquoi ce réveil — tu liras cette note au réveil' },
      },
      required: ['inMinutes', 'reason'],
    },
  },
  {
    name: 'get_radar_overview',
    description: 'État courant du radar : connecteurs par famille, signaux en attente, missions en cours/récentes, cards ouvertes du board.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'add_card',
    description: 'Ajoute une card au board de l\'utilisateur (dashboard). Types : briefing (synthèse), alert (risque/urgence), action_proposal (proposition à Valider/Modifier/Refuser — OBLIGATOIRE avant toute action sortante), question (sa réponse te reviendra), mission_status (suivi), digest (ce que tu as fait). Le payload porte le contenu en markdown.',
    parameters: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['briefing', 'alert', 'action_proposal', 'question', 'mission_status', 'digest'] },
        title: { type: 'string' },
        section: { type: 'string', description: 'Section du board (ex: "À traiter maintenant", "Cette semaine"). Défaut: "Aujourd\'hui"' },
        priority: { type: 'number', description: 'Plus petit = plus haut (défaut 100, urgence = 10)' },
        markdown: { type: 'string', description: 'Contenu principal en markdown (factuel : montants, références, noms)' },
        question: { type: 'string', description: 'Pour type=question : la question posée' },
        proposedAction: { type: 'string', description: 'Pour type=action_proposal : description précise de l\'action qui sera exécutée si l\'utilisateur valide' },
        severity: { type: 'string', enum: ['info', 'warning', 'critical'], description: 'Pour type=alert' },
        missionId: { type: 'string', description: 'Mission liée le cas échéant' },
        signalIds: { type: 'array', items: { type: 'string' } },
      },
      required: ['type', 'title'],
    },
  },
  {
    name: 'close_card',
    description: 'Ferme une card du board devenue obsolète ou traitée (avec une note expliquant pourquoi).',
    parameters: {
      type: 'object',
      properties: {
        cardId: { type: 'string' },
        state: { type: 'string', enum: ['done', 'expired', 'dismissed'], description: 'done = traitée, expired = plus d\'actualité, dismissed = annulée' },
        note: { type: 'string' },
      },
      required: ['cardId', 'state'],
    },
  },
  {
    name: 'save_knowledge',
    description: 'Mémorise un fait durable sur l\'entreprise (arborescence des dossiers, contact clé, convention, règle métier). Utilise-le dès que l\'utilisateur t\'apprend quelque chose (réponse à une question, note de modification).',
    parameters: {
      type: 'object',
      properties: {
        topic: { type: 'string', enum: ['file_structure', 'contacts', 'conventions', 'processes', 'business_rules', 'custom'] },
        key: { type: 'string', description: 'Identifiant court du fait (ex: "arborescence factures fournisseurs")' },
        value: { type: 'string', description: 'Le fait, précis et réutilisable' },
        confidence: { type: 'string', enum: ['confirmed', 'inferred'], description: 'confirmed si l\'utilisateur l\'a dit, inferred si tu le déduis' },
      },
      required: ['topic', 'key', 'value'],
    },
  },
  {
    name: 'propose_playbook',
    description: 'Propose une nouvelle procédure (playbook) quand l\'utilisateur explique comment gérer un type de situation, ou quand tu remarques des corrections répétées. La proposition attend SON approbation (jamais active silencieusement).',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nom court (ex: "Client mécontent")' },
        triggerCategories: { type: 'array', items: { type: 'string' }, description: 'Catégories de signaux concernées (ex: client_complaint)' },
        triggerDescription: { type: 'string', description: 'Quand ce playbook s\'applique, en français' },
        procedure: { type: 'string', description: 'Les étapes à suivre, en français, numérotées' },
        autonomy: { type: 'string', enum: ['propose', 'auto_with_report', 'full_auto'], description: 'Niveau d\'autonomie demandé (défaut propose)' },
      },
      required: ['name', 'procedure'],
    },
  },
  {
    name: 'mark_playbook_used',
    description: 'Signale que tu viens d\'appliquer un playbook (statistiques d\'usage).',
    parameters: {
      type: 'object',
      properties: { playbookId: { type: 'string' } },
      required: ['playbookId'],
    },
  },
  {
    name: 'reply_user',
    description: 'Répond directement à l\'utilisateur dans le chat du radar. OBLIGATOIRE pour chaque réveil user_message : il attend une réponse conversationnelle (concise, factuelle, markdown ok). Les cards restent réservées à ce qui est actionnable ou durable.',
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Ta réponse, en français, concise' },
      },
      required: ['text'],
    },
  },
];

/** Crée le toolSet du superviseur pour un workspace (contrat runSpecialist). */
function buildSupervisorToolSet({ workspaceId, companyId, missionDryRun = false }) {
  const actions = { missions: [], notifications: [], resolved: [], wakeups: [], cards: [], closedCards: [], knowledge: [], playbooks: [], replies: [] };

  async function execute(name, input = {}) {
    const RadarSignal = require('../db/models/radar-signal.model');
    const RadarWakeup = require('../db/models/radar-wakeup.model');
    switch (name) {
      case 'launch_mission': {
        // Garde anti-boucle : budget de missions par heure et par workspace.
        // Au-delà → le superviseur doit rendre compte, pas relancer.
        const RadarMission = require('../db/models/radar-mission.model');
        const cap = Number(process.env.RADAR_MAX_MISSIONS_PER_HOUR) || 10;
        const lastHour = await RadarMission.countDocuments({ workspaceId, createdAt: { $gte: new Date(Date.now() - 3600_000) } });
        if (lastHour >= cap) {
          return { ok: false, error: 'mission_budget_exceeded', hint: `Budget de missions atteint (${cap}/h). Ne relance pas : synthétise ce que tu sais sur le board, notifie l'utilisateur si nécessaire, ou planifie un réveil plus tard.` };
        }
        const mission = await launchMission({
          workspaceId,
          title: input.title,
          prompt: input.prompt,
          successCriteria: input.successCriteria || [],
          maxAttempts: input.maxAttempts,
          signalIds: input.signalIds || [],
          dryRun: missionDryRun,
        });
        if (input.signalIds && input.signalIds.length) {
          await RadarSignal.updateMany({ id: { $in: input.signalIds } }, { $addToSet: { missionIds: mission.id } });
        }
        actions.missions.push(mission.id);
        return { ok: true, missionId: mission.id, status: mission.status };
      }
      case 'send_notification': {
        const Notification = require('../db/models/notification.model');
        const n = await Notification.create({
          companyId, workspaceId,
          entityType: 'radar', entityId: 'supervisor',
          severity: input.severity || 'info',
          code: 'radar_supervisor',
          message: String(input.message || '').slice(0, 2000),
          details: input.details || undefined,
          link: '/radar',
        });
        actions.notifications.push(String(n._id));
        require('./events').emitRadarEvent(workspaceId, 'notification.created', { severity: input.severity || 'info', message: String(input.message || '').slice(0, 300) });
        return { ok: true };
      }
      case 'resolve_signal': {
        const r = await RadarSignal.updateOne(
          { id: input.signalId, workspaceId },
          { $set: { status: input.resolution === 'dismissed' ? 'dismissed' : 'handled', resolution: input.note, handledAt: new Date() } }
        );
        if (!r.matchedCount) return { ok: false, error: `signal_not_found: ${input.signalId}` };
        actions.resolved.push(input.signalId);
        require('./events').emitRadarEvent(workspaceId, 'signal.updated', { signalId: input.signalId, status: input.resolution === 'dismissed' ? 'dismissed' : 'handled', note: input.note });
        return { ok: true };
      }
      case 'schedule_wakeup': {
        const minutes = Math.min(Math.max(1, Number(input.inMinutes) || 60), 60 * 24 * 30);
        const w = await RadarWakeup.create({
          workspaceId, at: new Date(Date.now() + minutes * 60_000),
          reason: String(input.reason || 'wakeup').slice(0, 500),
        });
        actions.wakeups.push(w.id);
        return { ok: true, wakeupId: w.id, at: w.at };
      }
      case 'get_radar_overview':
        return getRadarOverview(workspaceId);
      case 'add_card': {
        const RadarCard = require('../db/models/radar-card.model');
        const payload = {};
        if (input.markdown) payload.markdown = String(input.markdown).slice(0, 8000);
        if (input.question) payload.question = String(input.question).slice(0, 2000);
        if (input.proposedAction) payload.proposedAction = String(input.proposedAction).slice(0, 4000);
        if (input.severity) payload.severity = input.severity;
        if (input.type === 'mission_status' && input.missionId) payload.missionId = input.missionId;
        const card = await RadarCard.create({
          workspaceId,
          type: input.type,
          title: String(input.title || '').slice(0, 300),
          section: input.section || undefined,
          priority: typeof input.priority === 'number' ? input.priority : undefined,
          payload,
          requiresResponse: input.type === 'action_proposal' || input.type === 'question',
          missionId: input.missionId || undefined,
          signalIds: input.signalIds && input.signalIds.length ? input.signalIds : undefined,
        });
        actions.cards.push(card.id);
        require('./events').emitRadarEvent(workspaceId, 'board.changed', { cardId: card.id, action: 'added', type: card.type, title: card.title });
        return { ok: true, cardId: card.id };
      }
      case 'close_card': {
        const RadarCard = require('../db/models/radar-card.model');
        const r = await RadarCard.updateOne(
          { id: input.cardId, workspaceId, state: 'open' },
          { $set: { state: ['done', 'expired', 'dismissed'].includes(input.state) ? input.state : 'done', closedNote: input.note ? String(input.note).slice(0, 1000) : undefined } }
        );
        if (!r.matchedCount) return { ok: false, error: `card_not_found_or_closed: ${input.cardId}` };
        actions.closedCards.push(input.cardId);
        require('./events').emitRadarEvent(workspaceId, 'board.changed', { cardId: input.cardId, action: 'closed' });
        return { ok: true };
      }
      case 'save_knowledge': {
        const RadarKnowledge = require('../db/models/radar-knowledge.model');
        if (!input.key || !input.value) return { ok: false, error: 'key_and_value_required' };
        const doc = await RadarKnowledge.findOneAndUpdate(
          { workspaceId, topic: input.topic || 'custom', key: String(input.key).slice(0, 200) },
          { $set: { value: String(input.value).slice(0, 3000), confidence: input.confidence === 'inferred' ? 'inferred' : 'confirmed', source: 'supervisor', verifiedAt: new Date() } },
          { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        if (!doc.id) { doc.id = require('../utils/ids').newId('rknw'); await doc.save(); }
        actions.knowledge.push(doc.id);
        return { ok: true, knowledgeId: doc.id };
      }
      case 'propose_playbook': {
        const RadarPlaybook = require('../db/models/radar-playbook.model');
        if (!input.name || !input.procedure) return { ok: false, error: 'name_and_procedure_required' };
        const pb = await RadarPlaybook.create({
          workspaceId,
          name: String(input.name).slice(0, 200),
          procedure: String(input.procedure).slice(0, 6000),
          triggerCategories: input.triggerCategories || [],
          triggerDescription: String(input.triggerDescription || '').slice(0, 1000),
          autonomy: ['propose', 'auto_with_report', 'full_auto'].includes(input.autonomy) ? input.autonomy : 'propose',
          source: 'suggested_by_radar',
          pendingApproval: true,
          enabled: false,
        });
        actions.playbooks.push(pb.id);
        return { ok: true, playbookId: pb.id, note: 'Proposition créée — l\'utilisateur doit l\'approuver dans Radar > Procédures.' };
      }
      case 'reply_user': {
        const RadarChatMessage = require('../db/models/radar-chat-message.model');
        if (!String(input.text || '').trim()) return { ok: false, error: 'text_required' };
        const msg2 = await RadarChatMessage.create({ workspaceId, role: 'radar', text: String(input.text).slice(0, 8000) });
        require('./events').emitRadarEvent(workspaceId, 'chat.message', { id: msg2.id, role: 'radar', text: msg2.text, at: msg2.createdAt });
        actions.replies.push(msg2.id);
        return { ok: true };
      }
      case 'mark_playbook_used': {
        const RadarPlaybook = require('../db/models/radar-playbook.model');
        const r2 = await RadarPlaybook.updateOne(
          { id: input.playbookId, workspaceId },
          { $inc: { 'stats.timesUsed': 1 }, $set: { 'stats.lastUsedAt': new Date() } }
        );
        return { ok: !!r2.matchedCount };
      }
      default:
        return { ok: false, error: `unknown_tool: ${name}` };
    }
  }

  return { definitions: SUPERVISOR_TOOL_DEFINITIONS, execute, cleanup: async () => {}, actions };
}

/** État du radar pour un workspace (tool + briefing). */
async function getRadarOverview(workspaceId) {
  const RadarConnector = require('../db/models/radar-connector.model');
  const RadarSignal = require('../db/models/radar-signal.model');
  const RadarMission = require('../db/models/radar-mission.model');
  const connectors = await RadarConnector.find({ workspaceId }).select('family providerKey label status lastPollAt lastError').lean();
  const pendingSignals = await RadarSignal.countDocuments({ workspaceId, status: 'pending' });
  const missions = await RadarMission.find({ workspaceId }).sort({ createdAt: -1 }).limit(10)
    .select('id title status attempts result lastCritique error createdAt').lean();
  const RadarCard = require('../db/models/radar-card.model');
  const openCards = await RadarCard.find({ workspaceId, state: 'open' }).sort({ priority: 1 })
    .select('id type title section requiresResponse missionId').lean();
  return {
    connectors: connectors.map(c => ({ family: c.family, familyLabel: FAMILIES[c.family]?.label, provider: c.providerKey, label: c.label, status: c.status, lastPollAt: c.lastPollAt, lastError: c.lastError || undefined })),
    pendingSignals,
    recentMissions: missions.map(m => ({ id: m.id, title: m.title, status: m.status, attempts: m.attempts, result: m.result ? String(m.result).slice(0, 800) : undefined, lastCritique: m.lastCritique || undefined, error: m.error || undefined })),
    openCards: openCards.map(c => ({ id: c.id, type: c.type, title: c.title, section: c.section, requiresResponse: c.requiresResponse, missionId: c.missionId || undefined })),
  };
}

function buildSupervisorSystemPrompt() {
  return `Tu es le superviseur Radar d'une entreprise (PME française) : une secrétaire numérique proactive qui surveille les logiciels connectés et agit.

## Ton fonctionnement
- Tu es réveillé par des SIGNAUX (changements signifiants détectés) et des RÉVEILS PROGRAMMÉS (tes propres rappels, fins de mission).
- Pour chaque signal du briefing, tu DOIS décider puis appeler resolve_signal : handled (avec l'action prise) ou dismissed (non pertinent, en expliquant).
- Actions possibles : lancer une mission de fond (launch_mission — tu écris toi-même le prompt et des critères de succès vérifiables), notifier l'utilisateur (send_notification), te replanifier (schedule_wakeup).
- Une mission terminée (réveil mission_completed/mission_failed) : tu REND COMPTE (card digest ou action_proposal, notification si important) — tu ne relances PAS de mission de suivi sur le même sujet, sauf si le résultat est inexploitable, et au maximum UNE relance. Jamais de chaîne mission → mission → mission : le résultat appartient à l'utilisateur, c'est lui qui décide de la suite via le board.

## Le board (dashboard de l'utilisateur)
- Le board est TON interface vers l'utilisateur : compose-le avec add_card, nettoie-le avec close_card. Il doit refléter la situation du moment (urgences en tête, sections claires).
- LA LECTURE EST LIBRE, L'ÉCRITURE EST GARDÉE. Consulter, lister, vérifier, croiser des données chez les providers (existence d'un projet, tickets en attente, factures, historiques…) ne nécessite AUCUNE permission : lance ces missions de lecture immédiatement et automatiquement — c'est ton travail de préparation. Sois proactif : avant de présenter quoi que ce soit à l'utilisateur, fais toi-même toutes les vérifications de lecture utiles.
- RÈGLE PAR DÉFAUT pour les ÉCRITURES uniquement (envoyer un mail, créer/modifier chez un provider, relancer un client) : card action_proposal que l'utilisateur valide. Tu ne décides JAMAIS seul d'exécuter une écriture.
- JAMAIS de méta-proposition (« si tu valides, je créerai une card », « veux-tu que je propose… ») : si une action mérite validation, crée DIRECTEMENT la card action_proposal avec l'action concrète et précise. L'utilisateur clique Valider, pas « valider l'idée de proposer ».
- RÈGLE ABSOLUE — QUI POSE LA QUESTION ? Si TU as besoin d'une information, d'une décision ou d'une clarification de périmètre pour avancer, tu demandes à L'UTILISATEUR (card de type question, ou reply_user dans le chat). Tu ne rédiges JAMAIS un mail/message vers un tiers (client, fournisseur, compta, expert-comptable…) qui contient ta propre incertitude ou qui repose la question au tiers. Un brouillon de mail proposé doit être une réponse COMPLÈTE et prête à envoyer — si tu ne peux pas répondre toi-même avec certitude, ce n'est pas un mail à proposer, c'est une question à poser à l'utilisateur. Exemple : la compta demande « as-tu rempli les factures de mai ? », tu as vérifié et ne trouves rien → tu poses à l'UTILISATEUR une card question « Les factures fournisseurs de mai : où sont-elles / faut-il que je les collecte ? », tu ne proposes PAS d'envoyer un mail à la compta qui lui redemande le périmètre.
- Une mission qui échoue partiellement n'est pas une impasse : exploite ce qu'elle a trouvé, lance toi-même les lectures complémentaires, et ne présente à l'utilisateur que du concret et de l'actionnable.
- UNIQUE exception, à portée STRICTEMENT PONCTUELLE : si l'utilisateur vient de t'autoriser explicitement CETTE action précise (réponse de card « tu peux envoyer directement », message direct le demandant, ou playbook approuvé avec autonomie auto), exécute-la sans re-demander — re-demander une permission qu'il vient de donner est une faute. Cette autorisation ne vaut QUE pour cette demande-là : elle ne s'étend ni aux actions suivantes, ni aux actions similaires, ni au sujet en général. Au moindre doute sur la portée → propose une card. Seul un playbook approuvé par l'utilisateur rend une autorisation durable.
- Après une exécution autorisée : card digest de compte rendu obligatoire, et si la préférence semble durable, propose un playbook (qu'il devra approuver).
- Un réveil user_message = l'utilisateur te parle dans le CHAT. Traite sa demande en priorité absolue et réponds-lui TOUJOURS avec reply_user (conversationnel, concis). N'ajoute une card QUE s'il y a quelque chose d'actionnable ou de durable à montrer sur le board — le chat est le canal de réponse.
- Une mission terminée avec un résultat utile → card (digest ou action_proposal selon qu'il y a une suite à valider), pas seulement une notification.
- Les réponses de l'utilisateur aux cards te reviennent en réveil card_response : validate → lance la mission d'exécution promise ; modify → tiens compte de sa version ; dismiss → n'insiste pas ; answer → exploite la réponse.

## Mémoire & apprentissage
- Le briefing contient « Ce que tu sais de l'entreprise » : utilise ces faits dans tes missions et tes cards. Quand l'utilisateur t'apprend quelque chose (réponse à une question, note de modification), mémorise-le avec save_knowledge.
- Les « Procédures de l'entreprise » (playbooks) sont PRIORITAIRES : si un signal correspond à un playbook, suis sa procédure et appelle mark_playbook_used.
- Si l'utilisateur explique comment gérer un type de situation, ou si tu remarques qu'il corrige toujours la même chose (modify répétés), propose un playbook avec propose_playbook — il devra l'approuver, n'agis jamais comme s'il était déjà actif.

## Tes règles
- Tu n'exécutes RIEN directement chez les providers : les missions s'en chargent, après validation des cards action_proposal.
- Sois économe : regroupe ce qui peut l'être, une mission bien promptée vaut mieux que trois vagues.
- Sois factuel (cards comme notifications) : montants, références, noms — pas de généralités.
- Réponds en français.
- Termine quand tous les signaux du briefing sont résolus, le board à jour et les suites planifiées.`;
}

/** Briefing utilisateur d'un réveil. */
function buildBriefing({ now, overview, signals, wakeups, knowledge = [], playbooks = [] }) {
  const lines = [`# Briefing du ${now.toLocaleString('fr-FR')}`];
  if (knowledge.length) {
    lines.push(`\n## Ce que tu sais de l'entreprise\n${knowledge.map(k => `- (${k.topic}${k.confidence === 'inferred' ? ', à confirmer' : ''}) ${k.key} : ${k.value}`).join('\n')}`);
  }
  if (playbooks.length) {
    lines.push(`\n## Procédures de l'entreprise (playbooks) — à suivre en priorité quand elles s'appliquent\n${playbooks.map(p => `- [${p.id}] « ${p.name} » (autonomie: ${p.autonomy})${p.triggerCategories.length ? ` [catégories: ${p.triggerCategories.join(', ')}]` : ''}${p.triggerDescription ? ` — ${p.triggerDescription}` : ''}\n  Procédure : ${p.procedure.slice(0, 800)}`).join('\n')}`);
  }
  lines.push(`\n## Connecteurs\n${overview.connectors.map(c => `- [${c.status}] ${c.familyLabel || c.family} — ${c.label || c.provider}${c.lastError ? ` (erreur: ${c.lastError})` : ''}`).join('\n') || '- aucun'}`);
  if (wakeups.length) {
    lines.push(`\n## Réveils programmés arrivés à échéance\n${wakeups.map(w => `- [${w.id}] ${w.reason}${w.payload ? ` — ${JSON.stringify(w.payload)}` : ''}`).join('\n')}`);
  }
  if (signals.length) {
    lines.push(`\n## Signaux à traiter (resolve_signal obligatoire pour chacun)\n${signals.map(s => `- [${s.id}] (${s.urgency}, ${s.category}, famille ${s.family || '?'}) ${s.summary}`).join('\n')}`);
  }
  if (overview.recentMissions.length) {
    lines.push(`\n## Missions récentes\n${overview.recentMissions.map(m => `- [${m.id}] ${m.title} — ${m.status}${m.result ? `\n  Résultat: ${m.result.slice(0, 300)}` : ''}${m.lastCritique ? `\n  Critique: ${m.lastCritique.slice(0, 200)}` : ''}`).join('\n')}`);
  }
  if (overview.openCards && overview.openCards.length) {
    lines.push(`\n## Board actuel (cards ouvertes)\n${overview.openCards.map(c => `- [${c.id}] (${c.type}, section "${c.section}") ${c.title}${c.requiresResponse ? ' — en attente de réponse utilisateur' : ''}`).join('\n')}`);
  }
  lines.push('\nTraite ce briefing maintenant.');
  return lines.join('\n');
}

/**
 * Passe superviseur : traite les workspaces ayant des signaux pending ou des
 * wakeups dus. Retourne des stats. Options de test : missionDryRun, llmConfig.
 */
async function runSupervisorPass({ now = new Date(), missionDryRun = false, llmConfig, log = () => {} } = {}) {
  const RadarSignal = require('../db/models/radar-signal.model');
  const RadarWakeup = require('../db/models/radar-wakeup.model');
  const stats = { workspaces: 0, signalsClaimed: 0, signalsResolved: 0, missions: 0, notifications: 0, autoClosed: 0 };

  const cfg = llmConfig || _supervisorLlmConfig();
  if (!cfg) { log('[radar-supervisor] aucun LLM configuré — passe sautée'); return stats; }

  const sigWs = await RadarSignal.distinct('workspaceId', { status: 'pending' });
  const wakeWs = await RadarWakeup.distinct('workspaceId', { status: 'pending', at: { $lte: now } });
  const workspaceIds = [...new Set([...sigWs, ...wakeWs].map(String))].slice(0, MAX_WORKSPACES_PER_PASS);

  for (const wsId of workspaceIds) {
    const actor = await resolveSystemActor(wsId);
    if (!actor) { log(`[radar-supervisor] pas d'acteur système pour ws ${wsId}`); continue; }

    // Garde anti-boucle : signaux trop re-présentés → auto-classés
    const exhausted = await RadarSignal.updateMany(
      { workspaceId: wsId, status: 'pending', attempts: { $gte: MAX_SIGNAL_ATTEMPTS } },
      { $set: { status: 'dismissed', resolution: 'auto_dismissed: non résolu après plusieurs passes superviseur', handledAt: now } }
    );
    stats.autoClosed += exhausted.modifiedCount || 0;

    // Claim des signaux + réveils
    const signals = await RadarSignal.find({ workspaceId: wsId, status: 'pending' })
      .sort({ urgency: -1, createdAt: 1 }).limit(MAX_SIGNALS_PER_PASS).lean();
    await RadarSignal.updateMany({ id: { $in: signals.map(s => s.id) } }, { $set: { status: 'processing' }, $inc: { attempts: 1 } });
    const wakeups = await RadarWakeup.find({ workspaceId: wsId, status: 'pending', at: { $lte: now } }).limit(20).lean();
    await RadarWakeup.updateMany({ id: { $in: wakeups.map(w => w.id) } }, { $set: { status: 'fired', firedAt: now } });

    if (!signals.length && !wakeups.length) continue;
    stats.workspaces++;
    stats.signalsClaimed += signals.length;

    // Facturation : même circuit Panel que l'assistant (payeur = owner du workspace)
    const { resolveBillingFor, checkBeforeRadarCall, debitRadarUsage } = require('./billing');
    const billing = await resolveBillingFor(wsId, 'supervisor');
    if (billing) {
      try { await checkBeforeRadarCall({ billing, provider: cfg.provider, model: cfg.model }); }
      catch (e) {
        log(`[radar-supervisor] crédits refusés pour ws ${wsId}: ${e.code || e.message}`);
        await RadarSignal.updateMany({ workspaceId: wsId, status: 'processing' }, { $set: { status: 'pending' } });
        continue;
      }
    }

    const toolSet = buildSupervisorToolSet({ workspaceId: wsId, companyId: actor.companyId, missionDryRun });
    const overview = await getRadarOverview(wsId);
    // Savoir + playbooks applicables (catégories des signaux du briefing, ou génériques)
    const RadarKnowledge = require('../db/models/radar-knowledge.model');
    const RadarPlaybook = require('../db/models/radar-playbook.model');
    const knowledge = await RadarKnowledge.find({ workspaceId: wsId }).sort({ topic: 1 }).limit(30).lean();
    const signalCategories = [...new Set(signals.map(s => s.category))];
    const playbooks = await RadarPlaybook.find({
      workspaceId: wsId, enabled: true, pendingApproval: { $ne: true },
      $or: [{ triggerCategories: { $size: 0 } }, { triggerCategories: { $in: signalCategories } }],
    }).limit(10).lean();
    const briefing = buildBriefing({ now, overview, signals, wakeups, knowledge, playbooks });

    try {
      const gen = runSpecialist({
        toolSet,
        systemPrompt: buildSupervisorSystemPrompt(),
        messages: [{ role: 'user', content: briefing }],
        llmConfig: cfg,
        context: { workspaceId: wsId, companyId: actor.companyId, userId: actor.userId },
        maxLoops: SUPERVISOR_MAX_LOOPS,
      });
      // Passe déclenchée par un message direct → on streame le travail du
      // superviseur dans le chat (texte + outils), comme l'assistant.
      const { emitRadarEvent } = require('./events');
      const streamToChat = wakeups.some(w => w.reason === 'user_message');
      let usage = null;
      for await (const ev of gen) {
        if (ev.type === 'done' && ev.usage) usage = ev.usage;
        if (!streamToChat) continue;
        if (ev.type === 'message' && ev.text) emitRadarEvent(wsId, 'chat.stream', { delta: ev.text });
        else if (ev.type === 'tool.start') emitRadarEvent(wsId, 'chat.tool', { id: ev.id, name: ev.name, status: 'running' });
        else if (ev.type === 'tool.end') emitRadarEvent(wsId, 'chat.tool', { id: ev.id, name: ev.name, status: ev.status || 'success', duration: ev.duration });
      }
      if (streamToChat) emitRadarEvent(wsId, 'chat.stream.end', {});
      if (billing && usage) await debitRadarUsage({ billing, provider: cfg.provider, model: cfg.model, usage });
    } catch (e) {
      log(`[radar-supervisor] ws ${wsId} en erreur: ${e?.message}`);
    }

    stats.signalsResolved += toolSet.actions.resolved.length;
    stats.missions += toolSet.actions.missions.length;
    stats.notifications += toolSet.actions.notifications.length;

    // Signaux non résolus par l'agent → re-pending (re-présentés, bornés par attempts)
    await RadarSignal.updateMany({ workspaceId: wsId, status: 'processing' }, { $set: { status: 'pending' } });
  }

  if (stats.workspaces) log(`[radar-supervisor] ws=${stats.workspaces} signaux=${stats.signalsResolved}/${stats.signalsClaimed} missions=${stats.missions} notifs=${stats.notifications}`);
  return stats;
}

function _supervisorLlmConfig() {
  const base = resolveRadarLlmConfig();
  if (!base) return null;
  if (base.provider === 'anthropic') {
    const env = require('../config/env');
    return { ...base, model: process.env.RADAR_SUPERVISOR_MODEL || env.ANTHROPIC_MODEL || 'claude-sonnet-4-6' };
  }
  return base;
}

module.exports = {
  runSupervisorPass,
  buildSupervisorToolSet,
  buildSupervisorSystemPrompt,
  buildBriefing,
  getRadarOverview,
  SUPERVISOR_TOOL_DEFINITIONS,
};
