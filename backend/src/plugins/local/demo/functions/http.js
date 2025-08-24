exports.key = 'http';
exports.run = async (_node, _msg, inputs) => {
  // Demo: echo request (no real HTTP without external deps)
  return { status: 200, request: { url: inputs.url, method: inputs.method, body: inputs.body || null } };
};

