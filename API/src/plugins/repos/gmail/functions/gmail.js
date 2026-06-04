const METHOD_DEFS = require('./gmail-methods.json');
const {
  buildBodyFromMeta,
  buildComposeMessage,
  buildNoContentResult,
  decorateSuccess,
  gmailApiRequest,
  resolveLabelIds,
  trim,
} = require('./gmail-utils');

async function executeMethod(meta, node, msg, inputs, opts) {
  const values = (inputs && typeof inputs === 'object') ? inputs : {};
  const userId = trim(values.userId) || 'me';

  let body;
  if (meta.special === 'compose_message') {
    const message = await buildComposeMessage(values, opts);
    if (meta.methodId === 'gmail.users.drafts.create') body = { message };
    else if (meta.methodId === 'gmail.users.drafts.update') body = { id: trim(values.id), message };
    else body = message;
  } else if (meta.special === 'drafts_send') {
    const draftId = trim(values.draftId);
    const hasComposedMessage = !!(
      trim(values.raw) ||
      trim(values.to) ||
      trim(values.cc) ||
      trim(values.bcc) ||
      trim(values.subject) ||
      trim(values.text) ||
      trim(values.html) ||
      trim(values.threadId) ||
      trim(values.replyTo) ||
      trim(values.inReplyTo) ||
      trim(values.references) ||
      (Array.isArray(values.attachments) && values.attachments.length)
    );
    if (!draftId && !hasComposedMessage) {
      throw new Error('Renseigne un draftId ou un message à envoyer.');
    }
    body = {};
    if (draftId) body.id = draftId;
    if (hasComposedMessage) body.message = await buildComposeMessage(values, opts);
  } else {
    body = buildBodyFromMeta(values, meta.bodyFields);
  }

  const pathParams = {};
  for (const name of meta.pathParams || []) {
    pathParams[name] = name === 'userId' ? userId : values[name];
  }

  const query = {};
  for (const name of meta.queryParams || []) {
    if (name === 'userId') continue;
    query[name] = values[name];
  }

  const result = await gmailApiRequest(opts, {
    method: meta.httpMethod,
    pathTemplate: meta.path,
    pathParams,
    query,
    body,
  });
  if (!result.ok) return result;
  if (result.data == null || result.data === '') return buildNoContentResult(meta, values);
  return decorateSuccess(meta, result.data, values, opts);
}

const handlers = {};
for (const meta of METHOD_DEFS) {
  handlers[meta.key] = async (node, msg, inputs, opts) => executeMethod(meta, node, msg, inputs, opts);
}

handlers.email_list_labels = async (node, msg, inputs, opts) => {
  const res = await handlers.gmail_labels_list(node, msg, { ...(inputs || {}), userId: trim(inputs?.userId) || 'me' }, opts);
  if (!res.ok) return res;
  const labels = Array.isArray(res.labels) ? res.labels.map((label) => ({
    label: label.name || label.id || '',
    id: label.id || '',
    type: label.type || '',
  })) : [];
  return { ok: true, labels };
};

handlers.email_add_label = async (node, msg, inputs, opts) => {
  const values = inputs || {};
  const userId = trim(values.userId) || 'me';
  const messageId = trim(values.messageId || values.id);
  const label = trim(values.label);
  if (!messageId) throw new Error('messageId est requis.');
  if (!label) throw new Error('label est requis.');
  const [labelId] = await resolveLabelIds(opts, userId, [label]);
  const res = await handlers.gmail_messages_modify(node, msg, {
    userId,
    id: messageId,
    addLabelIdsJson: JSON.stringify([labelId]),
  }, opts);
  if (!res.ok) return res;
  return { ok: true, added: true, messageId, labelId, message: res };
};

handlers.email_remove_label = async (node, msg, inputs, opts) => {
  const values = inputs || {};
  const userId = trim(values.userId) || 'me';
  const messageId = trim(values.messageId || values.id);
  const label = trim(values.label);
  if (!messageId) throw new Error('messageId est requis.');
  if (!label) throw new Error('label est requis.');
  const [labelId] = await resolveLabelIds(opts, userId, [label]);
  const res = await handlers.gmail_messages_modify(node, msg, {
    userId,
    id: messageId,
    removeLabelIdsJson: JSON.stringify([labelId]),
  }, opts);
  if (!res.ok) return res;
  return { ok: true, removed: true, messageId, labelId, message: res };
};

module.exports = handlers;
