const { utils } = require("./utils");

module.exports = {
  async runway_tasks_list(node, msg, inputs, opts) {
    return utils.run("runway_tasks_list", inputs || {}, opts || {});
  }
};
