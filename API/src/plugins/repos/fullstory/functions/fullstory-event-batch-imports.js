const { utils } = require("./utils");

module.exports = {
  async fullstory_event_batch_imports(node, msg, inputs, opts) {
    return utils.run("fullstory_event_batch_imports", inputs || {}, opts || {});
  }
};
