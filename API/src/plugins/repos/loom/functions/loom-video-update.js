const { utils } = require("./utils");

module.exports = {
  async loom_video_update(node, msg, inputs, opts) {
    return utils.run("loom_video_update", inputs || {}, opts || {});
  }
};
