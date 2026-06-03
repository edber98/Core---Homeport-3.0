const { utils } = require("./utils");

module.exports = {
  async apollo_people_search(node, msg, inputs, opts) {
    return utils.run("apollo_people_search", inputs || {}, opts || {});
  }
};
