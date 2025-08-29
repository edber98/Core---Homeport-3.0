module.exports = {
  async gdocs_create_doc(node, msg, inputs, opts) {
    return { ok: true, created: true, title: node.args?.title };
  },
  async gsheets_append_rows(node, msg, inputs, opts) {
    return { ok: true, appended: true };
  }
};
