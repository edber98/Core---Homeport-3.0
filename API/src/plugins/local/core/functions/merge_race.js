exports.key = 'merge_race';
exports.run = async (node, msg, inputs, opts) => {
  const timeoutMs = inputs?.timeoutMs ?? 0;
  const cancelOthers = inputs?.cancelOthers ?? true;
  // Minimal placeholder: single input wins
  return { ok: true, winner: { nodeId: node.id }, losers: [], timeoutMs, cancelOthers, payload: msg.payload };
};
