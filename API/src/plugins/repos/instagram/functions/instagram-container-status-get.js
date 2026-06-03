const { utils } = require("./utils");

module.exports = {
  async instagram_container_status_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const containerId = String(d.containerId || "").trim();
    if (!containerId) return { ok: false, error: "ID du container requis." };

    const res = await utils.instagramRequest(opts, `/${encodeURIComponent(containerId)}`, {
      query: { fields: "id,status,status_code" }
    });
    if (!res.ok) return res;
    return { ok: true, id: res.data?.id || containerId, statusCode: res.data?.status_code || "", status: res.data?.status || "" };
  }
};
