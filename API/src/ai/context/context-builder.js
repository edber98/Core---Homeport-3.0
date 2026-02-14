// Build the full AI context from company + workspace + user data
const AiCompanyContext = require('../../db/models/ai-company-context.model');
const AiWorkspaceContext = require('../../db/models/ai-workspace-context.model');
const AiUserContext = require('../../db/models/ai-user-context.model');
const Credential = require('../../db/models/credential.model');
const Provider = require('../../db/models/provider.model');
const NodeTemplate = require('../../db/models/node-template.model');
const Flow = require('../../db/models/flow.model');
const Form = require('../../db/models/form.model');
const env = require('../../config/env');

async function buildContext({ companyId, workspaceId, userId }) {
  // Load 3 levels + recent flows/forms in parallel
  const [company, workspace, user, recentFlowDocs, recentFormDocs] = await Promise.all([
    AiCompanyContext.findOne({ companyId }).lean().catch(() => null),
    AiWorkspaceContext.findOne({ workspaceId }).lean().catch(() => null),
    AiUserContext.findOne({ userId }).lean().catch(() => null),
    Flow.find({ workspaceId }, 'id name description status graph').sort({ updatedAt: -1 }).limit(20).lean().catch(() => []),
    Form.find({ workspaceId }, 'id name description status schema').sort({ updatedAt: -1 }).limit(20).lean().catch(() => []),
  ]);

  // Auto-detect services from credentials
  const credentials = await Credential.find({ workspaceId }, 'name providerKey').lean();
  const providerKeys = [...new Set(credentials.map(c => c.providerKey))];
  const providers = await Provider.find(
    { key: { $in: providerKeys } },
    'key name title iconUrl'
  ).lean();

  // Count tools per provider
  const toolCounts = await NodeTemplate.aggregate([
    { $match: { providerKey: { $in: providerKeys }, enabled: { $ne: false } } },
    { $group: { _id: '$providerKey', count: { $sum: 1 } } },
  ]);
  const countMap = new Map(toolCounts.map(t => [t._id, t.count]));

  // Build compact flow summaries with providers
  const recentFlows = (recentFlowDocs || []).map(f => {
    const nodes = f.graph?.nodes || [];
    const providerSet = new Set();
    for (const n of nodes) {
      const appId = n.data?.templateObj?.appId || n.data?.templateObj?.providerKey;
      if (appId) providerSet.add(appId);
    }
    return {
      id: f.id, name: f.name, description: f.description || '',
      status: f.status, nodeCount: nodes.length, providers: [...providerSet],
    };
  });

  // Build compact form summaries
  const recentForms = (recentFormDocs || []).map(f => {
    const fields = f.schema?.fields || f.schema?.sections?.flatMap(s => s.fields || []) || [];
    return {
      id: f.id, name: f.name, description: f.description || '',
      status: f.status, fieldCount: fields.length,
    };
  });

  return {
    companyId,
    workspaceId,
    userId,
    company: company || {},
    workspace: workspace || {},
    user: user || {},
    recentFlows,
    recentForms,
    availableProviders: providers.map(p => ({
      key: p.key,
      name: p.title || p.name,
      icon: p.iconUrl || null,
      credentials: credentials.filter(c => c.providerKey === p.key).map(c => ({ name: c.name })),
      toolCount: countMap.get(p.key) || 0,
    })),
    providerKeys,
    llmConfig: {
      provider: env.AI_PROVIDER,
      model: env.AI_MODEL,
      apiKey: env.AI_API_KEY,
      temperature: env.AI_TEMPERATURE,
      maxTokens: env.AI_MAX_TOKENS,
      reasoningEffort: env.AI_REASONING_EFFORT,
      verbosity: env.AI_VERBOSITY,
    },
  };
}

module.exports = { buildContext };
