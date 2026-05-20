const { utils } = require("./utils");

module.exports = {
  async redis_stream_add(node, msg, inputs, opts) {
    return utils.run("redis_stream_add", inputs || {}, opts || {});
  }
};
