const { utils } = require("./utils");

module.exports = {
  async mistral_files_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {
      page: d.page ? Number(d.page) : undefined,
      page_size: d.pageSize ? Number(d.pageSize) : undefined,
      purpose: d.purpose ? String(d.purpose) : undefined
    };
    const res = await utils.mistralRequest(opts, "/files", { method: "GET", query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      id: "",
      text: JSON.stringify(res.data?.data || []),
      json: JSON.stringify(res.data || {})
    };
  }
};
