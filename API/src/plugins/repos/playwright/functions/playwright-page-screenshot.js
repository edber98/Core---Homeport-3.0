const { utils } = require("./utils");

module.exports = {
  async playwright_page_screenshot(node, msg, inputs, opts) {
    return utils.run("playwright_page_screenshot", inputs || {}, opts || {});
  }
};
