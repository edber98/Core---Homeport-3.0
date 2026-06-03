const { utils } = require("./utils");

module.exports = {
  async langchain_chat_invoke(node, msg, inputs, opts) {
    return utils.run("langchain_chat_invoke", inputs || {}, opts || {});
  }
};
