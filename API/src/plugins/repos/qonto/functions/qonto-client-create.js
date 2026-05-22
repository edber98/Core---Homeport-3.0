const { utils } = require("./utils");

module.exports = {
  async qonto_client_create(node, msg, inputs, opts) {
    return utils.run("qonto_client_create", inputs || {}, opts || {});
  }
};
