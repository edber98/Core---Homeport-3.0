const { utils } = require("./utils");

module.exports = {
  async runway_task_get(node, msg, inputs, opts) {
    return utils.run("runway_task_get", inputs || {}, opts || {});
  }
};
