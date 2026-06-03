const { utils } = require("./utils");
module.exports = { async docker_volumes_prune(node, msg, inputs, opts) { return utils.run("docker_volumes_prune", inputs || {}, opts || {}); } };
