exports.key = 'delay';
exports.run = async (_node, _msg, inputs, opts) => {
  const ms = Number(inputs.ms || inputs.delay || 100);
  await new Promise(r => setTimeout(r, isNaN(ms) ? 100 : ms));
  return { delayed: true, ms };
};
