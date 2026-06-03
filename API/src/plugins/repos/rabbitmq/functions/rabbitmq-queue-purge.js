const { utils } = require("./utils");

module.exports = {
  async rabbitmq_queue_purge(node, msg, inputs, opts) {
    return utils.run("rabbitmq_queue_purge", inputs || {}, opts || {});
  }
};
