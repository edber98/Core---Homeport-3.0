const { utils } = require("./utils");

module.exports = {
  async redis_command_execute(node, msg, inputs, opts) {
    return utils.run("redis_command_execute", inputs || {}, opts || {});
  }
};
