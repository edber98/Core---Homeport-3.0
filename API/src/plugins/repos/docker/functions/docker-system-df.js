const { utils } = require("./utils");
module.exports = { async docker_system_df(node, msg, inputs, opts) { return utils.run("docker_system_df", inputs || {}, opts || {}); } };
