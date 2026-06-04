const { utils } = require("./utils");

module.exports = {
  async posthog_query_execute(node, msg, inputs, opts) {
    const d = inputs || {};
    const log = (opts && opts.log) ? opts.log : () => {};

    let projectId;
    try { projectId = utils.getProjectId(d); }
    catch (e) { return { ok: false, error: e.message }; }

    const queryKind = String(d.queryKind || "").trim();
    const path = queryKind
      ? `/api/projects/${encodeURIComponent(projectId)}/query/${encodeURIComponent(queryKind)}/`
      : `/api/projects/${encodeURIComponent(projectId)}/query/`;

    let body;
    try {
      body = utils.bodyFromFields(d, ["posthogQuery", "client_query_id", "refresh", "async"], ["posthogQuery"]);
      if (body.posthogQuery !== undefined) {
        body.query = body.posthogQuery;
        delete body.posthogQuery;
      }
    } catch (e) {
      return { ok: false, error: e.message };
    }
    if (!Object.keys(body).length) return { ok: false, error: "query requis." };

    log("Execution de la query PostHog...");
    const res = await utils.posthogPrivateRequest(opts, path, { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const data = res.data || {};
    return {
      ok: true,
      status: res.status,
      project_id: projectId,
      query_id: data.id || null,
      result: data.results || data.result || data,
      raw: data
    };
  }
};
