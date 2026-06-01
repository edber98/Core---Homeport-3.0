module.exports = {
  async twilio_update_call(node, msg, inputs, opts) {
    const { twilioRequest } = require("./utils").utils;
    const d = inputs || {};
    if (!d.callSid) return { ok: false, error: "callSid requis." };
    const body = {};
    if (d.status) body.Status = d.status;
    if (d.url) body.Url = d.url;
    if (d.twiml) body.Twiml = d.twiml;
    if (d.method) body.Method = d.method;
    const res = await twilioRequest(opts, "POST", `/Calls/${encodeURIComponent(String(d.callSid))}`, body);
    return res;
  }
};
