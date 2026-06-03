const { handlers } = require("./utils");

module.exports = {
  async digiforma_trainees_list(node, msg, inputs, opts) {
    return handlers.digiforma_trainees_list(node, msg, inputs, opts);
  }
};
