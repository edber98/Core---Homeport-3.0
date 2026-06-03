const { utils } = require("./utils");

module.exports = {
  async fullstory_user_get(node, msg, inputs, opts) {
    return utils.run("fullstory_user_get", inputs || {}, opts || {});
  }
};
