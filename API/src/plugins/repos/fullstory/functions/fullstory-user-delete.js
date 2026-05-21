const { utils } = require("./utils");

module.exports = {
  async fullstory_user_delete(node, msg, inputs, opts) {
    return utils.run("fullstory_user_delete", inputs || {}, opts || {});
  }
};
