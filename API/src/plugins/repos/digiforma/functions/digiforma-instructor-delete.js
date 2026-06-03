const { handlers } = require("./utils");

module.exports = {
  async digiforma_instructor_delete(node, msg, inputs, opts) {
    return handlers.digiforma_instructor_delete(node, msg, inputs, opts);
  }
};
