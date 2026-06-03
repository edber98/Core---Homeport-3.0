const { utils } = require("./utils");

module.exports = {
  async redis_publish(node, msg, inputs, opts) {
    return utils.run("redis_publish", inputs || {}, opts || {});
  }
};
