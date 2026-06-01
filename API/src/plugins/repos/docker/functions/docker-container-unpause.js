const { utils } = require("./utils");
module.exports = { async docker_container_unpause(node, msg, inputs, opts) { return utils.run("docker_container_unpause", inputs || {}, opts || {}); } };
