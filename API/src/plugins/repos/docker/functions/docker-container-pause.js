const { utils } = require("./utils");
module.exports = { async docker_container_pause(node, msg, inputs, opts) { return utils.run("docker_container_pause", inputs || {}, opts || {}); } };
