const { utils } = require("./utils");

module.exports = {
  async rabbitmq_publish_queue(node, msg, inputs, opts) {
    return utils.run("rabbitmq_publish_queue", inputs || {}, opts || {});
  }
};
