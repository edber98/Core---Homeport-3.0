exports.key = 'wait_all';
exports.run = async (node, msg, inputs, opts) => {
  const expected = inputs?.expected ?? 'auto';
  const combine = inputs?.combine ?? 'array';
  const objectKey = inputs?.objectKey ?? 'nodeId';
  // Minimal placeholder: engine is sequential; just wrap current payload
  return { ok: true, waited: { expected, combine, objectKey }, received: 1, payload: msg.payload };
};
