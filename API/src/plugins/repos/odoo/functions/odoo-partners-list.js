const { utils } = require("./utils");

function toStr(value) {
  const str = String(value || "").trim();
  return str || null;
}

function toInt(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

module.exports = {
  async odoo_partners_list(node, msg, inputs, opts) {
        const data = inputs || {};
        const limit = toInt(data.limit) || 50;
        const offset = toInt(data.offset) || 0;
        const domain = [];

        // Filter: partner type (client / fournisseur / both)
        const partnerType = toStr(data.partner_type);
        if (partnerType === "customer") domain.push(["customer_rank", ">", 0]);
        else if (partnerType === "supplier") domain.push(["supplier_rank", ">", 0]);
        else if (partnerType === "customer_supplier") {
          domain.push(["customer_rank", ">", 0]);
          domain.push(["supplier_rank", ">", 0]);
        }

        // Filter: company or individual
        const companyType = toStr(data.company_type);
        if (companyType === "company") domain.push(["is_company", "=", true]);
        else if (companyType === "individual") domain.push(["is_company", "=", false]);

        // Legacy: is_company checkbox (backward compat)
        if (!companyType && data.is_company) domain.push(["is_company", "=", true]);

        // Filter: search by name
        if (toStr(data.search)) domain.push("|", ["name", "ilike", toStr(data.search)], ["email", "ilike", toStr(data.search)]);

        // Filter: parent company
        if (toInt(data.parent_id)) domain.push(["parent_id", "=", toInt(data.parent_id)]);

        // Filter: country
        if (toInt(data.country_id)) domain.push(["country_id", "=", toInt(data.country_id)]);

        // Filter: active only (default true)
        if (data.active === false || data.active === "false") domain.push(["active", "=", false]);

        // Advanced: raw JSON domain
        if (data.domain) { try { domain.push(...JSON.parse(data.domain)); } catch(e) {} }

        const kwargs = { domain, limit };
        if (offset) kwargs.offset = offset;

        const res = await utils.odooCall(opts, "res.partner", "search_read", [], kwargs);
        if (!res.ok) return res;
        const countRes = await utils.odooCall(opts, "res.partner", "search_count", [], { domain });
        if (!countRes.ok) return countRes;
        return { ok: true, partners: res.data, totalCount: countRes.data || 0 };
  }
};
