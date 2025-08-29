exports.key = 'math_add';
exports.run = async (_node, _msg, inputs, opts) => {
  const a = Number(inputs.a || 0), b = Number(inputs.b || 0);
  return { sum: a + b };
};
