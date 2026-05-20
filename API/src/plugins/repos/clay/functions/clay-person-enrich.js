const { utils } = require("./utils");

module.exports = {
  async clay_person_enrich(node, msg, inputs, opts) {
    return utils.run("clay_person_enrich", inputs || {}, opts || {});
  }
};
