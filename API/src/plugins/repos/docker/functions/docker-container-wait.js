const { utils } = require("./utils");
module.exports = { async docker_container_wait(node, msg, inputs, opts) { return utils.run("docker_container_wait", inputs || {}, opts || {}); } };
