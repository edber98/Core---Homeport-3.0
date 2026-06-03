const handlers = require("./pappers");

module.exports = {
  async pappers_extrait_inpi(node, msg, inputs, opts) {
    return handlers.pappers_extrait_inpi(node, msg, inputs, opts);
  }
};
