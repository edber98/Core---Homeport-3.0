const { utils } = require("./utils");
module.exports = { async wise_transfer_receipt_get(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.transferId) return { ok: false, error: "transferId requis." };
  const res = await utils.wiseRequest(opts, `/v1/transfers/${encodeURIComponent(String(d.transferId))}/receipt.pdf`, { responseType: "text" });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  return { ok: true, id: d.transferId, status: "receipt", text: Buffer.from(String(res.data)).toString("base64"), result_json: utils.compactJson({ encoding: "base64", contentType: "application/pdf" }) };
} };
