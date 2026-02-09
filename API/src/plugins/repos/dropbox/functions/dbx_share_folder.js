const { utils } = require("./utils");

module.exports = {
  async dbx_share_folder(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.path) return { ok: false, error: "Chemin du dossier requis." };

    const shareRes = await utils.dbxRequest(opts, "/sharing/share_folder", { path: d.path });
    if (!shareRes.ok) return shareRes;

    if (d.members) {
      const sharedFolderId = shareRes.data.shared_folder_id || shareRes.data?.metadata?.shared_folder_id;
      if (sharedFolderId) {
        const members = d.members.split(",").map(m => ({
          member: { ".tag": "email", email: m.trim() },
          access_level: { ".tag": d.accessLevel || "viewer" }
        }));
        await utils.dbxRequest(opts, "/sharing/add_folder_member", {
          shared_folder_id: sharedFolderId, members
        });
      }
    }

    return { ok: true, status: "success", message: `Dossier ${d.path} partagé.` };
  }
};
