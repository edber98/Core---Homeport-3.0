const { utils } = require("./utils");

module.exports = {
  async fullstory_event_batch_status(node, msg, inputs, opts) {
    return utils.run("fullstory_event_batch_status", inputs || {}, opts || {});
  }
};
