const { handlers } = require("./utils");
module.exports = { async discord_bulk_delete_messages(node, msg, inputs, opts) { return handlers.discord_bulk_delete_messages(node, msg, inputs, opts); } };
