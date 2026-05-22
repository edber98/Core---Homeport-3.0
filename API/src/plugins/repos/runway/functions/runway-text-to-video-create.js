const { utils } = require("./utils");

module.exports = {
  async runway_text_to_video_create(node, msg, inputs, opts) {
    return utils.run("runway_text_to_video_create", inputs || {}, opts || {});
  }
};
