const { utils } = require("./utils");

module.exports = {
  async assemblyai_lemur_summary_create(node, msg, inputs, opts) {
    const d = inputs || {};
    let transcriptIds;
    try { transcriptIds = utils.parseJsonInput(d.transcriptIds, "IDs", null); } catch (e) { return { ok: false, error: e.message }; }
    if (!Array.isArray(transcriptIds) || !transcriptIds.length) return { ok: false, error: "IDs JSON requis." };

    const body = {
      transcript_ids: transcriptIds,
      answer_format: d.answerFormat || undefined,
      context: d.context || undefined,
      final_model: d.model || undefined
    };

    const res = await utils.assemblyaiRequest(opts, "/lemur/v3/generate/summary", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, id: res.data?.request_id || "", status: "completed", text: res.data?.response || "", result_json: utils.compactJson(res.data) };
  }
};
