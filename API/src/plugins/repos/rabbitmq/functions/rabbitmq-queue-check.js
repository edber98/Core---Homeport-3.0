const { utils } = require("./utils");

module.exports = {
  async rabbitmq_queue_check(node, msg, inputs, opts) {
    return utils.run("rabbitmq_queue_check", inputs || {}, opts || {});
  }
};
