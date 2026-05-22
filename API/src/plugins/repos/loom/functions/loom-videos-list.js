const { utils } = require("./utils");

module.exports = {
  async loom_videos_list(node, msg, inputs, opts) {
    return utils.run("loom_videos_list", inputs || {}, opts || {});
  }
};
