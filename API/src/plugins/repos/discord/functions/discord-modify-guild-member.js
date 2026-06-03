const { handlers } = require("./utils");
module.exports = { async discord_modify_guild_member(node, msg, inputs, opts) { return handlers.discord_modify_guild_member(node, msg, inputs, opts); } };
