exports.key = 'http';
exports.run = async (_node, _msg, inputs) => {
  // placeholder: echo inputs; real HTTP can be implemented later
  return { status: 200, request: inputs };
};

