const handlers = require("./pappers");

module.exports = {
  async pappers_avis_insee(node, msg, inputs, opts) {
    return handlers.pappers_avis_insee(node, msg, inputs, opts);
  }
};
