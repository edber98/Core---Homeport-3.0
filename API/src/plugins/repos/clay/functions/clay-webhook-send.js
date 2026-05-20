const { utils } = require("./utils");

module.exports = {
  async clay_webhook_send(node, msg, inputs, opts) {
    return utils.run("clay_webhook_send", inputs || {}, opts || {});
  }
};
