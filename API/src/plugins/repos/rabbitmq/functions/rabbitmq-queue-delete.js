const { utils } = require("./utils");

module.exports = {
  async rabbitmq_queue_delete(node, msg, inputs, opts) {
    return utils.run("rabbitmq_queue_delete", inputs || {}, opts || {});
  }
};
