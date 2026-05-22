const { utils } = require("./utils");

module.exports = {
  async loom_video_delete(node, msg, inputs, opts) {
    return utils.run("loom_video_delete", inputs || {}, opts || {});
  }
};
