const { utils } = require("./utils");

module.exports = {
  async nc_file_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const path = d.path || "/";
    log('Récupération de la liste...');
    const res = await utils.webdavRequest(opts, path, {
      method: "PROPFIND",
      headers: { "Depth": "1", "Content-Type": "application/xml" }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const files = utils.parseWebdavMultistatus(res.data);
    const totalCount = files.length;
    return { ok: true, totalCount, files };
  }
};
