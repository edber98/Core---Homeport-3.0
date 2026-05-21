const { utils } = require("./utils");

module.exports = {
  async midjourney_submit_jobs(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};

    const prompt = String(d.prompt || "").trim();
    if (!prompt) return { ok: false, error: "Prompt requis." };

    const mode = String(d.mode || "fast").trim().toLowerCase();
    if (!["fast", "relaxed"].includes(mode)) {
      return { ok: false, error: "Mode invalide. Valeurs autorisées: fast, relaxed." };
    }

    const body = {
      prompt,
      mode
    };

    const hookUrl = String(d.hookUrl || "").trim();
    if (hookUrl) body.hookUrl = hookUrl;

    if (d.timeout !== undefined && d.timeout !== null && d.timeout !== "") {
      const timeout = Number(d.timeout);
      if (!Number.isFinite(timeout) || timeout < 300 || timeout > 1200) {
        return { ok: false, error: "Timeout invalide. Valeur attendue entre 300 et 1200 secondes." };
      }
      body.timeout = Math.round(timeout);
    }

    if (d.extraBody !== undefined && d.extraBody !== null && d.extraBody !== "") {
      let extra;
      try {
        extra = utils.parseJsonInput(d.extraBody, "extraBody");
      } catch (e) {
        return { ok: false, error: e.message };
      }
      if (extra && typeof extra === "object" && !Array.isArray(extra)) {
        Object.assign(body, extra);
      } else {
        return { ok: false, error: "extraBody doit être un objet JSON." };
      }
    }

    log("Soumission du job Midjourney...");
    const res = await utils.midjourneyRequest(opts, "/midjourney/v1/submit-jobs", {
      method: "POST",
      body
    });

    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const payload = res.data || {};
    return {
      ok: true,
      status: Number(payload.status || 0),
      message: payload.message || "success",
      taskId: payload?.data?.taskId || "",
      raw: payload
    };
  }
};
