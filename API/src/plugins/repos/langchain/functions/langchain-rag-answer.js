const { utils } = require("./utils");

module.exports = {
  async langchain_rag_answer(node, msg, inputs, opts) {
    return utils.run("langchain_rag_answer", inputs || {}, opts || {});
  }
};
