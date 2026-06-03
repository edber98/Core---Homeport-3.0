const { utils } = require("./utils");

module.exports = {
  async fullstory_user_events_export(node, msg, inputs, opts) {
    return utils.run("fullstory_user_events_export", inputs || {}, opts || {});
  }
};
