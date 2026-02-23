// Execute a NodeTemplate handler with credential injection
const NodeTemplate = require('../../db/models/node-template.model');
const Credential = require('../../db/models/credential.model');
const FileRecord = require('../../db/models/file.model');
const { registry } = require('../../plugins/registry');
const { decrypt } = require('../../utils/enc');
const { createFilesHelper } = require('../../services/file-storage');
const { flattenFields } = require('./tool-converter');

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

  // 4. Resolve file fields in args — convert fileId strings to fileRef objects
  if (tpl.args) {
    const allFields = flattenFields(tpl.args.fields || tpl.args.steps?.flatMap(s => s.fields || []) || []);
    for (const field of allFields) {
      if (field.type === 'file' && args[field.key]) {
        const val = args[field.key];
        if (typeof val === 'string' && !val.startsWith('http')) {
          // It's a fileId → convert to fileRef
          const record = await FileRecord.findOne({ id: val }).lean();
          if (record) {
            args[field.key] = { _type: 'fileRef', fileId: record.id, name: record.name, mimeType: record.mimeType, size: record.size };
          }
        }
      }
    }
  }

  // 5. Build execution context
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
    files: createFilesHelper({ workspaceId, companyId }),
  };

  // 6. Execute
  const result = await handler(node, msg, args, opts);

  // 7. Sanitize — never expose secrets
  const displayTitle = tpl.title || tpl.name || toolKey;
  return { result: sanitizeResult(result), displayTitle };
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
