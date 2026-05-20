const { utils } = require("./utils");

module.exports = {
  async klaviyo_segments_list(node, msg, inputs, opts) {
    return utils.run("klaviyo_segments_list", inputs || {}, opts || {});
  }
};
