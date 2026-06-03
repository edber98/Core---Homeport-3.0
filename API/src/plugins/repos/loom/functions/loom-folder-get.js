const { utils } = require("./utils");

module.exports = {
  async loom_folder_get(node, msg, inputs, opts) {
    return utils.run("loom_folder_get", inputs || {}, opts || {});
  }
};
