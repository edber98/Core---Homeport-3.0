const { utils } = require("./utils");
module.exports = {
  async notion_page_property_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const pageId = (d.pageId || "").trim();
    const propertyId = (d.propertyId || "").trim();
    if (!pageId) return { ok: false, error: "ID de la page requis." };
    if (!propertyId) return { ok: false, error: "ID de la propriété requis." };

    log('Récupération de la propriété...');

    // Paginated property: collect all results
    let allResults = [];
    let nextCursor = null;
    let propertyData = null;

    do {
      const query = { page_size: 100 };
      if (nextCursor) query.start_cursor = nextCursor;
      const res = await utils.notionRequest(opts, `/pages/${encodeURIComponent(pageId)}/properties/${encodeURIComponent(propertyId)}`, { query });
      if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
      const r = res.data || {};

      // Non-paginated property (simple types like title, number, select, etc.)
      if (r.object !== "list") {
        return { ok: true, type: r.type || "", value: r[r.type] ?? null, id: r.id || propertyId };
      }

      // Paginated property (relation, rollup, people, rich_text, title)
      propertyData = r;
      if (Array.isArray(r.results)) allResults = allResults.concat(r.results);
      nextCursor = r.has_more ? r.next_cursor : null;
    } while (nextCursor);

    const type = propertyData?.property_item?.type || propertyData?.type || "";
    return { ok: true, type, results: allResults, totalCount: allResults.length, id: propertyId };
  }
};
