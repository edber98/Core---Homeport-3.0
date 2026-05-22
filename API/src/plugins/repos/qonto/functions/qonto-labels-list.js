const { utils } = require("./utils");

module.exports = {
  async qonto_labels_list(node, msg, inputs, opts) {
    return utils.run("qonto_labels_list", inputs || {}, opts || {});
  }
};
