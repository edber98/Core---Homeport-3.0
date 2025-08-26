exports.key = 'core_function_code';
exports.run = async (_node, _msg, inputs) => {
  // Security: do not eval arbitrary code in this demo runtime.
  // Placeholder returns inputs as-is.
  return inputs;
};

