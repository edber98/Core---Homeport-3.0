const handlers = require("./pappers");

module.exports = {
  async pappers_beneficiaires_search(node, msg, inputs, opts) {
    return handlers.pappers_beneficiaires_search(node, msg, inputs, opts);
  }
};
