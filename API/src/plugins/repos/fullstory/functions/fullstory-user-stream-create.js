const { utils } = require("./utils");

module.exports = {
  async fullstory_user_stream_create(node, msg, inputs, opts) {
    return utils.run("fullstory_user_stream_create", inputs || {}, opts || {});
  }
};
