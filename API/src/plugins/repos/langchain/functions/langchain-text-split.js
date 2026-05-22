const { utils } = require("./utils");

module.exports = {
  async langchain_text_split(node, msg, inputs, opts) {
    return utils.run("langchain_text_split", inputs || {}, opts || {});
  }
};
