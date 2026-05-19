module.exports = {
  async openai_memory_static(node, msg, inputs, opts) {
    const text = String((inputs && inputs.text) || "").trim();
    return { ok: true, type: "ai_memory", texts: text ? [text] : [] };
  }
};
