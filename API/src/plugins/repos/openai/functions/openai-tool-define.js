const { utils } = require("./utils");

module.exports = {
  async openai_tool_define(node, msg, inputs, opts) {
    const d = inputs || {};
    return {
      ok: true,
      type: "ai_tool",
      name: String(d.name || "").trim(),
      description: String(d.description || "").trim(),
      schema: utils.parseJson(d.parameters, {})
    };
  }
};
