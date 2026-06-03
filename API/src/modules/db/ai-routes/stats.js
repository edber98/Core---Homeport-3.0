// Routes /ai/stats — KPIs admin (count threads, messages, top tools, contextes).

const AiThread = require('../../../db/models/ai-thread.model');
const AiMessage = require('../../../db/models/ai-message.model');
const AiCompanyContext = require('../../../db/models/ai-company-context.model');
const AiWorkspaceContext = require('../../../db/models/ai-workspace-context.model');
const AiUserContext = require('../../../db/models/ai-user-context.model');
const { ensureWorkspaceAccess } = require('./_shared');

module.exports = function registerStatsRoutes(r) {
  r.get('/ai/stats', async (req, res) => {
    const ws = await ensureWorkspaceAccess(req, res);
    if (!ws) return;

    try {
      const [threadCount, companyCtx, workspaceCtx] = await Promise.all([
        AiThread.countDocuments({ workspaceId: ws._id }),
        AiCompanyContext.findOne({ companyId: ws.companyId }).lean(),
        AiWorkspaceContext.findOne({ workspaceId: ws._id }).lean(),
      ]);

      // Messages count via threads de ce workspace (pas approximatif).
      const threadIds = await AiThread.find({ workspaceId: ws._id }, '_id').lean();
      const tids = threadIds.map(t => t._id);
      const wsMessageCount = tids.length ? await AiMessage.countDocuments({ threadId: { $in: tids } }) : 0;

      // Top 10 tools depuis user context
      const userCtx = await AiUserContext.findOne({ userId: req.user.id }).lean();
      const toolUsage = userCtx?.toolUsage || {};
      const topTools = Object.entries(toolUsage)
        .map(([name, count]) => ({ name, count: Number(count) || 0 }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      res.apiOk({
        threadCount,
        messageCount: wsMessageCount,
        topTools,
        companyContext: companyCtx || {},
        workspaceContext: workspaceCtx || {},
      });
    } catch (e) {
      console.error('[ai] stats error:', e?.message || e);
      res.apiError(500, 'stats_error', 'Failed to load stats');
    }
  });
};
