const { utils } = require("./utils");

module.exports = {
  async apollo_people_match(node, msg, inputs, opts) {
    return utils.run("apollo_people_match", inputs || {}, opts || {});
  }
};
