const { utils } = require("./utils");

module.exports = {
  async fullstory_user_pages_export(node, msg, inputs, opts) {
    return utils.run("fullstory_user_pages_export", inputs || {}, opts || {});
  }
};
