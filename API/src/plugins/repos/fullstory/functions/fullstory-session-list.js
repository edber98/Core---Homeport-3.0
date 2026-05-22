const { utils } = require("./utils");

module.exports = {
  async fullstory_session_list(node, msg, inputs, opts) {
    return utils.run("fullstory_session_list", inputs || {}, opts || {});
  }
};
