const handlers = require("./pappers");

module.exports = {
  async pappers_suggestions(node, msg, inputs, opts) {
    return handlers.pappers_suggestions(node, msg, inputs, opts);
  }
};
