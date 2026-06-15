// Radar — missions auto-promptées.
//
// Le superviseur écrit librement le prompt et les critères de succès ; la
// mission s'exécute en fond sur runHarness (le NOUVEAU harness IA — jamais
// l'ancien agent-runner), puis un agent critique léger vérifie le résultat
// contre les successCriteria. Critères non atteints → retry : la critique est
// injectée dans la tentative suivante (c'est le « ré-essai par réécriture »).
// À la fin (done/failed), un RadarWakeup immédiat re-réveille le superviseur.

const { llmCompleteJSON } = require('./llm');
const { resolveSystemActor } = require('./actor');

const MISSION_MAX_TOOL_LOOPS = 30;

/**
 * Crée une mission et (sauf dryRun) lance son exécution en fond.
 * @returns {Promise<object>} le doc RadarMission créé
 */
async function launchMission({ workspaceId, title, prompt, successCriteria = [], maxAttempts = 2, signalIds = [], dryRun = false }) {
  const RadarMission = require('../db/models/radar-mission.model');
  const mission = await RadarMission.create({
    workspaceId, title, prompt,
    successCriteria, maxAttempts: Math.min(Math.max(1, maxAttempts), 3),
    signalIds, status: 'queued',
  });
  const { emitRadarEvent } = require('./events');
  emitRadarEvent(workspaceId, 'mission.created', { missionId: mission.id, title: mission.title, status: mission.status });
  if (!dryRun) {
    setImmediate(() => runMissionLoop(mission.id).catch(e => console.error(`[radar-mission] ${mission.id} crashed:`, e?.message)));
  }
  return mission;
}

/** Prompt d'une tentative — la critique de la tentative précédente est injectée. */
function buildAttemptPrompt(mission, critique) {
  let p = `# Mission de fond du Radar d'entreprise\n\n${mission.prompt}\n\n## Critères de succès\n${(mission.successCriteria || []).map(c => `- ${c}`).join('\n') || '- Accomplir la mission décrite.'}\n\n## Méthode\n- Travaille de façon autonome avec les outils disponibles. Ne demande PAS de confirmation à l'utilisateur.\n- Sois EFFICACE : si 2-3 recherches/variantes successives ne donnent rien, la donnée n'existe probablement pas — note « non trouvé » et passe à la suite. Ne multiplie JAMAIS les variantes de la même recherche.\n- Une information introuvable chez le provider n'est pas un échec : la constater explicitement (« aucune trace de X dans Y ») fait partie d'un bon compte rendu.\n- Termine par un compte rendu factuel et complet (trouvé, fait, ET non trouvé) — il sera évalué contre les critères de succès.`;
  if (critique) {
    p += `\n\n## Tentative précédente insuffisante\nCritique de l'évaluateur :\n${critique}\nCorrige le tir : change d'approche si nécessaire.`;
  }
  return p;
}

/** Agent critique — vérifie un résultat contre les critères. Injectable pour tests. */
async function critiqueResult(mission, resultText, { complete } = {}) {
  let billing = null;
  if (!complete) {
    const { resolveBillingFor } = require('./billing');
    billing = await resolveBillingFor(mission.workspaceId, 'mission_critique');
  }
  const doComplete = complete || ((prompt, opts) => llmCompleteJSON(prompt, { ...opts, billing }));
  const out = await doComplete(`Tu es l'évaluateur strict d'une mission d'agent.

## Mission
${mission.prompt}

## Critères de succès
${(mission.successCriteria || []).map(c => `- ${c}`).join('\n') || '- Accomplir la mission décrite.'}

## Compte rendu de l'agent
${String(resultText || '(vide)').slice(0, 6000)}

Juge sur le FOND, pas sur la forme : l'objectif métier de la mission est-il atteint avec les informations disponibles ?
- Un critère portant sur une donnée qui N'EXISTE PAS chez le provider est SATISFAIT si le compte rendu le constate explicitement (« aucune trace de X ») — on ne peut pas exiger l'introuvable.
- Ne recale PAS pour des questions de présentation, de verbatim incomplet ou de preuve d'appel manquante si l'information essentielle est là.
- Recale UNIQUEMENT si une action demandée n'a pas été tentée, ou si une information essentielle ET accessible n'a pas été cherchée.
Réponds UNIQUEMENT en JSON, avec une critique COURTE (3 phrases max) : {"met": true/false, "critique": "<si false : l'essentiel de ce qui manque>"}`,
  { maxTokens: 1200 });
  if (!out) return { met: true, critique: null, skipped: true }; // pas de LLM → pas de critique bloquante
  return { met: !!out.met, critique: out.critique || null };
}

/**
 * Boucle d'exécution d'une mission (tentatives + critique + retry).
 * @param {string} missionId - RadarMission.id
 * @param {object} [deps] - injection pour tests : { runAgent, critique }
 */
async function runMissionLoop(missionId, deps = {}) {
  const RadarMission = require('../db/models/radar-mission.model');
  const RadarWakeup = require('../db/models/radar-wakeup.model');
  const mission = await RadarMission.findOne({ id: missionId });
  if (!mission || mission.status !== 'queued') return mission;

  mission.status = 'running';
  mission.startedAt = new Date();
  await mission.save();
  const { emitRadarEvent } = require('./events');
  emitRadarEvent(mission.workspaceId, 'mission.updated', { missionId: mission.id, status: 'running', attempts: mission.attempts });

  const runAgent = deps.runAgent || _defaultRunAgent;
  const critique = deps.critique || critiqueResult;

  let lastCritique = null;
  try {
    while (mission.attempts < mission.maxAttempts) {
      mission.attempts++;
      const prompt = buildAttemptPrompt(mission, lastCritique);
      const resultText = await runAgent(mission, prompt);
      let verdict;
      try { verdict = await critique(mission, resultText); }
      catch (e) {
        // L'évaluateur est en panne (JSON tronqué, réseau…) : on accepte le
        // résultat plutôt que de marquer la mission échouée à tort.
        console.warn(`[radar-mission] critique indisponible (${e?.message}) — résultat accepté`);
        verdict = { met: true, critique: null, skipped: true };
      }
      mission.history.push({ attempt: mission.attempts, result: String(resultText || '').slice(0, 4000), critiqueMet: verdict.met, critique: verdict.critique, at: new Date() });
      if (verdict.met) {
        mission.status = 'done';
        mission.result = resultText;
        mission.lastCritique = null;
        break;
      }
      lastCritique = verdict.critique || 'Résultat jugé insuffisant.';
      mission.lastCritique = lastCritique;
      await mission.save();
    }
    if (mission.status !== 'done') {
      mission.status = 'failed';
      mission.error = 'success_criteria_not_met';
      mission.result = mission.history.length ? mission.history[mission.history.length - 1].result : undefined;
    }
  } catch (e) {
    mission.status = 'failed';
    mission.error = e?.message || String(e);
  }
  mission.finishedAt = new Date();
  await mission.save();
  emitRadarEvent(mission.workspaceId, 'mission.updated', { missionId: mission.id, status: mission.status, attempts: mission.attempts, error: mission.error || undefined });

  // Re-réveiller le superviseur immédiatement avec le résultat
  await RadarWakeup.create({
    workspaceId: mission.workspaceId,
    at: new Date(),
    reason: mission.status === 'done' ? 'mission_completed' : 'mission_failed',
    payload: { missionId: mission.id, title: mission.title },
  });
  return mission;
}

/** Exécution réelle d'une tentative sur le harness (mode chat orchestrateur). */
async function _defaultRunAgent(mission, prompt) {
  const actor = await resolveSystemActor(mission.workspaceId);
  if (!actor) throw new Error('no_system_actor_for_workspace');
  const { buildContext } = require('../ai/context/context-builder');
  const { runHarness } = require('../ai/agent-harness');
  const context = await buildContext(actor);
  context._metadata = { workspaceId: actor.workspaceId, radarMissionId: mission.id };
  // Modèle des missions surchargeable (RADAR_MISSION_MODEL) — sinon celui de
  // l'assistant. Recommandé : un modèle médian (sonnet), les missions sont
  // des fouilles multi-boucles coûteuses en input.
  if (process.env.RADAR_MISSION_MODEL && context.llmConfig) context.llmConfig.model = process.env.RADAR_MISSION_MODEL;

  let text = '';
  const gen = runHarness({
    mode: 'chat',
    messages: [{ role: 'user', content: prompt }],
    context,
    metadata: context._metadata,
    agentOverrides: {
      maxToolLoops: MISSION_MAX_TOOL_LOOPS,
      // Pas de thread de chat en mission de fond : les outils qui en exigent
      // un (todo_write → "threadId manquant") ou qui attendent l'utilisateur
      // (ask_user) sont retirés.
      blockedTools: ['todo_write', 'ask_user', 'compact_and_transfer', 'attach_thread_to_flow', 'attach_thread_to_form', 'detach_thread'],
    },
  });

  // Tracking temps réel : texte streamé (throttlé) + trace des outils appelés
  const RadarMission = require('../db/models/radar-mission.model');
  const { emitRadarEvent, createMissionStreamEmitter } = require('./events');
  const streamer = createMissionStreamEmitter(mission.workspaceId, mission.id);

  for await (const ev of gen) {
    if (ev.type === 'message' && ev.text) {
      text += ev.text;
      streamer.push(text);
    } else if (ev.type === 'tool.end') {
      const entry = {
        at: new Date(),
        attempt: mission.attempts,
        name: ev.name,
        // Label du NodeTemplate résolu par le harness (ex: « Lire les e-mails »)
        // — JAMAIS le nom technique seul côté UI.
        label: ev.displayTitle || undefined,
        args: ev.args !== undefined ? JSON.stringify(ev.args).slice(0, 400) : undefined,
        status: ev.status || 'success',
        duration: ev.duration,
      };
      // Persistance progressive (plafond 100) + push temps réel — best-effort
      RadarMission.updateOne({ id: mission.id }, { $push: { trace: { $each: [entry], $slice: -100 } } }).catch(() => {});
      emitRadarEvent(mission.workspaceId, 'mission.tool', { missionId: mission.id, ...entry });
    }
  }
  streamer.end();
  return text;
}

module.exports = { launchMission, runMissionLoop, buildAttemptPrompt, critiqueResult };
