const { utils } = require("./utils");

module.exports = {
  async loom_video_comments_list(node, msg, inputs, opts) {
    return utils.run("loom_video_comments_list", inputs || {}, opts || {});
  }
};
