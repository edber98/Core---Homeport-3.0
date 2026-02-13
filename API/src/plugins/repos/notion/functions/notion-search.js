const { utils } = require("./utils");
module.exports = {
  async notion_search(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const query = (d.query || "").trim();
    if (!query) return { ok: false, error: "Missing query." };
    const body = { query };
    if (d.filterType) body.filter = { value: d.filterType, property: "object" };
    body.page_size = parseInt(d.pageSize, 10) || 100;
    log('Recherche en cours...');
    const res = await utils.notionRequest(opts, "/search", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const rawResults = (res.data && res.data.results) || [];
    const results = rawResults.map(r => {
      let title = "";
      if (r.object === "page") { const tp = Object.values((r.properties || {})).find(p => p.type === "title"); title = tp?.title?.map(t => t.plain_text).join("") || ""; }
      else if (r.object === "database") { title = r.title?.map(t => t.plain_text).join("") || ""; }
      return { id: r.id, object: r.object, title, url: r.url };
    });
    return { ok: true, results };
  }
};
