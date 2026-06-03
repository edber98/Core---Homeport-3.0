const { utils } = require("./utils");

module.exports = {
  async loom_video_comment_create(node, msg, inputs, opts) {
    return utils.run("loom_video_comment_create", inputs || {}, opts || {});
  }
};
