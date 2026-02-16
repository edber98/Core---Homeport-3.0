// Execute a NodeTemplate handler with credential injection
const NodeTemplate = require('../../db/models/node-template.model');
const Credential = require('../../db/models/credential.model');
const { registry } = require('../../plugins/registry');
const { decrypt } = require('../../utils/enc');

async function executeTool(toolKey, args, { workspaceId, companyId, userId }) {
  // 1. Load template
  const tpl = await NodeTemplate.findOne({ key: toolKey }).lean();
  if (!tpl) throw new Error(`Tool '${toolKey}' not found`);

  // 2. Resolve credentials if needed
  let credentials = null;
  if (tpl.providerKey && !tpl.allowWithoutCredentials) {
    const cred = await Credential.findOne({ providerKey: tpl.providerKey, workspaceId });
    if (!cred) throw new Error(`No credentials configured for provider '${tpl.providerKey}' in this workspace`);
    try {
      credentials = decrypt(cred.secret);
    } catch (e) {
      throw new Error(`Failed to decrypt credentials for provider '${tpl.providerKey}'`);
    }
  }

  // 3. Resolve handler
  const handler = registry.resolve(tpl.key);
  if (!handler) throw new Error(`No handler registered for '${tpl.key}'`);

  // 4. Build execution context
  const node = {
    id: `ai_exec_${Date.now()}`,
    data: {
      model: {
        templateObj: tpl,
        context: args,
      },
    },
  };
  const msg = { payload: {} };
  const opts = {
    credentials,
    log: () => {},
    workspaceId,
    companyId,
    userId,
  };

  // 5. Execute
  const result = await handler(node, msg, args, opts);

  // 6. Sanitize — never expose secrets
  return sanitizeResult(result);
}

function sanitizeResult(result) {
  if (!result || typeof result !== 'object') return result;
  const out = { ...result };
  // Remove any keys that might contain sensitive data
  const sensitiveKeys = ['apiKey', 'api_key', 'secret', 'password', 'token', 'accessToken', 'access_token', 'refreshToken', 'refresh_token'];
  for (const key of sensitiveKeys) {
    if (key in out) delete out[key];
  }
  return out;
}

module.exports = { executeTool };
