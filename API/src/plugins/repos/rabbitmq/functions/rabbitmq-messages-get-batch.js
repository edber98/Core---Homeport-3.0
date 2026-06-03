const { utils } = require("./utils");

module.exports = {
  async rabbitmq_messages_get_batch(node, msg, inputs, opts) {
    return utils.run("rabbitmq_messages_get_batch", inputs || {}, opts || {});
  }
};
