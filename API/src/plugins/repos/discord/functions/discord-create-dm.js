const { handlers } = require("./utils");
module.exports = { async discord_create_dm(node, msg, inputs, opts) { return handlers.discord_create_dm(node, msg, inputs, opts); } };
