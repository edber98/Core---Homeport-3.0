const { utils } = require("./utils");
module.exports = { async docker_containers_prune(node, msg, inputs, opts) { return utils.run("docker_containers_prune", inputs || {}, opts || {}); } };
