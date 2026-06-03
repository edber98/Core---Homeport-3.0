const { utils } = require("./utils");
module.exports = { async docker_container_stats(node, msg, inputs, opts) { return utils.run("docker_container_stats", inputs || {}, opts || {}); } };
