const { utils } = require("./utils");
module.exports = {
  async airtable_bases_list(node, msg, inputs, opts) {
    const res = await utils.airtableRequest(opts, "/meta/bases");
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const rawBases = (res.data && res.data.bases) || [];
    const bases = rawBases.map(b => ({ id: b.id, name: b.name, permissionLevel: b.permissionLevel || "" }));
    return { ok: true, bases };
  }
};
