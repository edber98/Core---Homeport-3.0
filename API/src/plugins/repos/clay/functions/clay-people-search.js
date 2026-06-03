const { utils } = require("./utils");

module.exports = {
  async clay_people_search(node, msg, inputs, opts) {
    return utils.run("clay_people_search", inputs || {}, opts || {});
  }
};
