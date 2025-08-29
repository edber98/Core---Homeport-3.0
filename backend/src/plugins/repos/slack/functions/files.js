module.exports = {
  async slack_upload_file(node, msg, inputs, opts) {
    return { ok: true, uploaded: true, filename: node.args?.filename };
  },
  async slack_slash_command(node, msg, inputs, opts) {
    return { ok: true, command: node.args?.command, event: 'slash_command' };
  }
};
