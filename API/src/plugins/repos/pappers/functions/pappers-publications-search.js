const handlers = require("./pappers");

module.exports = {
  async pappers_publications_search(node, msg, inputs, opts) {
    return handlers.pappers_publications_search(node, msg, inputs, opts);
  }
};
