const handlers = require("./pappers");

module.exports = {
  async pappers_association_get(node, msg, inputs, opts) {
    return handlers.pappers_association_get(node, msg, inputs, opts);
  }
};
