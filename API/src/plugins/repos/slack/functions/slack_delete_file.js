const { utils } = require("./utils");

module.exports = {
  async slack_delete_file(node, msg, inputs, opts) {
    const d = inputs || {};
    const body = {};
  if (d.file !== undefined && d.file !== "" && d.file !== null) body.file = d.file;

    const res = await utils.slackRequest(opts, "files.delete", body);
    if (!res.ok) return { ok: false, error: res.error, details: res.details };

    return { ok: true, status: "success", message: "Opération réussie." };
  }
};
