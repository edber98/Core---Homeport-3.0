const { utils } = require("./utils");

module.exports = {
  async cloudflare_cache_purge(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const zoneId = String(d.zoneId || "").trim();
    if (!zoneId) return { ok: false, error: "ID de zone requis." };

    const mode = String(d.mode || "files").trim();
    const body = {};
    if (mode === "everything") {
      body.purge_everything = true;
    } else if (mode === "tags") {
      body.tags = utils.parseList(d.values);
    } else if (mode === "hosts") {
      body.hosts = utils.parseList(d.values);
    } else if (mode === "prefixes") {
      body.prefixes = utils.parseList(d.values);
    } else {
      body.files = utils.parseList(d.values);
    }
    if (!body.purge_everything && !Object.values(body)[0]?.length) return { ok: false, error: "Valeurs de purge requises." };

    log("Purge du cache Cloudflare...");
    const res = await utils.cloudflareRequest(opts, `/zones/${encodeURIComponent(zoneId)}/purge_cache`, { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, id: res.data?.id || zoneId, success: true };
  }
};
