const { utils } = require("./utils");

module.exports = {
  async playwright_form_submit(node, msg, inputs, opts) {
    return utils.run("playwright_form_submit", inputs || {}, opts || {});
  }
};
