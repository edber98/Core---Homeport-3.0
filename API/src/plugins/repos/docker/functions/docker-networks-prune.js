const { utils } = require("./utils");
module.exports = { async docker_networks_prune(node, msg, inputs, opts) { return utils.run("docker_networks_prune", inputs || {}, opts || {}); } };
