const { utils } = require("./utils");

module.exports = {
  async playwright_page_html_extract(node, msg, inputs, opts) {
    return utils.run("playwright_page_html_extract", inputs || {}, opts || {});
  }
};
