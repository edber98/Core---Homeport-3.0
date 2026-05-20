const { utils } = require("./utils");

module.exports = {
  async runway_task_cancel(node, msg, inputs, opts) {
    return utils.run("runway_task_cancel", inputs || {}, opts || {});
  }
};
