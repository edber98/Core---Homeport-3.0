const { utils } = require("./utils");

module.exports = {
  async redis_list_push(node, msg, inputs, opts) {
    return utils.run("redis_list_push", inputs || {}, opts || {});
  }
};
