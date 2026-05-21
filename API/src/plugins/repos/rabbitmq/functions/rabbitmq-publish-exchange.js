const { utils } = require("./utils");

module.exports = {
  async rabbitmq_publish_exchange(node, msg, inputs, opts) {
    return utils.run("rabbitmq_publish_exchange", inputs || {}, opts || {});
  }
};
