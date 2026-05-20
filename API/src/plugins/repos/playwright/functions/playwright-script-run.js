const { utils } = require("./utils");

module.exports = {
  async playwright_script_run(node, msg, inputs, opts) {
    return utils.run("playwright_script_run", inputs || {}, opts || {});
  }
};
