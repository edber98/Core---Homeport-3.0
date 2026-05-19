const { utils } = require("./utils");

module.exports = {
  async mongodb_command_run(node, msg, inputs, opts) {
    let command;
    try { command = utils.parseJson((inputs || {}).command, "commande", undefined); } catch (e) { return { ok: false, error: e.message }; }
    if (!command) return { ok: false, error: "Commande requise." };
    return utils.withDb(opts?.credentials, async (db) => {
      const raw = await db.command(command);
      return { ok: true, result: raw, raw };
    });
  }
};
