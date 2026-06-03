const { utils } = require("./utils");
module.exports = { async docker_image_tag(node, msg, inputs, opts) { return utils.run("docker_image_tag", inputs || {}, opts || {}); } };
