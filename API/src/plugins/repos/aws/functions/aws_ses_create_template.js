const { utils } = require("./utils");

module.exports = {
  async aws_ses_create_template(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.templateName) return { ok: false, error: "Nom du template requis." };

    const params = {
      "Template.TemplateName": d.templateName,
      "Template.SubjectPart": d.subjectPart || "",
      "Template.HtmlPart": d.htmlPart || "",
      "Template.TextPart": d.textPart || ""
    };

    log('Création en cours...');
    const res = await utils.sesRequest(opts, "CreateTemplate", params);
    if (!res.ok) return res;
    return { ok: true, status: "success", message: `Template ${d.templateName} créé.` };
  }
};
