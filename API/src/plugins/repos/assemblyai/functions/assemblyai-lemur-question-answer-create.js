const { utils } = require("./utils");

module.exports = {
  async assemblyai_lemur_question_answer_create(node, msg, inputs, opts) {
    const d = inputs || {};
    let transcriptIds;
    try { transcriptIds = utils.parseJsonInput(d.transcriptIds, "IDs", null); } catch (e) { return { ok: false, error: e.message }; }
    if (!Array.isArray(transcriptIds) || !transcriptIds.length) return { ok: false, error: "IDs JSON requis." };

    let questions;
    try { questions = utils.parseJsonInput(d.questions, "questions", null); } catch (e) { return { ok: false, error: e.message }; }
    if (!Array.isArray(questions) || !questions.length) return { ok: false, error: "questions JSON requis." };

    const body = {
      transcript_ids: transcriptIds,
      questions,
      answer_format: d.answerFormat || undefined,
      context: d.context || undefined,
      final_model: d.model || undefined
    };

    const res = await utils.assemblyaiRequest(opts, "/lemur/v3/generate/question-answer", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const answer = Array.isArray(res.data?.response) ? res.data.response.map((r) => r.answer || "").join("\n") : "";
    return { ok: true, id: res.data?.request_id || "", status: "completed", text: answer, result_json: utils.compactJson(res.data) };
  }
};
