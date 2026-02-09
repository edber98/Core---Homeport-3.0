const { utils } = require("./utils");

module.exports = {
  async aws_ses_list_identities(node, msg, inputs, opts) {
    const d = inputs || {};
    const params = {};
    if (d.identityType) params["IdentityType"] = d.identityType;

    const res = await utils.sesRequest(opts, "ListIdentities", params);
    if (!res.ok) return res;

    const ids = utils.parseXmlTag(res.data, "member");
    const identities = ids.map(id => ({ identity: id }));

    return { ok: true, identities };
  }
};
