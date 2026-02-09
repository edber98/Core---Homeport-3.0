const { utils } = require("./utils");

module.exports = {
  async aws_ses_delete_template(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.templateName) return { ok: false, error: "Nom du template requis." };

    const res = await utils.sesRequest(opts, "DeleteTemplate", { "TemplateName": d.templateName });
    if (!res.ok) return res;
    return { ok: true, status: "success", message: `Template ${d.templateName} supprimé.` };
  }
};
