const { utils } = require("./utils");

module.exports = {
  async heap_event_track(node, msg, inputs, opts) {
    return utils.run("heap_event_track", inputs || {}, opts || {});
  }
};
