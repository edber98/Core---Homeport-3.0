const { utils } = require("./utils");

module.exports = {
  async clay_companies_search(node, msg, inputs, opts) {
    return utils.run("clay_companies_search", inputs || {}, opts || {});
  }
};
