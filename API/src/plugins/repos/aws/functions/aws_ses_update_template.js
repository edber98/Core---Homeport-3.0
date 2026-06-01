const { utils } = require("./utils");

module.exports = {
  async aws_ses_update_template(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.templateName) return { ok: false, error: "Nom du template requis." };

    const params = {
      "Template.TemplateName": d.templateName,
      "Template.SubjectPart": d.subjectPart || "",
      "Template.HtmlPart": d.htmlPart || "",
      "Template.TextPart": d.textPart || ""
    };

    const res = await utils.sesRequest(opts, "UpdateTemplate", params);
    if (!res.ok) return res;
    return { ok: true, status: "success", message: `Template ${d.templateName} mis à jour.` };
  }
};
