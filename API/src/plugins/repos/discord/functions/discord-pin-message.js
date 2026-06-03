const { handlers } = require("./utils");
module.exports = { async discord_pin_message(node, msg, inputs, opts) { return handlers.discord_pin_message(node, msg, inputs, opts); } };
