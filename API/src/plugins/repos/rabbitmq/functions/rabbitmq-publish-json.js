const { utils } = require("./utils");

module.exports = {
  async rabbitmq_publish_json(node, msg, inputs, opts) {
    return utils.run("rabbitmq_publish_json", inputs || {}, opts || {});
  }
};
