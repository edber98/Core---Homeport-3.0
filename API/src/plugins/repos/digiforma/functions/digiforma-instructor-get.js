const { handlers } = require("./utils");

module.exports = {
  async digiforma_instructor_get(node, msg, inputs, opts) {
    return handlers.digiforma_instructor_get(node, msg, inputs, opts);
  }
};
