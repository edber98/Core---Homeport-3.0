const { utils } = require("./utils");

module.exports = {
  async langchain_classify(node, msg, inputs, opts) {
    return utils.run("langchain_classify", inputs || {}, opts || {});
  }
};
