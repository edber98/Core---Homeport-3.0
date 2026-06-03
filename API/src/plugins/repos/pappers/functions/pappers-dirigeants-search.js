const handlers = require("./pappers");

module.exports = {
  async pappers_dirigeants_search(node, msg, inputs, opts) {
    return handlers.pappers_dirigeants_search(node, msg, inputs, opts);
  }
};
