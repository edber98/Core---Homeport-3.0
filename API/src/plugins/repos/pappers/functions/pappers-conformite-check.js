const handlers = require("./pappers");

module.exports = {
  async pappers_conformite_check(node, msg, inputs, opts) {
    return handlers.pappers_conformite_check(node, msg, inputs, opts);
  }
};
