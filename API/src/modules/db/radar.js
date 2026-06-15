const express = require('express');
const { Types } = require('mongoose');
const { authMiddleware, requireCompanyScope } = require('../../auth/jwt');
const Workspace = require('../../db/models/workspace.model');
const WorkspaceMembership = require('../../db/models/workspace-membership.model');
const Provider = require('../../db/models/provider.model');
const Credential = require('../../db/models/credential.model');
const RadarConnector = require('../../db/models/radar-connector.model');
const { FAMILIES, FAMILY_KEYS, normalizeRadarBlocks } = require('../../radar/families');
const { listAvailableCapabilities, execTestCapability } = require('../../radar/capability-registry');

async function resolveWorkspaceMember(req, res) {
  const { wsId } = req.params;
  let ws;
  if (Types.ObjectId.isValid(String(wsId))) ws = await Workspace.findById(wsId);
  if (!ws) ws = await Workspace.findOne({ id: wsId });
  if (!ws || String(ws.companyId) !== req.user.companyId) { res.apiError(404, 'workspace_not_found', 'Workspace not found'); return null; }
  const member = await WorkspaceMembership.findOne({ userId: req.user.id, workspaceId: ws._id });
  if (!member) { res.apiError(403, 'not_a_member', 'User not a workspace member'); return null; }
  return ws;
}

async function findConnector(ws, id) {
  if (Types.ObjectId.isValid(String(id))) {
    const c = await RadarConnector.findOne({ _id: id, workspaceId: ws._id });
    if (c) return c;
  }
  return RadarConnector.findOne({ id: String(id), workspaceId: ws._id });
}

function publicConnector(c, provider) {
  const o = typeof c.toObject === 'function' ? c.toObject() : { ...c };
  delete o.__v;
  o.capabilities = provider !== undefined
    ? listAvailableCapabilities({ providerRadar: provider && provider.radar, capabilityOverrides: o.capabilityOverrides, family: o.family })
    : undefined;
  return o;
}

// Complète les labels manquants des traces de mission avec le TITRE réel des
// NodeTemplates (ex: execute_tool {key: email_read} → « Lire les e-mails »).
// Sert pour les missions antérieures à la capture du displayTitle.
async function enrichTraceLabels(missions) {
  const NodeTemplate = require('../../db/models/node-template.model');
  const keys = new Set();
  for (const m of missions) {
    for (const t of m.trace || []) {
      if (!t.label && t.name === 'execute_tool' && t.args) {
        const mt = /"key"\s*:\s*"([^"]+)"/.exec(t.args);
        if (mt) keys.add(mt[1]);
      }
    }
  }
  if (!keys.size) return missions;
  const tmpls = await NodeTemplate.find({ key: { $in: [...keys] } }).select('key title name').lean();
  const titleByKey = new Map(tmpls.map(t => [t.key, t.title || t.name]));
  for (const m of missions) {
    for (const t of m.trace || []) {
      if (!t.label && t.name === 'execute_tool' && t.args) {
        const mt = /"key"\s*:\s*"([^"]+)"/.exec(t.args);
        if (mt) t.label = titleByKey.get(mt[1]) || mt[1];
      }
    }
  }
  return missions;
}

// Échantillon compact pour le wizard : tronque les tableaux et les chaînes longues
function sampleOf(value, depth = 0) {
  if (value == null || depth > 4) return value == null ? value : '…';
  if (Array.isArray(value)) return value.slice(0, 5).map(v => sampleOf(v, depth + 1));
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value).slice(0, 30)) out[k] = sampleOf(v, depth + 1);
    return out;
  }
  if (typeof value === 'string' && value.length > 500) return value.slice(0, 500) + '…';
  return value;
}

// Flag global : RADAR_ENABLED=0 désactive entièrement la fonctionnalité Radar
// (routes coupées sauf /radar/config, qui dit au frontend de masquer le menu).
function radarEnabled() { return process.env.RADAR_ENABLED !== '0'; }

module.exports = function () {
  const r = express.Router();
  r.use(authMiddleware());
  r.use(requireCompanyScope());

  // Toujours disponible : le frontend lit ce flag pour afficher/masquer le Radar
  r.get('/radar/config', (req, res) => res.apiOk({ enabled: radarEnabled() }));

  // Désactivation globale : toutes les autres routes radar répondent 404
  r.use((req, res, next) => {
    if (!radarEnabled()) return res.apiError(404, 'radar_disabled', 'La fonctionnalité Radar est désactivée');
    next();
  });

  // Contrat des familles + providers disposant d'un bloc radar, groupés par famille
  r.get('/radar/families', async (req, res) => {
    const providers = await Provider.find({ enabled: true, radar: { $exists: true, $ne: null } })
      .select('key name title iconClass iconUrl color radar hasCredentials')
      .lean();
    const byFamily = {};
    for (const key of FAMILY_KEYS) {
      const fam = FAMILIES[key];
      byFamily[key] = {
        key,
        label: fam.label,
        description: fam.description,
        capabilities: Object.entries(fam.capabilities).map(([cap, c]) => ({ capability: cap, kind: c.kind, description: c.description })),
        testCapability: fam.testCapability,
        providers: [],
      };
    }
    for (const p of providers) {
      for (const block of normalizeRadarBlocks(p.radar)) {
        if (!block || !byFamily[block.family]) continue;
        byFamily[block.family].providers.push({
          key: p.key, name: p.name, title: p.title,
          iconClass: p.iconClass, iconUrl: p.iconUrl, color: p.color,
          hasCredentials: !!p.hasCredentials,
          capabilities: Object.keys(block.capabilities || {}),
        });
      }
    }
    return res.apiOk(Object.values(byFamily));
  });

  r.get('/workspaces/:wsId/radar/connectors', async (req, res) => {
    const ws = await resolveWorkspaceMember(req, res); if (!ws) return;
    const list = await RadarConnector.find({ workspaceId: ws._id }).sort({ family: 1, createdAt: 1 }).lean();
    const provByKey = new Map();
    const keys = [...new Set(list.map(c => c.providerKey))];
    if (keys.length) {
      for (const p of await Provider.find({ key: { $in: keys } }).select('key radar').lean()) provByKey.set(p.key, p);
    }
    return res.apiOk(list.map(c => publicConnector(c, provByKey.get(c.providerKey) || null)));
  });

  r.post('/workspaces/:wsId/radar/connectors', async (req, res) => {
    const ws = await resolveWorkspaceMember(req, res); if (!ws) return;
    const { family, providerKey, credentialId, label, pollingPolicy, scopeConfig, capabilityOverrides } = req.body || {};
    if (!family || !FAMILIES[family]) return res.apiError(400, 'invalid_family', `Famille inconnue (attendu: ${FAMILY_KEYS.join(', ')})`);
    if (!providerKey) return res.apiError(400, 'missing_provider', 'providerKey requis');
    const provider = await Provider.findOne({ key: providerKey }).lean();
    if (!provider) return res.apiError(404, 'provider_not_found', `Provider inconnu: ${providerKey}`);

    let credRef = undefined;
    if (credentialId) {
      const cred = Types.ObjectId.isValid(String(credentialId))
        ? await Credential.findOne({ _id: credentialId, workspaceId: ws._id }).select('_id').lean()
        : await Credential.findOne({ id: String(credentialId), workspaceId: ws._id }).select('_id').lean();
      if (!cred) return res.apiError(404, 'credential_not_found', 'Credential introuvable dans ce workspace');
      credRef = cred._id;
    }

    const caps = listAvailableCapabilities({ providerRadar: provider.radar, capabilityOverrides, family });
    if (!caps.length) return res.apiError(400, 'no_capability_mapped', `Aucune capacité '${family}' mappée pour ${providerKey} — bloc radar du manifest ou capabilityOverrides requis`);

    try {
      const doc = await RadarConnector.create({
        workspaceId: ws._id, family, providerKey,
        credentialId: credRef,
        label: label || `${provider.title || provider.name} (${FAMILIES[family].label})`,
        pollingPolicy: pollingPolicy || undefined,
        scopeConfig: scopeConfig || undefined,
        capabilityOverrides: capabilityOverrides || undefined,
        status: 'pending',
      });
      return res.apiOk(publicConnector(doc, provider));
    } catch (e) {
      if (e && e.code === 11000) return res.apiError(409, 'connector_exists', 'Ce connecteur existe déjà pour cette famille');
      throw e;
    }
  });

  r.put('/workspaces/:wsId/radar/connectors/:id', async (req, res) => {
    const ws = await resolveWorkspaceMember(req, res); if (!ws) return;
    const c = await findConnector(ws, req.params.id);
    if (!c) return res.apiError(404, 'connector_not_found', 'Connecteur introuvable');
    const { label, pollingPolicy, scopeConfig, capabilityOverrides, status, credentialId } = req.body || {};
    if (label !== undefined) c.label = label;
    if (pollingPolicy !== undefined) c.pollingPolicy = pollingPolicy;
    if (scopeConfig !== undefined) { c.scopeConfig = scopeConfig; c.markModified('scopeConfig'); }
    if (capabilityOverrides !== undefined) { c.capabilityOverrides = capabilityOverrides; c.markModified('capabilityOverrides'); }
    if (status !== undefined) {
      if (!['active', 'paused'].includes(status)) return res.apiError(400, 'invalid_status', 'Statut modifiable: active | paused');
      c.status = status;
    }
    if (credentialId !== undefined) {
      if (credentialId === null) c.credentialId = undefined;
      else {
        const cred = Types.ObjectId.isValid(String(credentialId))
          ? await Credential.findOne({ _id: credentialId, workspaceId: ws._id }).select('_id').lean()
          : await Credential.findOne({ id: String(credentialId), workspaceId: ws._id }).select('_id').lean();
        if (!cred) return res.apiError(404, 'credential_not_found', 'Credential introuvable dans ce workspace');
        c.credentialId = cred._id;
      }
    }
    await c.save();
    const provider = await Provider.findOne({ key: c.providerKey }).select('key radar').lean();
    return res.apiOk(publicConnector(c, provider));
  });

  r.delete('/workspaces/:wsId/radar/connectors/:id', async (req, res) => {
    const ws = await resolveWorkspaceMember(req, res); if (!ws) return;
    const c = await findConnector(ws, req.params.id);
    if (!c) return res.apiError(404, 'connector_not_found', 'Connecteur introuvable');
    await RadarConnector.deleteOne({ _id: c._id });
    return res.apiOk({ deleted: true });
  });

  // ── Flux temps réel du radar (SSE, même pattern que /me/credits/stream) ──
  // Événements : mission.created/updated/stream/tool, signal.created/updated,
  // board.changed, notification.created. Auth par ?token= (EventSource ne
  // porte pas de header Authorization).
  r.get('/workspaces/:wsId/radar/stream', async (req, res) => {
    const ws = await resolveWorkspaceMember(req, res); if (!ws) return;
    const wsId = String(ws._id);
    const { bus } = require('../../radar/events');

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();
    res.write(': sse-connected\n\n');

    const send = (event) => {
      try {
        res.write(`event: radar\n`);
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      } catch { /* connexion fermée */ }
    };
    send({ type: 'open', workspaceId: wsId, at: new Date().toISOString() });

    const heartbeat = setInterval(() => {
      try { res.write(`: ping ${Date.now()}\n\n`); } catch {}
    }, 25_000);

    const onEvent = (event) => {
      if (event.workspaceId !== wsId) return;
      send(event);
    };
    bus.on('radar', onEvent);

    req.on('close', () => {
      clearInterval(heartbeat);
      try { bus.off('radar', onEvent); } catch {}
      try { res.end(); } catch {}
    });
  });

  // ── Parler au radar : message direct de l'utilisateur ──
  // Crée un réveil user_message (avec contexte optionnel mission/signal/card)
  // et déclenche immédiatement une passe superviseur — la réponse arrive sur
  // le board en card (le prompt l'exige).
  r.post('/workspaces/:wsId/radar/message', async (req, res) => {
    const ws = await resolveWorkspaceMember(req, res); if (!ws) return;
    const { message, missionId, signalId, cardId } = req.body || {};
    if (!String(message || '').trim()) return res.apiError(400, 'message_required', 'Message vide');
    const RadarWakeup = require('../../db/models/radar-wakeup.model');
    const RadarChatMessage = require('../../db/models/radar-chat-message.model');
    const text = String(message).slice(0, 4000);
    const chatMsg = await RadarChatMessage.create({
      workspaceId: ws._id, role: 'user', text,
      missionId: missionId || undefined, signalId: signalId || undefined, cardId: cardId || undefined,
    });
    require('../../radar/events').emitRadarEvent(ws._id, 'chat.message', { id: chatMsg.id, role: 'user', text, at: chatMsg.createdAt });
    // Contexte chargé côté serveur (comme l'assistant) : l'utilisateur n'a pas
    // à le décrire dans son message, le superviseur le reçoit enrichi.
    let context;
    if (missionId) {
      const RadarMission = require('../../db/models/radar-mission.model');
      const mi = await RadarMission.findOne({ id: missionId, workspaceId: ws._id }).select('title status result lastCritique error').lean();
      if (mi) context = { type: 'mission', missionId, title: mi.title, status: mi.status, result: mi.result ? String(mi.result).slice(0, 1200) : undefined, error: mi.error || undefined };
    } else if (cardId) {
      const RadarCard = require('../../db/models/radar-card.model');
      const ca = await RadarCard.findOne({ id: cardId, workspaceId: ws._id }).select('title type state payload userResponse closedNote missionId').lean();
      if (ca) context = { type: 'card', cardId, title: ca.title, cardType: ca.type, state: ca.state, proposedAction: ca.payload?.proposedAction, closedNote: ca.closedNote, missionId: ca.missionId };
    } else if (signalId) {
      const RadarSignal = require('../../db/models/radar-signal.model');
      const si = await RadarSignal.findOne({ id: signalId, workspaceId: ws._id }).select('summary category status resolution').lean();
      if (si) context = { type: 'signal', signalId, summary: si.summary, category: si.category, status: si.status, resolution: si.resolution };
    }
    const wk = await RadarWakeup.create({
      workspaceId: ws._id, at: new Date(), reason: 'user_message',
      payload: {
        message: text,
        from: req.user.email || String(req.user.id),
        context,
        missionId: missionId || undefined, signalId: signalId || undefined, cardId: cardId || undefined,
      },
    });
    // Passe superviseur immédiate (sinon : prochain tick du scheduler)
    if (process.env.RADAR_SUPERVISOR_ENABLED === '1') {
      const { runSupervisorPass } = require('../../radar/supervisor');
      setImmediate(() => runSupervisorPass({ log: (m) => console.log(m) })
        .catch(e => console.error('[radar-message] passe superviseur:', e?.message)));
    }
    return res.apiOk({ ok: true, wakeupId: wk.id, messageId: chatMsg.id });
  });

  // Fil de conversation avec le radar
  r.get('/workspaces/:wsId/radar/chat', async (req, res) => {
    const ws = await resolveWorkspaceMember(req, res); if (!ws) return;
    const RadarChatMessage = require('../../db/models/radar-chat-message.model');
    const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 50));
    const list = await RadarChatMessage.find({ workspaceId: ws._id }).sort({ createdAt: -1 }).limit(limit).lean();
    return res.apiOk(list.reverse().map(m => ({ id: m.id, role: m.role, text: m.text, missionId: m.missionId, at: m.createdAt })));
  });

  // ── Board (dashboard server-driven) ──

  r.get('/workspaces/:wsId/radar/board', async (req, res) => {
    const ws = await resolveWorkspaceMember(req, res); if (!ws) return;
    const { getBoard } = require('../../radar/board');
    return res.apiOk(await getBoard(ws._id));
  });

  // Réponse utilisateur à une card : validate | modify | dismiss | answer
  // → état de la card + réveil immédiat du superviseur (card_response)
  r.post('/workspaces/:wsId/radar/cards/:cardId/respond', async (req, res) => {
    const ws = await resolveWorkspaceMember(req, res); if (!ws) return;
    const { respondToCard } = require('../../radar/board');
    const { action, note, answer, modifiedPayload } = req.body || {};
    const out = await respondToCard({
      workspaceId: ws._id, cardId: req.params.cardId,
      action, note, answer, modifiedPayload,
      userId: req.user.id,
    });
    if (!out.ok) return res.apiError(out.error === 'card_not_found' ? 404 : 400, out.error, out.error);
    return res.apiOk(out.card);
  });

  // Test de connexion (wizard) : exécute la capacité de test de la famille,
  // met à jour la santé, retourne un échantillon compact (jamais de secrets).
  r.post('/workspaces/:wsId/radar/connectors/:id/test', async (req, res) => {
    const ws = await resolveWorkspaceMember(req, res); if (!ws) return;
    const c = await findConnector(ws, req.params.id);
    if (!c) return res.apiError(404, 'connector_not_found', 'Connecteur introuvable');
    const out = await execTestCapability(c);
    c.health = c.health || {};
    c.health.lastTestAt = new Date();
    c.health.lastTestOk = !!out.ok;
    if (out.ok) {
      c.status = 'active';
      c.lastError = undefined;
      c.health.consecutiveErrors = 0;
    } else {
      c.status = 'error';
      c.lastError = out.error;
      c.health.consecutiveErrors = (c.health.consecutiveErrors || 0) + 1;
    }
    await c.save();
    require('../../radar/events').emitRadarEvent(ws._id, 'connector.updated', {
      connectorId: c.id, family: c.family, providerKey: c.providerKey,
      status: c.status, lastError: c.lastError || undefined, tested: true,
    });
    if (!out.ok) return res.apiError(422, 'test_failed', out.error);
    return res.apiOk({ ok: true, sample: sampleOf(out.result), testedCapability: out.capability || FAMILIES[c.family].testCapability });
  });

  // ── Collecte immédiate (wizard / bouton Synchroniser) ──
  // Enchaîne collecte + passe de signifiance : les changements détectés
  // deviennent immédiatement des signaux visibles (pas d'attente du scheduler).
  r.post('/workspaces/:wsId/radar/connectors/:id/collect', async (req, res) => {
    const ws = await resolveWorkspaceMember(req, res); if (!ws) return;
    const c = await findConnector(ws, req.params.id);
    if (!c) return res.apiError(404, 'connector_not_found', 'Connecteur introuvable');
    const { collectConnector } = require('../../radar/collector');
    const summary = await collectConnector(c);
    let significance = null;
    if (summary.deltas > 0 && process.env.RADAR_SIGNIFICANCE_ENABLED !== '0') {
      const { runSignificancePass } = require('../../radar/significance');
      significance = await runSignificancePass({ log: (m) => console.log(m) })
        .catch(e => ({ error: e?.message }));
    }
    return res.apiOk({ ...summary, significance });
  });

  // ── Réconciliations à la demande (sinon : fenêtre nocturne du scheduler) ──
  r.post('/workspaces/:wsId/radar/reconcile', async (req, res) => {
    const ws = await resolveWorkspaceMember(req, res); if (!ws) return;
    const { runReconciliationsForWorkspace } = require('../../radar/reconciliations');
    return res.apiOk(await runReconciliationsForWorkspace(ws._id));
  });

  // ── Activité : tout ce que le radar fait / a fait ──
  r.get('/workspaces/:wsId/radar/activity', async (req, res) => {
    const ws = await resolveWorkspaceMember(req, res); if (!ws) return;
    const RadarMission = require('../../db/models/radar-mission.model');
    const RadarSignal = require('../../db/models/radar-signal.model');
    const RadarWakeup = require('../../db/models/radar-wakeup.model');
    const RadarDelta = require('../../db/models/radar-delta.model');
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 30));
    const [missions, signals, wakeups, deltaStats] = await Promise.all([
      RadarMission.find({ workspaceId: ws._id }).sort({ createdAt: -1 }).limit(limit)
        .select('id title status attempts maxAttempts result lastCritique error signalIds trace createdAt finishedAt').lean(),
      RadarSignal.find({ workspaceId: ws._id }).sort({ createdAt: -1 }).limit(limit)
        .select('id family category urgency summary source status resolution missionIds createdAt handledAt').lean(),
      RadarWakeup.find({ workspaceId: ws._id }).sort({ at: -1 }).limit(limit)
        .select('id at reason payload status firedAt').lean(),
      RadarDelta.aggregate([
        { $match: { workspaceId: ws._id } },
        { $group: { _id: '$status', n: { $sum: 1 } } },
      ]),
    ]);
    // Observations écartées par le filtre (traçabilité : pourquoi rien n'a été remonté)
    const ignored = await RadarDelta.find({ workspaceId: ws._id, status: 'ignored' })
      .sort({ occurredAt: -1 }).limit(20)
      .select('id family entityType entityKey type classification occurredAt after.subject after.from after.title after.name').lean();
    await enrichTraceLabels(missions);
    return res.apiOk({
      missions, signals, wakeups,
      deltas: Object.fromEntries(deltaStats.map(d => [d._id, d.n])),
      ignored,
    });
  });

  // Détail d'un signal : deltas (before/after) et missions liés — pour la modal d'activité
  r.get('/workspaces/:wsId/radar/signals/:id', async (req, res) => {
    const ws = await resolveWorkspaceMember(req, res); if (!ws) return;
    const RadarSignal = require('../../db/models/radar-signal.model');
    const RadarDelta = require('../../db/models/radar-delta.model');
    const RadarMission = require('../../db/models/radar-mission.model');
    const signal = await RadarSignal.findOne({ id: req.params.id, workspaceId: ws._id }).lean();
    if (!signal) return res.apiError(404, 'signal_not_found', 'Signal introuvable');
    const [deltas, missions] = await Promise.all([
      signal.deltaIds?.length ? RadarDelta.find({ id: { $in: signal.deltaIds } }).select('-_id -__v').lean() : [],
      signal.missionIds?.length ? RadarMission.find({ id: { $in: signal.missionIds } }).select('id title status attempts result lastCritique error trace createdAt finishedAt').lean() : [],
    ]);
    await enrichTraceLabels(missions);
    return res.apiOk({ signal, deltas, missions });
  });

  // Rattrapage : l'utilisateur force le traitement d'une observation écartée
  // par le filtre → signal urgence haute, le superviseur le traite à sa
  // prochaine passe. (Le filtre s'est trompé ? L'utilisateur a le dernier mot.)
  r.post('/workspaces/:wsId/radar/deltas/:id/requalify', async (req, res) => {
    const ws = await resolveWorkspaceMember(req, res); if (!ws) return;
    const RadarDelta = require('../../db/models/radar-delta.model');
    const RadarSignal = require('../../db/models/radar-signal.model');
    const delta = await RadarDelta.findOne({ id: req.params.id, workspaceId: ws._id });
    if (!delta) return res.apiError(404, 'delta_not_found', 'Observation introuvable');
    if (delta.status === 'consumed') return res.apiError(409, 'already_processed', 'Cette observation a déjà produit un signal');

    const after = delta.after || delta.before || {};
    const what = after.subject || after.title || after.name || delta.entityKey;
    const signal = await RadarSignal.create({
      workspaceId: ws._id, connectorId: delta.connectorId, family: delta.family,
      category: (delta.classification && delta.classification.category && delta.classification.category !== 'info_only')
        ? delta.classification.category : 'user_flagged',
      urgency: 'high', source: 'rules',
      summary: `Signalé manuellement par l'utilisateur (le filtre l'avait écarté) : ${delta.entityType} « ${what} »${after.from ? ` — de ${after.from}` : ''}${after.text ? ` — extrait : ${String(after.text).slice(0, 300)}` : ''}`,
      deltaIds: [delta.id],
    });
    delta.status = 'consumed';
    delta.consumedAt = new Date();
    await delta.save();
    return res.apiOk({ ok: true, signalId: signal.id });
  });

  // ── Agenda : tout ce que le radar a fait / fera, daté (vue calendrier) ──
  // Inclut le passé (missions, signaux, cards) ET le futur (réveils planifiés).
  r.get('/workspaces/:wsId/radar/agenda', async (req, res) => {
    const ws = await resolveWorkspaceMember(req, res); if (!ws) return;
    const from = req.query.from ? new Date(String(req.query.from)) : new Date(Date.now() - 35 * 864e5);
    const to = req.query.to ? new Date(String(req.query.to)) : new Date(Date.now() + 35 * 864e5);
    const RadarMission = require('../../db/models/radar-mission.model');
    const RadarSignal = require('../../db/models/radar-signal.model');
    const RadarWakeup = require('../../db/models/radar-wakeup.model');
    const RadarCard = require('../../db/models/radar-card.model');
    const range = { $gte: from, $lte: to };
    const [missions, signals, wakeups, cards] = await Promise.all([
      RadarMission.find({ workspaceId: ws._id, createdAt: range }).select('id title status createdAt').limit(300).lean(),
      RadarSignal.find({ workspaceId: ws._id, createdAt: range }).select('id summary category urgency status createdAt').limit(300).lean(),
      RadarWakeup.find({ workspaceId: ws._id, at: range }).select('id reason status at').limit(300).lean(),
      RadarCard.find({ workspaceId: ws._id, createdAt: range }).select('id title type state createdAt').limit(300).lean(),
    ]);
    const items = [
      ...missions.map(m => ({ kind: 'mission', id: m.id, date: m.createdAt, label: m.title, status: m.status })),
      ...signals.map(s => ({ kind: 'signal', id: s.id, date: s.createdAt, label: s.summary, status: s.status, urgency: s.urgency, category: s.category })),
      ...wakeups.map(w => ({ kind: 'wakeup', id: w.id, date: w.at, label: w.reason, status: w.status })),
      ...cards.map(c => ({ kind: 'card', id: c.id, date: c.createdAt, label: c.title, status: c.state, cardType: c.type })),
    ].sort((a, b) => new Date(a.date) - new Date(b.date));
    return res.apiOk({ from, to, items });
  });

  // ── Savoir entreprise (mémoire du radar) ──
  r.get('/workspaces/:wsId/radar/knowledge', async (req, res) => {
    const ws = await resolveWorkspaceMember(req, res); if (!ws) return;
    const RadarKnowledge = require('../../db/models/radar-knowledge.model');
    const list = await RadarKnowledge.find({ workspaceId: ws._id }).sort({ topic: 1, key: 1 }).lean();
    return res.apiOk(list);
  });

  r.post('/workspaces/:wsId/radar/knowledge', async (req, res) => {
    const ws = await resolveWorkspaceMember(req, res); if (!ws) return;
    const RadarKnowledge = require('../../db/models/radar-knowledge.model');
    const { topic, key, value, confidence } = req.body || {};
    if (!key || !value) return res.apiError(400, 'missing_fields', 'key et value requis');
    const doc = await RadarKnowledge.findOneAndUpdate(
      { workspaceId: ws._id, topic: topic || 'custom', key },
      { $set: { value, confidence: confidence || 'confirmed', source: 'user_spontaneous', verifiedAt: new Date() } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    if (!doc.id) { doc.id = require('../../utils/ids').newId('rknw'); await doc.save(); }
    return res.apiOk(doc);
  });

  r.put('/workspaces/:wsId/radar/knowledge/:id', async (req, res) => {
    const ws = await resolveWorkspaceMember(req, res); if (!ws) return;
    const RadarKnowledge = require('../../db/models/radar-knowledge.model');
    const { value, confidence } = req.body || {};
    const doc = await RadarKnowledge.findOneAndUpdate(
      { id: req.params.id, workspaceId: ws._id },
      { $set: { ...(value !== undefined ? { value } : {}), ...(confidence !== undefined ? { confidence } : {}), verifiedAt: new Date() } },
      { new: true }
    );
    if (!doc) return res.apiError(404, 'knowledge_not_found', 'Entrée introuvable');
    return res.apiOk(doc);
  });

  r.delete('/workspaces/:wsId/radar/knowledge/:id', async (req, res) => {
    const ws = await resolveWorkspaceMember(req, res); if (!ws) return;
    const RadarKnowledge = require('../../db/models/radar-knowledge.model');
    await RadarKnowledge.deleteOne({ id: req.params.id, workspaceId: ws._id });
    return res.apiOk({ deleted: true });
  });

  // ── Playbooks (procédures apprises) ──
  r.get('/workspaces/:wsId/radar/playbooks', async (req, res) => {
    const ws = await resolveWorkspaceMember(req, res); if (!ws) return;
    const RadarPlaybook = require('../../db/models/radar-playbook.model');
    const list = await RadarPlaybook.find({ workspaceId: ws._id }).sort({ createdAt: -1 }).lean();
    return res.apiOk(list);
  });

  r.post('/workspaces/:wsId/radar/playbooks', async (req, res) => {
    const ws = await resolveWorkspaceMember(req, res); if (!ws) return;
    const RadarPlaybook = require('../../db/models/radar-playbook.model');
    const { name, triggerCategories, triggerDescription, procedure, autonomy } = req.body || {};
    if (!name || !procedure) return res.apiError(400, 'missing_fields', 'name et procedure requis');
    const doc = await RadarPlaybook.create({
      workspaceId: ws._id, name, procedure,
      triggerCategories: triggerCategories || [],
      triggerDescription: triggerDescription || '',
      autonomy: ['propose', 'auto_with_report', 'full_auto'].includes(autonomy) ? autonomy : 'propose',
      source: 'user_taught',
    });
    return res.apiOk(doc);
  });

  r.put('/workspaces/:wsId/radar/playbooks/:id', async (req, res) => {
    const ws = await resolveWorkspaceMember(req, res); if (!ws) return;
    const RadarPlaybook = require('../../db/models/radar-playbook.model');
    const allowed = ['name', 'triggerCategories', 'triggerDescription', 'procedure', 'autonomy', 'enabled', 'pendingApproval'];
    const patch = {};
    for (const k of allowed) if (req.body && req.body[k] !== undefined) patch[k] = req.body[k];
    // Approuver une suggestion du radar = la valider explicitement
    if (patch.pendingApproval === false) patch.source = 'user_taught';
    const doc = await RadarPlaybook.findOneAndUpdate({ id: req.params.id, workspaceId: ws._id }, { $set: patch }, { new: true });
    if (!doc) return res.apiError(404, 'playbook_not_found', 'Playbook introuvable');
    return res.apiOk(doc);
  });

  r.delete('/workspaces/:wsId/radar/playbooks/:id', async (req, res) => {
    const ws = await resolveWorkspaceMember(req, res); if (!ws) return;
    const RadarPlaybook = require('../../db/models/radar-playbook.model');
    await RadarPlaybook.deleteOne({ id: req.params.id, workspaceId: ws._id });
    return res.apiOk({ deleted: true });
  });

  return r;
};
