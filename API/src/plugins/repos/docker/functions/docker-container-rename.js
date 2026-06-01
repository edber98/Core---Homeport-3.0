const { utils } = require("./utils");
module.exports = { async docker_container_rename(node, msg, inputs, opts) { return utils.run("docker_container_rename", inputs || {}, opts || {}); } };
