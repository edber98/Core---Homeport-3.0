const { utils } = require("./utils");

module.exports = {
  async atera_customer_search(node, msg, inputs, opts) {
    const d = inputs || {};
    const search = (d.search || "").trim();
    if (!search) return { ok: false, error: "Le champ recherche est requis." };

    const field = d.searchField || "all";
    const mode = d.matchMode || "contains";
    const maxPages = 200; // Safety limit

    // Build matcher
    let matcher;
    if (mode === "regex") {
      try {
        const re = new RegExp(search, "i");
        matcher = (val) => re.test(val || "");
      } catch (e) {
        return { ok: false, error: "Expression régulière invalide : " + e.message };
      }
    } else {
      const lower = search.toLowerCase();
      matcher = (val) => (val || "").toLowerCase().includes(lower);
    }

    const fieldsToSearch = field === "all"
      ? ["CustomerName", "Domain", "Address", "City", "Phone", "Notes", "BusinessNumber"]
      : [field];

    const matchItem = (item) => fieldsToSearch.some((f) => matcher(String(item[f] || "")));

    // Paginate through all customers
    const matched = [];
    let page = 1;
    let totalScanned = 0;

    while (page <= maxPages) {
      const res = await utils.ateraRequest(opts, "/customers", {
        query: { page, itemsInPage: 50 }
      });
      if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

      const items = res.data?.items || [];
      totalScanned += items.length;

      for (const item of items) {
        if (matchItem(item)) matched.push(item);
      }

      const totalPages = res.data?.totalPages || 1;
      if (page >= totalPages || items.length === 0) break;
      page++;
    }

    return {
      ok: true,
      items: matched,
      matchCount: matched.length,
      totalScanned
    };
  }
};
