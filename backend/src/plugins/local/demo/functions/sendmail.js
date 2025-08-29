exports.key = 'sendmail';
exports.run = async (_node, _msg, inputs, opts) => {
  const to = inputs.dest || inputs.to || '';
  return { deliveredTo: to, subject: inputs.subject || null };
};
