const { utils } = require("./utils");

module.exports = {
  async fullstory_event_batch_errors(node, msg, inputs, opts) {
    return utils.run("fullstory_event_batch_errors", inputs || {}, opts || {});
  }
};
