const { utils } = require("./utils");

module.exports = {
  async loom_video_comment_delete(node, msg, inputs, opts) {
    return utils.run("loom_video_comment_delete", inputs || {}, opts || {});
  }
};
