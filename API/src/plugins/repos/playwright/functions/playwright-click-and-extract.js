const { utils } = require("./utils");

module.exports = {
  async playwright_click_and_extract(node, msg, inputs, opts) {
    return utils.run("playwright_click_and_extract", inputs || {}, opts || {});
  }
};
