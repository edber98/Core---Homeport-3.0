const { utils } = require("./utils");

module.exports = {
  async fullstory_user_batch_create(node, msg, inputs, opts) {
    return utils.run("fullstory_user_batch_create", inputs || {}, opts || {});
  }
};
