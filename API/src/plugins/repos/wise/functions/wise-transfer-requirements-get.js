const { utils } = require("./utils");

module.exports = {
  async wise_transfer_requirements_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    for (const key of ["targetAccount","quoteUuid"]) {
      if (d[key] === undefined || d[key] === null || d[key] === "") return { ok: false, error: `${key} requis.` };
    }
    const json = {};
    try {
      for (const key of ["details"]) json[key] = utils.parseJsonInput(d[key], key, undefined);
    } catch (e) {
      return { ok: false, error: e.message };
    }
    const path = `/v1/transfer-requirements`;
    const query = {};
    const body = ({ targetAccount: Number(d.targetAccount), quoteUuid: String(d.quoteUuid), details: json.details || {} });
    log("Appel API en cours...");
    const options = { method: "POST", query, body };
    const res = await utils.wiseRequest(opts, path, options);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    if (false) {
      const rawItems = utils.asArray(utils.getPath(res.data, null));
      const items = rawItems.map(utils.itemFromUnknown);
      return { ok: true, items, totalCount: Number(res.data?.pagination?.total || res.data?.total || res.data?.totalCount || items.length), nextCursor: "" };
    }
    const r = res.data?.data || res.data || {};
    return {
      ok: true,
      id: String(r.id || r.key || r.uuid || r.uid || d.id || d.fileKey || d.boardId || d.projectId || ""),
      status: r.status || r.state || r.type || "",
      name: r.name || r.title || r.subject || "",
      url: r.url || r.html_url || r.web_url || r.shareUrl || "",
      text: typeof r === "string" ? r : (r.text || r.message || r.description || ""),
      result_json: utils.compactJson(res.data)
    };
  }
};
