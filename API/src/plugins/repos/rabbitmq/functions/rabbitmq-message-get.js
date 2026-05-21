const { utils } = require("./utils");

module.exports = {
  async rabbitmq_message_get(node, msg, inputs, opts) {
    return utils.run("rabbitmq_message_get", inputs || {}, opts || {});
  }
};
