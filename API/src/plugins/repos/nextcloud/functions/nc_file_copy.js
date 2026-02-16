const { utils } = require("./utils");

module.exports = {
  async nc_file_copy(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.sourcePath || !d.destPath) return { ok: false, error: "Chemins source et destination requis." };
    const credentials = (opts && opts.credentials) || {};
    const baseUrl = (credentials.url || "").replace(/\/+$/, "");
    const username = credentials.username || "";
    const destUrl = `${baseUrl}/remote.php/dav/files/${encodeURIComponent(username)}/${d.destPath.replace(/^\/+/, "")}`;
    log('Appel API en cours...');
    const res = await utils.webdavRequest(opts, d.sourcePath, {
      method: "COPY",
      headers: { "Destination": destUrl, "Overwrite": "F" }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "copied", message: `Copié de ${d.sourcePath} vers ${d.destPath}` };
  }
};
