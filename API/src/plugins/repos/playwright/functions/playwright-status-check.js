const { utils } = require("./utils");

module.exports = {
  async playwright_status_check(node, msg, inputs, opts) {
    return utils.run("playwright_status_check", inputs || {}, opts || {});
  }
};
