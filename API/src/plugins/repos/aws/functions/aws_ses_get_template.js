const { utils } = require("./utils");

module.exports = {
  async aws_ses_get_template(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.templateName) return { ok: false, error: "Nom du template requis." };

    const res = await utils.sesRequest(opts, "GetTemplate", { "TemplateName": d.templateName });
    if (!res.ok) return res;

    return {
      ok: true,
      templateName: utils.parseXmlTagSingle(res.data, "TemplateName") || d.templateName,
      subjectPart: utils.parseXmlTagSingle(res.data, "SubjectPart") || "",
      htmlPart: utils.parseXmlTagSingle(res.data, "HtmlPart") || "",
      textPart: utils.parseXmlTagSingle(res.data, "TextPart") || ""
    };
  }
};
