const { utils } = require("./utils");

module.exports = {
  async langchain_json_extract(node, msg, inputs, opts) {
    return utils.run("langchain_json_extract", inputs || {}, opts || {});
  }
};
