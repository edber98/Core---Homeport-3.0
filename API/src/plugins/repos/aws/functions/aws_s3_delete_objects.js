const { utils } = require("./utils");

module.exports = {
  async aws_s3_delete_objects(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.bucket) return { ok: false, error: "Bucket requis." };

    let keys = d.keys;
    if (typeof keys === "string") {
      try { keys = JSON.parse(keys); } catch { return { ok: false, error: "keys doit être un JSON valide." }; }
    }
    if (!Array.isArray(keys) || !keys.length) return { ok: false, error: "Liste des clés requise." };

    const objectXml = keys.map((k) => `<Object><Key>${String(k)}</Key></Object>`).join("");
    const body = `<?xml version=\"1.0\" encoding=\"UTF-8\"?><Delete><Quiet>true</Quiet>${objectXml}</Delete>`;
    const res = await utils.s3Request(opts, "POST", `/${d.bucket}?delete`, {
      body,
      contentType: "application/xml"
    });
    if (!res.ok) return res;
    return { ok: true, status: "success", message: `${keys.length} objet(s) supprimé(s).` };
  }
};
