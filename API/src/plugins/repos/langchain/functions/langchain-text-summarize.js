const { utils } = require("./utils");

module.exports = {
  async langchain_text_summarize(node, msg, inputs, opts) {
    return utils.run("langchain_text_summarize", inputs || {}, opts || {});
  }
};
