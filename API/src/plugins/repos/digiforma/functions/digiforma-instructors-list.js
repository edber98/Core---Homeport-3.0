const { handlers } = require("./utils");

module.exports = {
  async digiforma_instructors_list(node, msg, inputs, opts) {
    return handlers.digiforma_instructors_list(node, msg, inputs, opts);
  }
};
