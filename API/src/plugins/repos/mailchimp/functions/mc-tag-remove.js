const { utils } = require("./utils");
const crypto = require("crypto");

module.exports = {
  async mc_tag_remove(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.listId) return { ok: false, error: "Missing listId." };
    if (!d.email) return { ok: false, error: "Missing email." };
    if (!d.tag) return { ok: false, error: "Missing tag." };

    const hash = crypto.createHash("md5").update(d.email.toLowerCase().trim()).digest("hex");
    const body = { tags: [{ name: d.tag, status: "inactive" }] };
    const res = await utils.mailchimpRequest(opts, `/lists/${d.listId}/members/${hash}/tags`, { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, status: "removed", message: `Tag "${d.tag}" retiré.` };
  }
};
