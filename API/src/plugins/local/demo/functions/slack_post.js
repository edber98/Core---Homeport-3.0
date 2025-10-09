exports.key = 'slack_post';
exports.run = async (_node, _msg, inputs, opts) => {
  return { ok: true, channel: inputs.channel || null, text: inputs.text || '' };
};
