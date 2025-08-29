exports.key = 'text_upper';
exports.run = async (_node, _msg, inputs, opts) => {
  const s = (inputs.text || '').toString();
  return { text: s.toUpperCase() };
};
