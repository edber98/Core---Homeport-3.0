module.exports = {
  async openai_memory_merge(node, msg, inputs, opts) {
    const arrs = [];
    if (Array.isArray(inputs?.texts)) arrs.push(inputs.texts);
    if (Array.isArray(inputs?.memory?.texts)) arrs.push(inputs.memory.texts);
    if (Array.isArray(msg?.texts)) arrs.push(msg.texts);
    const flat = [].concat(...arrs);
    const dedupe = Boolean(inputs?.dedupe);
    return { ok: true, type: "ai_memory", texts: dedupe ? Array.from(new Set(flat)) : flat };
  }
};
