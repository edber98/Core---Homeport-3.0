const handlers = require("./pappers");

module.exports = {
  async pappers_comptes_get(node, msg, inputs, opts) {
    return handlers.pappers_comptes_get(node, msg, inputs, opts);
  }
};
