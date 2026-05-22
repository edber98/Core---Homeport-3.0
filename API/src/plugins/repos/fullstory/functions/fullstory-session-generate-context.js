const { utils } = require("./utils");

module.exports = {
  async fullstory_session_generate_context(node, msg, inputs, opts) {
    return utils.run("fullstory_session_generate_context", inputs || {}, opts || {});
  }
};
