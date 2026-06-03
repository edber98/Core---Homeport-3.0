const { utils } = require("./utils");

module.exports = {
  async langchain_prompt_format(node, msg, inputs, opts) {
    return utils.run("langchain_prompt_format", inputs || {}, opts || {});
  }
};
