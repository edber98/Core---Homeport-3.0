const { utils } = require("./utils");

module.exports = {
  async aws_ses_list_templates(node, msg, inputs, opts) {
    const d = inputs || {};
    const params = {};
    if (d.maxItems) params["MaxItems"] = String(d.maxItems);

    const res = await utils.sesRequest(opts, "ListTemplates", params);
    if (!res.ok) return res;

    const names = utils.parseXmlTag(res.data, "Name");
    const dates = utils.parseXmlTag(res.data, "CreatedTimestamp");
    const templates = names.map((n, i) => ({ name: n, createdTimestamp: dates[i] || "" }));

    return { ok: true, templates };
  }
};
