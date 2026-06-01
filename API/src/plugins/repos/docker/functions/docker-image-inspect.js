const { utils } = require("./utils");
module.exports = { async docker_image_inspect(node, msg, inputs, opts) { return utils.run("docker_image_inspect", inputs || {}, opts || {}); } };
