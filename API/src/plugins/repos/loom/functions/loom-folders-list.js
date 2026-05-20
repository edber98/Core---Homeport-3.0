const { utils } = require("./utils");

module.exports = {
  async loom_folders_list(node, msg, inputs, opts) {
    return utils.run("loom_folders_list", inputs || {}, opts || {});
  }
};
