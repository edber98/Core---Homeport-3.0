// Build the full AI context from company + workspace + user data
const AiCompanyContext = require('../../db/models/ai-company-context.model');
const AiWorkspaceContext = require('../../db/models/ai-workspace-context.model');
const AiUserContext = require('../../db/models/ai-user-context.model');
const Credential = require('../../db/models/credential.model');
const Provider = require('../../db/models/provider.model');
const NodeTemplate = require('../../db/models/node-template.model');
const env = require('../../config/env');

async function buildContext({ companyId, workspaceId, userId }) {
  // Load 3 levels in parallel
  const [company, workspace, user] = await Promise.all([
    AiCompanyContext.findOne({ companyId }).lean().catch(() => null),
    AiWorkspaceContext.findOne({ workspaceId }).lean().catch(() => null),
    AiUserContext.findOne({ userId }).lean().catch(() => null),
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

  return {
    companyId,
    workspaceId,
    userId,
    company: company || {},
    workspace: workspace || {},
    user: user || {},
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
      apiKey: env.AI_PROVIDER === 'anthropic' ? env.ANTHROPIC_API_KEY : env.AI_API_KEY,
      temperature: env.AI_TEMPERATURE,
      maxTokens: env.AI_MAX_TOKENS,
    },
  };
}

module.exports = { buildContext };
