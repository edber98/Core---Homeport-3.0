const express = require('express');
const { Types } = require('mongoose');
const { authMiddleware, requireCompanyScope, requireAdmin } = require('../../auth/jwt');
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

// Flag global : le Radar est DÉSACTIVÉ par défaut. Il faut RADAR_ENABLED
// explicitement à 1/true/on/yes pour l'activer (routes + menu + scheduler).
// /radar/config reste toujours servie pour informer le frontend.
function radarEnabled() {
  return ['1', 'true', 'on', 'yes'].includes(String(process.env.RADAR_ENABLED || '').trim().toLowerCase());
}

module.exports = function () {
  const r = express.Router();
  r.use(authMiddleware());
  r.use(requireCompanyScope());

  // Toujours disponible : le frontend lit ce flag pour afficher/masquer le Radar
  r.get('/radar/config', (req, res) => res.apiOk({ enabled: radarEnabled() }));

  // ── RESET RADAR (admin) : purge des données du workspace, comme reparti à zéro ──
  // Modèles radar groupés par catégorie de purge (clé = nom affiché côté UI).
  const RADAR_RESET_GROUPS = {
    observations: ['radar-snapshot.model', 'radar-delta.model'],
    signaux: ['radar-signal.model'],
    missions: ['radar-mission.model', 'radar-wakeup.model'],
    board: ['radar-card.model'],
    chat: ['radar-chat-message.model'],
    memoire: ['radar-knowledge.model'],        // savoir entreprise
    procedures: ['radar-playbook.model'],       // playbooks
    graphe: ['radar-entity.model', 'radar-relation.model'], // graphe (entités + relations, par workspace)
    apprentissage: ['radar-feedback.model'],    // dataset de feedback (Étage 2)
    connecteurs: ['radar-connector.model'],     // les connexions elles-mêmes
  };

  // Compteurs (pour afficher « X snapshots, Y signaux… » avant de purger)
  r.get('/workspaces/:wsId/radar/reset/counts', requireAdmin(), async (req, res) => {
    const ws = await resolveWorkspaceMember(req, res); if (!ws) return;
    const counts = {};
    for (const [group, models] of Object.entries(RADAR_RESET_GROUPS)) {
      let n = 0;
      for (const mf of models) {
        try { n += await require(`../../db/models/${mf}`).countDocuments({ workspaceId: ws._id }); } catch {}
      }
      counts[group] = n;
    }
    return res.apiOk({ counts });
  });

  // Purge effective. Body : { groups: ["observations","signaux",...] } ou { all: true }.
  // Confirmation : { confirm: "<nom exact du workspace>" } obligatoire.
  r.post('/workspaces/:wsId/radar/reset', requireAdmin(), async (req, res) => {
    const ws = await resolveWorkspaceMember(req, res); if (!ws) return;
    const { groups, all, confirm } = req.body || {};
    if (String(confirm || '') !== String(ws.name)) {
      return res.apiError(400, 'confirm_mismatch', `Confirmation requise : retape le nom exact du workspace (« ${ws.name} »)`);
    }
    const selected = all ? Object.keys(RADAR_RESET_GROUPS)
      : (Array.isArray(groups) ? groups.filter(g => RADAR_RESET_GROUPS[g]) : []);
    if (!selected.length) return res.apiError(400, 'nothing_selected', 'Aucune donnée sélectionnée à purger');

    // Si on purge les connecteurs, cascader leur mémoire dérivée (snapshots, deltas,
    // entités, relations) — la mémoire est liée au connecteur qui l'a produite.
    if (selected.includes('connecteurs')) {
      const { purgeConnectorData } = require('../../radar/cleanup');
      const connectors = await RadarConnector.find({ workspaceId: ws._id });
      for (const c of connectors) { try { await purgeConnectorData(c); } catch {} }
    }
    const deleted = {};
    for (const group of selected) {
      let n = 0;
      for (const mf of RADAR_RESET_GROUPS[group]) {
        try { const r2 = await require(`../../db/models/${mf}`).deleteMany({ workspaceId: ws._id }); n += r2.deletedCount || 0; } catch {}
      }
      deleted[group] = n;
    }
    console.log(`[radar-reset] ws=${ws._id} par ${req.user.email || req.user.id} → ${JSON.stringify(deleted)}`);
    return res.apiOk({ ok: true, deleted });
  });

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

  // Registre d'ontologie : les coreTypes + sous-types + champs canoniques.
  // Lu depuis la base (seedé au démarrage) ; fallback sur le seed pur si vide.
  r.get('/radar/ontology', async (req, res) => {
    const RadarOntologyType = require('../../db/models/radar-ontology-type.model');
    let types = await RadarOntologyType.find({ workspaceId: null, status: 'active' })
      .select('key coreType subtype label canonicalFields category source').sort({ coreType: 1, subtype: 1 }).lean();
    if (!types.length) {
      const { buildOntologyRows } = require('../../radar/graph/ontology-seed');
      types = buildOntologyRows();
    }
    const { CORE_TYPES, RELATION_TYPES, RELATION_LABELS, ROLES, ROLE_LABELS } = require('../../radar/graph/ontology');
    const byCore = {};
    for (const t of types) {
      (byCore[t.coreType] ||= { coreType: t.coreType, label: CORE_TYPES[t.coreType]?.label, subtypes: [] })
        .subtypes.push({ subtype: t.subtype, key: t.key, label: t.label, category: t.category, canonicalFields: t.canonicalFields });
    }
    // Cartes de libellés FR pour l'UI (coreType, sous-type, relation, rôle)
    const coreLabels = {}; const subtypeLabels = {};
    for (const c of Object.values(byCore)) {
      coreLabels[c.coreType] = c.label || c.coreType;
      for (const s of c.subtypes) if (s.subtype) subtypeLabels[`${c.coreType}.${s.subtype}`] = s.label || s.subtype;
    }
    return res.apiOk({
      coreTypes: Object.values(byCore),
      relationTypes: RELATION_TYPES, roles: ROLES,
      coreLabels, subtypeLabels, relationLabels: RELATION_LABELS, roleLabels: ROLE_LABELS,
    });
  });

  // ── GRAPHE (Knowledge Graph — entités + relations) ──
  // Résumé : compteurs par type d'entité et de relation.
  r.get('/workspaces/:wsId/radar/graph/summary', async (req, res) => {
    const ws = await resolveWorkspaceMember(req, res); if (!ws) return;
    const graph = require('../../radar/graph/query');
    return res.apiOk(await graph.graphSummary(ws._id));
  });

  // Vue graphe : entités filtrées + relations entre elles (pour l'affichage vflow).
  r.get('/workspaces/:wsId/radar/graph', async (req, res) => {
    const ws = await resolveWorkspaceMember(req, res); if (!ws) return;
    const { coreType, subtype, role, q, limit } = req.query || {};
    const graph = require('../../radar/graph/query');
    return res.apiOk(await graph.graphData(ws._id, { coreType, subtype, role, q, limit: Number(limit) || 300 }));
  });

  // Liste d'entités (table), filtrable.
  r.get('/workspaces/:wsId/radar/graph/entities', async (req, res) => {
    const ws = await resolveWorkspaceMember(req, res); if (!ws) return;
    const { coreType, subtype, role, q, limit } = req.query || {};
    const graph = require('../../radar/graph/query');
    return res.apiOk(await graph.listEntities(ws._id, { coreType, subtype, role, q, limit: Number(limit) || 100 }));
  });

  // Voisinage d'une entité (sous-graphe). :key = canonicalKey (URL-encodé).
  r.get('/workspaces/:wsId/radar/graph/entities/:key/neighborhood', async (req, res) => {
    const ws = await resolveWorkspaceMember(req, res); if (!ws) return;
    const graph = require('../../radar/graph/query');
    const depth = Math.min(Math.max(Number(req.query?.depth) || 1, 1), 3);
    const n = await graph.neighborhood(ws._id, req.params.key, { depth });
    if (!n) return res.apiError(404, 'entity_not_found', 'Entité introuvable');
    return res.apiOk(n);
  });

  // Lignée d'une entité : snapshots bruts + mappings appliqués (traçabilité).
  r.get('/workspaces/:wsId/radar/graph/entities/:key/lineage', async (req, res) => {
    const ws = await resolveWorkspaceMember(req, res); if (!ws) return;
    const graph = require('../../radar/graph/query');
    const l = await graph.lineage(ws._id, req.params.key);
    if (!l) return res.apiError(404, 'entity_not_found', 'Entité introuvable');
    return res.apiOk(l);
  });

  // Process mining (style Celonis) : processus découverts depuis les cycles de vie.
  r.get('/workspaces/:wsId/radar/process', async (req, res) => {
    const ws = await resolveWorkspaceMember(req, res); if (!ws) return;
    const { coreType, subtype } = req.query || {};
    const { mineProcesses } = require('../../radar/process/miner');
    return res.apiOk({ processes: await mineProcesses(ws._id, { coreType, subtype }) });
  });

  // ── Contexte entreprise : décrit le métier pour que le cerveau l'interprète ──
  r.get('/workspaces/:wsId/radar/context', async (req, res) => {
    const ws = await resolveWorkspaceMember(req, res); if (!ws) return;
    const ctx = await require('../../radar/context').getContext(ws._id);
    return res.apiOk({ context: ctx || null, needsSetup: !ctx || !ctx.description });
  });
  r.put('/workspaces/:wsId/radar/context', async (req, res) => {
    const ws = await resolveWorkspaceMember(req, res); if (!ws) return;
    const { description } = req.body || {};
    if (!description || !String(description).trim()) return res.apiError(400, 'missing_description', 'Description requise');
    try {
      const ctx = await require('../../radar/context').saveContext(ws._id, String(description));
      return res.apiOk({ context: ctx });
    } catch (e) { return res.apiError(500, 'context_error', e?.message || String(e)); }
  });

  // Process mining CROSS-LOGICIEL (object-centric, par client) : flux inter-logiciels
  // + actions parallèles (devis validé → dossier Nextcloud + projet OpenProject).
  r.get('/workspaces/:wsId/radar/process/cross', async (req, res) => {
    const ws = await resolveWorkspaceMember(req, res); if (!ws) return;
    const { mineCrossProcess } = require('../../radar/process/cross-miner');
    return res.apiOk(await mineCrossProcess(ws._id, {}));
  });

  // Analyse (cerveau) : goulots, retards, anomalies de corrélation, financier.
  r.get('/workspaces/:wsId/radar/analytics', async (req, res) => {
    const ws = await resolveWorkspaceMember(req, res); if (!ws) return;
    const { analyzeWorkspace } = require('../../radar/analytics');
    return res.apiOk(await analyzeWorkspace(ws._id));
  });

  // Recommandations d'action (cerveau) : « quoi faire » + forecasting financier.
  r.get('/workspaces/:wsId/radar/recommendations', async (req, res) => {
    const ws = await resolveWorkspaceMember(req, res); if (!ws) return;
    const { recommend } = require('../../radar/recommendations');
    return res.apiOk(await recommend(ws._id));
  });

  // Capteurs / production : séries, tendances, anomalies (R5).
  r.get('/workspaces/:wsId/radar/sensors', async (req, res) => {
    const ws = await resolveWorkspaceMember(req, res); if (!ws) return;
    const { analyzeSensors } = require('../../radar/sensors');
    return res.apiOk({ series: await analyzeSensors(ws._id) });
  });

  // Doublons / double-saisie (R4.2).
  r.get('/workspaces/:wsId/radar/duplicates', async (req, res) => {
    const ws = await resolveWorkspaceMember(req, res); if (!ws) return;
    const { findDuplicates } = require('../../radar/duplicates');
    return res.apiOk({ duplicates: await findDuplicates(ws._id) });
  });

  // Dérive de schéma (R3.1) : mappings dont la source a changé.
  r.get('/workspaces/:wsId/radar/drift', async (req, res) => {
    const ws = await resolveWorkspaceMember(req, res); if (!ws) return;
    const { detectDrift } = require('../../radar/graph/drift');
    return res.apiOk({ drift: await detectDrift(ws._id) });
  });

  // Échéances & SLA (R4.3).
  r.get('/workspaces/:wsId/radar/deadlines', async (req, res) => {
    const ws = await resolveWorkspaceMember(req, res); if (!ws) return;
    const { findDeadlines } = require('../../radar/deadlines');
    return res.apiOk({ deadlines: await findDeadlines(ws._id) });
  });

  // ── ACTIONS (S4) : le Radar agit sur le graphe (fusion/rattachement) ──
  r.post('/workspaces/:wsId/radar/actions/merge', async (req, res) => {
    const ws = await resolveWorkspaceMember(req, res); if (!ws) return;
    const { keepKey, dropKey } = req.body || {};
    if (!keepKey || !dropKey) return res.apiError(400, 'missing_keys', 'keepKey et dropKey requis');
    const out = await require('../../radar/actions').mergeEntities(ws._id, String(keepKey), String(dropKey));
    return out.ok ? res.apiOk(out) : res.apiError(400, out.error, out.error);
  });
  r.post('/workspaces/:wsId/radar/actions/correlate', async (req, res) => {
    const ws = await resolveWorkspaceMember(req, res); if (!ws) return;
    const { fromKey, toKey, role } = req.body || {};
    if (!fromKey || !toKey) return res.apiError(400, 'missing_keys', 'fromKey et toKey requis');
    return res.apiOk(await require('../../radar/actions').applyCorrelation(ws._id, String(fromKey), String(toKey), role || 'client'));
  });

  // Snapshots bruts (données observées) — filtrables par entityType. Traçabilité.
  r.get('/workspaces/:wsId/radar/snapshots', async (req, res) => {
    const ws = await resolveWorkspaceMember(req, res); if (!ws) return;
    const RadarSnapshot = require('../../db/models/radar-snapshot.model');
    const { entityType, connectorId, limit } = req.query || {};
    const q = { workspaceId: ws._id, deletedAt: null };
    if (entityType) q.entityType = entityType;
    if (connectorId && Types.ObjectId.isValid(String(connectorId))) q.connectorId = connectorId;
    const [items, byType] = await Promise.all([
      RadarSnapshot.find(q).sort({ lastChangedAt: -1, lastSeenAt: -1 })
        .limit(Math.min(Number(limit) || 100, 500))
        .select('connectorId family entityType entityKey contentHash data firstSeenAt lastSeenAt lastChangedAt').lean(),
      RadarSnapshot.aggregate([
        { $match: { workspaceId: ws._id, deletedAt: null } },
        { $group: { _id: '$entityType', n: { $sum: 1 } } },
        { $sort: { n: -1 } },
      ]),
    ]);
    return res.apiOk({ items, byType: byType.map(b => ({ entityType: b._id, count: b.n })) });
  });

  // Mappings actifs (schémas raw→ontologie) — global + workspace.
  r.get('/workspaces/:wsId/radar/mappings', async (req, res) => {
    const ws = await resolveWorkspaceMember(req, res); if (!ws) return;
    const RadarMapping = require('../../db/models/radar-mapping.model');
    const list = await RadarMapping.find({ status: { $ne: 'deprecated' }, $or: [{ workspaceId: ws._id }, { workspaceId: null }] })
      .sort({ providerKey: 1, rawEntityType: 1 }).lean();
    return res.apiOk(list);
  });

  // Apprentissage du mapping (LLM) pour un connecteur : échantillonne une capacité,
  // infère le mapping + dérive la watch. Rend n'importe quel logiciel connectable
  // sans code (SAP, ERP industriels…). Body : { capability, entity, activate? }.
  r.post('/workspaces/:wsId/radar/connectors/:id/learn', async (req, res) => {
    const ws = await resolveWorkspaceMember(req, res); if (!ws) return;
    const connector = await findConnector(ws, req.params.id);
    if (!connector) return res.apiError(404, 'connector_not_found', 'Connecteur introuvable');
    const { capability, entity, activate } = req.body || {};
    if (!capability || !entity) return res.apiError(400, 'missing_params', 'capability et entity requis');
    const { learnConnectorEntity, saveLearnedMapping } = require('../../radar/graph/learn-watch');
    try {
      const out = await learnConnectorEntity({ connector, capability, entity });
      if (!out.ok) return res.apiError(422, 'learn_failed', out.error);
      const saved = await saveLearnedMapping(out.mapping, { workspaceId: ws._id, activate: !!activate && out.valid });
      return res.apiOk({ mapping: saved, watch: out.watch, valid: out.valid, errors: out.errors, sampleCount: out.sampleCount });
    } catch (e) {
      return res.apiError(500, 'learn_error', e?.message || String(e));
    }
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
    // Cascade : on purge la mémoire dérivée de ce connecteur (snapshots, deltas,
    // entités/relations orphelines). Une entité vue par d'autres connecteurs survit.
    const purged = await require('../../radar/cleanup').purgeConnectorData(c);
    await RadarConnector.deleteOne({ _id: c._id });
    return res.apiOk({ deleted: true, purged });
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
    // Étage 2 — chaque réponse devient un exemple d'apprentissage (best-effort, gardé par flag)
    require('../../radar/feedback').emitFeedback({
      workspaceId: ws._id, userId: req.user.id, action,
      targetKind: 'card', targetId: req.params.cardId,
      taskType: out.card?.type === 'question' ? 'answer' : 'alert_relevance',
      features: { cardType: out.card?.type, section: out.card?.section, priority: out.card?.priority },
      label: action, rawAfter: modifiedPayload,
    }).catch(() => {});
    return res.apiOk(out.card);
  });

  // Statistiques d'apprentissage (dataset de feedback) — pour l'UI supervision.
  r.get('/workspaces/:wsId/radar/learning/stats', async (req, res) => {
    const ws = await resolveWorkspaceMember(req, res); if (!ws) return;
    const { feedbackStats, learningEnabled } = require('../../radar/feedback');
    return res.apiOk({ enabled: learningEnabled(), feedback: await feedbackStats(ws._id) });
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
    // Étage 2 — la requalification est un signal d'apprentissage fort (le filtre s'est trompé)
    require('../../radar/feedback').emitFeedback({
      workspaceId: ws._id, userId: req.user.id, action: 'requalify',
      targetKind: 'delta', targetId: delta.id, taskType: 'significance',
      features: { entityType: delta.entityType, family: delta.family, category: delta.classification?.category },
      label: 'significant',
    }).catch(() => {});
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
