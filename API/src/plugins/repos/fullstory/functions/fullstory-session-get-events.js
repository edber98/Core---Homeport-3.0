const { utils } = require("./utils");

module.exports = {
  async fullstory_session_get_events(node, msg, inputs, opts) {
    return utils.run("fullstory_session_get_events", inputs || {}, opts || {});
  }
};
