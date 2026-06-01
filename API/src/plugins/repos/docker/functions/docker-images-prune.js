const { utils } = require("./utils");
module.exports = { async docker_images_prune(node, msg, inputs, opts) { return utils.run("docker_images_prune", inputs || {}, opts || {}); } };
