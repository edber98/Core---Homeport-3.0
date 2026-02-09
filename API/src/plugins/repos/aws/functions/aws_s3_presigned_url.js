const { utils } = require("./utils");
const crypto = require("crypto");

module.exports = {
  async aws_s3_presigned_url(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.bucket) return { ok: false, error: "Bucket requis." };
    if (!d.key) return { ok: false, error: "Clé de l'objet requise." };

    const credentials = (opts && opts.credentials) || {};
    const { accessKeyId, secretAccessKey, region } = credentials;
    if (!accessKeyId || !secretAccessKey || !region) {
      return { ok: false, error: "Missing AWS credentials." };
    }

    const method = d.method || "GET";
    const expiresIn = d.expiresIn || 3600;
    const now = new Date();
    const dateStamp = now.toISOString().replace(/[-:]/g, "").slice(0, 8);
    const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z/, "Z");
    const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;

    const host = `s3.${region}.amazonaws.com`;
    const path = `/${d.bucket}/${encodeURIComponent(d.key)}`;

    const params = new URLSearchParams({
      "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
      "X-Amz-Credential": `${accessKeyId}/${credentialScope}`,
      "X-Amz-Date": amzDate,
      "X-Amz-Expires": String(expiresIn),
      "X-Amz-SignedHeaders": "host"
    });

    const canonicalRequest = [method, path, params.toString().split("&").sort().join("&"),
      `host:${host}\n`, "host", "UNSIGNED-PAYLOAD"].join("\n");

    const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope,
      crypto.createHash("sha256").update(canonicalRequest).digest("hex")].join("\n");

    function hmac(key, data) { return crypto.createHmac("sha256", key).update(data, "utf8").digest(); }
    let k = hmac("AWS4" + secretAccessKey, dateStamp);
    k = hmac(k, region);
    k = hmac(k, "s3");
    k = hmac(k, "aws4_request");
    const signature = crypto.createHmac("sha256", k).update(stringToSign, "utf8").digest("hex");

    params.set("X-Amz-Signature", signature);
    const url = `https://${host}${path}?${params}`;

    return { ok: true, status: "success", message: url };
  }
};
