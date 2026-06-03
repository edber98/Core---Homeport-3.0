const { utils } = require("./utils");

module.exports = {
  async playwright_links_extract(node, msg, inputs, opts) {
    return utils.run("playwright_links_extract", inputs || {}, opts || {});
  }
};
