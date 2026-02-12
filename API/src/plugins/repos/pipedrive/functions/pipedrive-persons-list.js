const { utils } = require("./utils");

module.exports = {
  async pipedrive_persons_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const limit = parseInt(d.limit, 10) || 10;
    const start = parseInt(d.start, 10) || 0;

    const res = await utils.pdRequest(opts, "/persons", { query: { limit, start } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = Array.isArray(res.data) ? res.data : [];
    const persons = results.map(r => {
      const email = (Array.isArray(r.email) && r.email.length > 0) ? r.email[0].value : (r.email || "");
      const phone = (Array.isArray(r.phone) && r.phone.length > 0) ? r.phone[0].value : (r.phone || "");
      return { id: r.id, name: r.name, email, phone, org_id: r.org_id, add_time: r.add_time };
    });
    const hasMore = res.pagination?.more_items_in_collection ? "true" : "false";
    return { ok: true, hasMore, persons };
  }
};
