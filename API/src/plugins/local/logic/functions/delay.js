exports.key = 'delay';
exports.run = async (node, msg, inputs, opts) => {
  const ms = Math.max(0, Number(inputs.ms) || 100);
  await new Promise(resolve => setTimeout(resolve, ms));
  return { ok: true, waited: ms };
};
