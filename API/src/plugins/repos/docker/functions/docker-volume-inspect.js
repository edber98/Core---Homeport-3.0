const { utils } = require("./utils");
module.exports = { async docker_volume_inspect(node, msg, inputs, opts) { return utils.run("docker_volume_inspect", inputs || {}, opts || {}); } };
