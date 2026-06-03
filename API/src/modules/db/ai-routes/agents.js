// Routes /ai/agents/* — agents système (provider:xxx) + agents custom (aia_xxx).
//
// Mount : `require('./ai-routes/agents')(r)` depuis ai.js.
//
//   GET    /ai/agents/available     liste unifiée (système + custom) pour le sélecteur UI
//   GET    /ai/agents               liste des AiAgent custom (admin)
//   POST   /ai/agents               créer agent custom
//   PUT    /ai/agents/:agentId      MAJ agent
//   DELETE /ai/agents/:agentId      supprimer

const AiAgent = require('../../../db/models/ai-agent.model');
const Credential = require('../../../db/models/credential.model');
const Provider = require('../../../db/models/provider.model');
const NodeTemplate = require('../../../db/models/node-template.model');
const { ensureWorkspaceAccess } = require('./_shared');

const UPDATABLE_FIELDS = [
  'name', 'description', 'icon', 'color', 'systemPrompt', 'mode',
  'allowedProviders', 'allowedTemplateKeys', 'llmProvider', 'llmModel',
  'toolGroups', 'blockedTools', 'maxToolLoops', 'routerBehavior',
  'autonomyLevel', 'enabled', 'workspaceId',
];

module.exports = function registerAgentRoutes(r) {
  // ── Available agents : système (via credentials) + custom (DB) ─────
  r.get('/ai/agents/available', async (req, res) => {
    const ws = await ensureWorkspaceAccess(req, res);
    if (!ws) return;

    try {
      // 1. Agent général en premier
      const agents = [
        { id: 'general', name: 'Général', description: 'Assistant polyvalent', icon: null, type: 'system', toolCount: 0 },
      ];

      // 2. Agents système : 1 par provider ayant des credentials
      const credentials = await Credential.find({ workspaceId: ws._id }, 'name providerKey').lean();
      const providerKeys = [...new Set(credentials.map(c => c.providerKey))];
      let countMap = new Map();
      if (providerKeys.length) {
        const providers = await Provider.find({ key: { $in: providerKeys } }, 'key name title iconUrl').lean();
        const toolCounts = await NodeTemplate.aggregate([
          { $match: { providerKey: { $in: providerKeys }, enabled: { $ne: false } } },
          { $group: { _id: '$providerKey', count: { $sum: 1 } } },
        ]);
        countMap = new Map(toolCounts.map(t => [t._id, t.count]));

        for (const p of providers) {
          agents.push({
            id: `provider:${p.key}`,
            name: p.title || p.name,
            description: `Spécialiste ${p.title || p.name} (${countMap.get(p.key) || 0} actions)`,
            icon: p.iconUrl || null,
            type: 'system',
            toolCount: countMap.get(p.key) || 0,
          });
        }
      }

      // 3. Agents custom DB
      const customFilter = { companyId: ws.companyId, enabled: { $ne: false } };
      if (ws._id) customFilter.$or = [{ workspaceId: ws._id }, { workspaceId: { $exists: false } }, { workspaceId: null }];
      const customAgents = await AiAgent.find(customFilter).sort({ createdAt: -1 }).lean();
      for (const a of customAgents) {
        let customToolCount = 0;
        if (a.allowedProviders?.length) {
          for (const pk of a.allowedProviders) customToolCount += countMap.get(pk) || 0;
        }
        agents.push({
          id: a.id,
          name: a.name,
          description: a.description || '',
          icon: a.icon || null,
          type: 'custom',
          toolCount: customToolCount,
          allowedProviders: a.allowedProviders || [],
          autonomyLevel: a.autonomyLevel || 'autonomous',
        });
      }

      res.apiOk(agents);
    } catch (e) {
      console.error('[ai] agents/available error:', e?.message || e);
      res.apiError(500, 'agents_error', 'Failed to load available agents');
    }
  });

  // ── List agents custom (admin) ─────────────────────────────────────
  r.get('/ai/agents', async (req, res) => {
    const filter = { companyId: req.user.companyId };
    if (req.query.workspaceId) filter.workspaceId = req.query.workspaceId;
    const list = await AiAgent.find(filter).sort({ createdAt: -1 }).lean();
    res.apiOk(list);
  });

  // ── Create agent custom ────────────────────────────────────────────
  r.post('/ai/agents', async (req, res) => {
    const b = req.body || {};
    if (!b.name) return res.apiError(400, 'name_required', 'Agent name is required');
    const agent = await AiAgent.create({
      companyId: req.user.companyId,
      workspaceId: b.workspaceId || undefined,
      name: b.name,
      description: b.description || '',
      icon: b.icon || '',
      color: b.color || '',
      systemPrompt: b.systemPrompt || '',
      mode: b.mode || 'chat',
      allowedProviders: b.allowedProviders || [],
      allowedTemplateKeys: b.allowedTemplateKeys || [],
      llmProvider: b.llmProvider || undefined,
      llmModel: b.llmModel || undefined,
      toolGroups: b.toolGroups || [],
      blockedTools: b.blockedTools || [],
      maxToolLoops: b.maxToolLoops || 40,
      routerBehavior: b.routerBehavior || 'auto',
      autonomyLevel: b.autonomyLevel || 'autonomous',
      createdBy: req.user.id,
    });
    res.status(201).json({ success: true, data: agent, requestId: req.requestId, ts: Date.now() });
  });

  // ── Update agent ───────────────────────────────────────────────────
  r.put('/ai/agents/:agentId', async (req, res) => {
    const agent = await AiAgent.findOne({ id: req.params.agentId, companyId: req.user.companyId });
    if (!agent) return res.apiError(404, 'agent_not_found', 'Agent not found');
    for (const k of UPDATABLE_FIELDS) {
      if (req.body[k] !== undefined) agent[k] = req.body[k];
    }
    await agent.save();
    res.apiOk(agent);
  });

  // ── Delete agent ───────────────────────────────────────────────────
  r.delete('/ai/agents/:agentId', async (req, res) => {
    const agent = await AiAgent.findOne({ id: req.params.agentId, companyId: req.user.companyId });
    if (!agent) return res.apiError(404, 'agent_not_found', 'Agent not found');
    await AiAgent.deleteOne({ _id: agent._id });
    res.apiOk(true);
  });
};
