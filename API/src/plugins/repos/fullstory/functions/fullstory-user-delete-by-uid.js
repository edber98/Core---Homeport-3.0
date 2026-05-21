const { utils } = require("./utils");

module.exports = {
  async fullstory_user_delete_by_uid(node, msg, inputs, opts) {
    return utils.run("fullstory_user_delete_by_uid", inputs || {}, opts || {});
  }
};
