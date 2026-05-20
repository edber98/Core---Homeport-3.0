const { utils } = require("./utils");

module.exports = {
  async qonto_invoices_list(node, msg, inputs, opts) {
    return utils.run("qonto_invoices_list", inputs || {}, opts || {});
  }
};
