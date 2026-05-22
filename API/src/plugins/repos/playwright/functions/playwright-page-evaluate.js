const { utils } = require("./utils");

module.exports = {
  async playwright_page_evaluate(node, msg, inputs, opts) {
    return utils.run("playwright_page_evaluate", inputs || {}, opts || {});
  }
};
