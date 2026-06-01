const { handlers } = require("./utils");
module.exports = { async discord_remove_role_from_member(node, msg, inputs, opts) { return handlers.discord_remove_role_from_member(node, msg, inputs, opts); } };
