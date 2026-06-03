const handlers = require("./pappers");

module.exports = {
  async pappers_entreprise_search(node, msg, inputs, opts) {
    return handlers.pappers_entreprise_search(node, msg, inputs, opts);
  }
};
