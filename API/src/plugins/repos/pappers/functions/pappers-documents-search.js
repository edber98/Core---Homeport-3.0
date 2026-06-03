const handlers = require("./pappers");

module.exports = {
  async pappers_documents_search(node, msg, inputs, opts) {
    return handlers.pappers_documents_search(node, msg, inputs, opts);
  }
};
