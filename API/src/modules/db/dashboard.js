// Dashboard aggregate endpoint — KPIs, trends, top flows, recent runs/notifications
const express = require('express');
const { authMiddleware, requireCompanyScope } = require('../../auth/jwt');
const Flow = require('../../db/models/flow.model');
const Run = require('../../db/models/run.model');
const Credential = require('../../db/models/credential.model');
const Notification = require('../../db/models/notification.model');
const Workspace = require('../../db/models/workspace.model');
const WorkspaceMembership = require('../../db/models/workspace-membership.model');
const NodeTemplate = require('../../db/models/node-template.model');
const Provider = require('../../db/models/provider.model');
const AiThread = require('../../db/models/ai-thread.model');
const AiMessage = require('../../db/models/ai-message.model');
const { Types } = require('mongoose');

module.exports = function () {
  const r = express.Router();
  r.use(authMiddleware());
  r.use(requireCompanyScope());

  r.get('/workspaces/:wsId/dashboard', async (req, res) => {
    const wsIdParam = req.params.wsId;
    // Resolve workspace (supports both ObjectId and custom string ID)
    const ws = Types.ObjectId.isValid(wsIdParam)
      ? await Workspace.findById(wsIdParam)
      : await Workspace.findOne({ id: wsIdParam });
    if (!ws || String(ws.companyId) !== req.user.companyId) {
      return res.apiError(404, 'workspace_not_found', 'Workspace not found');
    }
    const wsId = ws._id; // Use actual _id for all queries
    const member = await WorkspaceMembership.findOne({ userId: req.user.id, workspaceId: wsId });
    if (!member) return res.apiError(403, 'not_a_member', 'Not a workspace member');

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    const [
      totalFlows,
      activeFlows,
      totalRuns,
      successRuns,
      errorRuns,
      runningRuns,
      durationStatsAgg,
      totalCredentials,
      runsTrendAgg,
      topFlowsAgg,
      productionFlowsDocs,
      recentRunsDocs,
      recentNotifDocs,
      allFlowsDocs,
      aiTokensAgg,
    ] = await Promise.all([
      // KPIs
      Flow.countDocuments({ workspaceId: wsId }),
      Flow.countDocuments({ workspaceId: wsId, status: 'production' }),
      Run.countDocuments({ workspaceId: wsId, createdAt: { $gte: thirtyDaysAgo } }),
      Run.countDocuments({ workspaceId: wsId, createdAt: { $gte: thirtyDaysAgo }, status: 'success' }),
      Run.countDocuments({ workspaceId: wsId, createdAt: { $gte: thirtyDaysAgo }, status: 'error' }),
      Run.countDocuments({ workspaceId: wsId, status: 'running' }),
      // Duration stats: avg, min, max
      Run.aggregate([
        { $match: { workspaceId: wsId, createdAt: { $gte: thirtyDaysAgo }, durationMs: { $exists: true, $ne: null } } },
        { $group: { _id: null, avg: { $avg: '$durationMs' }, min: { $min: '$durationMs' }, max: { $max: '$durationMs' } } },
      ]),
      Credential.countDocuments({ workspaceId: wsId }),

      // Runs trend (1 year, daily)
      Run.aggregate([
        { $match: { workspaceId: wsId, createdAt: { $gte: oneYearAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            total: { $sum: 1 },
            success: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
            error: { $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Top flows (by run count, last 30 days)
      Run.aggregate([
        { $match: { workspaceId: wsId, createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: '$flowId',
            runCount: { $sum: 1 },
            successCount: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
            errorCount: { $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] } },
            avgDurationMs: { $avg: '$durationMs' },
          },
        },
        { $sort: { runCount: -1 } },
        { $limit: 5 },
      ]),

      // Production flows
      Flow.find(
        { workspaceId: wsId, status: 'production', deployedAt: { $ne: null } },
        'id name triggerType deployedAt'
      ).sort({ deployedAt: -1 }).limit(10).lean(),

      // Recent runs
      Run.find(
        { workspaceId: wsId },
        'id flowId status startedAt durationMs'
      ).sort({ createdAt: -1 }).limit(10).lean(),

      // Recent notifications (unread)
      Notification.find(
        { workspaceId: wsId, acknowledged: false },
        'code message severity link createdAt'
      ).sort({ createdAt: -1 }).limit(5).lean(),

      // All flows for node template extraction
      Flow.find({ workspaceId: wsId }, 'graph').lean(),

      // AI token usage (30 days) — aggregate via threads
      AiThread.find({ workspaceId: wsId }, '_id').lean().then(async (threads) => {
        if (!threads.length) return { totalInput: 0, totalOutput: 0 };
        const tids = threads.map(t => t._id);
        const agg = await AiMessage.aggregate([
          { $match: { threadId: { $in: tids }, createdAt: { $gte: thirtyDaysAgo }, 'usage.input': { $exists: true } } },
          { $group: { _id: null, totalInput: { $sum: '$usage.input' }, totalOutput: { $sum: '$usage.output' } } },
        ]);
        return agg[0] || { totalInput: 0, totalOutput: 0 };
      }),
    ]);

    // Resolve flow names for top flows and recent runs
    const flowIds = [
      ...topFlowsAgg.map(t => t._id),
      ...recentRunsDocs.map(r => r.flowId),
      ...productionFlowsDocs.map(f => f._id),
    ].filter(Boolean);
    const flowDocs = flowIds.length
      ? await Flow.find({ _id: { $in: flowIds } }, 'id name').lean()
      : [];
    const flowMap = new Map(flowDocs.map(f => [String(f._id), f]));

    // Also get last run info for production flows
    const productionFlowIds = productionFlowsDocs.map(f => f._id);
    let lastRunMap = new Map();
    if (productionFlowIds.length) {
      const lastRuns = await Run.aggregate([
        { $match: { flowId: { $in: productionFlowIds } } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: '$flowId', lastRunAt: { $first: '$startedAt' }, lastRunStatus: { $first: '$status' } } },
      ]);
      lastRunMap = new Map(lastRuns.map(r => [String(r._id), r]));
    }

    // Extract top node templates from flow graphs
    const templateCounts = {};
    for (const f of allFlowsDocs) {
      const nodes = f.graph?.nodes || [];
      for (const n of nodes) {
        const model = (n.data && n.data.model) || n.model || n.data || {};
        const key = model.template || model.templateObj?.id || model.templateObj?.key || model.name || '';
        if (key && typeof key === 'string') {
          const norm = key.trim().toLowerCase().replace(/^tmpl_|^template_|^fn_|^node_/g, '').replace(/[^a-z0-9_]/g, '_');
          if (norm && norm !== 'start') {
            templateCounts[norm] = (templateCounts[norm] || 0) + 1;
          }
        }
      }
    }
    const topTemplateKeys = Object.entries(templateCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // Resolve template names + provider icons
    const tplKeys = topTemplateKeys.map(([k]) => k);
    const tplDocs = tplKeys.length ? await NodeTemplate.find({ key: { $in: tplKeys } }, 'key title providerKey').lean() : [];
    const tplMap = new Map(tplDocs.map(t => [t.key, t]));

    // Fetch provider icons
    const providerKeys = [...new Set(tplDocs.map(t => t.providerKey).filter(Boolean))];
    const providerDocs = providerKeys.length ? await Provider.find({ key: { $in: providerKeys } }, 'key iconUrl color').lean() : [];
    const providerMap = new Map(providerDocs.map(p => [p.key, p]));

    const topNodeTemplates = topTemplateKeys.map(([key, count]) => {
      const tpl = tplMap.get(key);
      const prov = tpl?.providerKey ? providerMap.get(tpl.providerKey) : null;
      return {
        key,
        name: tpl?.title || key,
        count,
        iconUrl: prov?.iconUrl || null,
        color: prov?.color || null,
      };
    });

    const durationStats = durationStatsAgg[0] || { avg: 0, min: 0, max: 0 };

    const result = {
      kpis: {
        totalFlows,
        activeFlows,
        totalRuns,
        successRuns,
        errorRuns,
        runningRuns,
        avgDurationMs: Math.round(durationStats.avg || 0),
        minDurationMs: Math.round(durationStats.min || 0),
        maxDurationMs: Math.round(durationStats.max || 0),
        totalCredentials,
        aiTokensInput: aiTokensAgg.totalInput || 0,
        aiTokensOutput: aiTokensAgg.totalOutput || 0,
        aiTokensTotal: (aiTokensAgg.totalInput || 0) + (aiTokensAgg.totalOutput || 0),
      },
      runsTrend: runsTrendAgg.map(d => ({
        date: d._id,
        total: d.total,
        success: d.success,
        error: d.error,
      })),
      topFlows: topFlowsAgg.map(t => {
        const f = flowMap.get(String(t._id));
        return {
          flowId: f?.id || String(t._id),
          name: f?.name || 'Inconnu',
          runCount: t.runCount,
          successCount: t.successCount,
          errorCount: t.errorCount,
          avgDurationMs: Math.round(t.avgDurationMs || 0),
        };
      }),
      topNodeTemplates,
      productionFlows: productionFlowsDocs.map(f => {
        const lr = lastRunMap.get(String(f._id));
        return {
          flowId: f.id,
          name: f.name,
          triggerType: f.triggerType,
          deployedAt: f.deployedAt,
          lastRunAt: lr?.lastRunAt || null,
          lastRunStatus: lr?.lastRunStatus || null,
        };
      }),
      recentRuns: recentRunsDocs.map(r => {
        const f = flowMap.get(String(r.flowId));
        return {
          runId: r.id || String(r._id),
          flowId: f?.id || String(r.flowId),
          flowName: f?.name || 'Inconnu',
          status: r.status,
          startedAt: r.startedAt,
          durationMs: r.durationMs,
        };
      }),
      recentNotifications: recentNotifDocs.map(n => ({
        id: String(n._id),
        code: n.code,
        message: n.message,
        severity: n.severity,
        link: n.link,
        createdAt: n.createdAt,
      })),
    };

    res.apiOk(result);
  });

  return r;
};
