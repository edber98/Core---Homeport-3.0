const { handlers } = require("./utils");

module.exports = {
  async digiforma_instructor_update(node, msg, inputs, opts) {
    return handlers.digiforma_instructor_update(node, msg, inputs, opts);
  }
};
