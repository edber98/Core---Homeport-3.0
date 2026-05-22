const { utils } = require("./utils");

module.exports = {
  async loom_video_get(node, msg, inputs, opts) {
    return utils.run("loom_video_get", inputs || {}, opts || {});
  }
};
