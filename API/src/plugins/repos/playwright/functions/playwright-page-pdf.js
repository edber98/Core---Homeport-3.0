const { utils } = require("./utils");

module.exports = {
  async playwright_page_pdf(node, msg, inputs, opts) {
    return utils.run("playwright_page_pdf", inputs || {}, opts || {});
  }
};
