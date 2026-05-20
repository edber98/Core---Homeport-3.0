const { utils } = require("./utils");

module.exports = {
  async langchain_embeddings_create(node, msg, inputs, opts) {
    return utils.run("langchain_embeddings_create", inputs || {}, opts || {});
  }
};
