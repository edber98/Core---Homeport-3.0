const { utils } = require("./utils");

function toStr(value) {
  const str = String(value || "").trim();
  return str || null;
}

module.exports = {
  async create_openproject_project(node, msg, inputs, opts) {
    const data = inputs || {};
    const name = toStr(data.name);
    const identifier = toStr(data.identifier);
    const description = toStr(data.description);

    if (!name) return { ok: false, error: "Missing name." };
    if (!identifier) return { ok: false, error: "Missing identifier." };

    const payload = { name, identifier };
    if (description) payload.description = { format: "markdown", raw: description };

    const res = await utils.openprojectRequest(opts, "/projects", {
      method: "POST",
      body: payload
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, project: res.data };
  }
};
