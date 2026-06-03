const { utils } = require("./utils");

module.exports = {
  async runway_avatar_create(node, msg, inputs, opts) {
    return utils.run("runway_avatar_create", inputs || {}, opts || {});
  }
};
