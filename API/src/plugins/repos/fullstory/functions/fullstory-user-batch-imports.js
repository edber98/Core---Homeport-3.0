const { utils } = require("./utils");

module.exports = {
  async fullstory_user_batch_imports(node, msg, inputs, opts) {
    return utils.run("fullstory_user_batch_imports", inputs || {}, opts || {});
  }
};
