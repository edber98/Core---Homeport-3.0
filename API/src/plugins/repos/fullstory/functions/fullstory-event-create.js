const { utils } = require("./utils");

module.exports = {
  async fullstory_event_create(node, msg, inputs, opts) {
    return utils.run("fullstory_event_create", inputs || {}, opts || {});
  }
};
