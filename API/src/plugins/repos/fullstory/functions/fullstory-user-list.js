const { utils } = require("./utils");

module.exports = {
  async fullstory_user_list(node, msg, inputs, opts) {
    return utils.run("fullstory_user_list", inputs || {}, opts || {});
  }
};
