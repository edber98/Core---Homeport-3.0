const { utils } = require("./utils");

module.exports = {
  async klaviyo_flows_list(node, msg, inputs, opts) {
    return utils.run("klaviyo_flows_list", inputs || {}, opts || {});
  }
};
