module.exports = {
  async email_send(node, msg, inputs, opts) {
    // Placeholder: would send via SMTP (nodemailer)
    return { ok: true, sent: true, envelope: { from: node.args?.from, to: node.args?.to }, node, msg, inputs };
  }
};
