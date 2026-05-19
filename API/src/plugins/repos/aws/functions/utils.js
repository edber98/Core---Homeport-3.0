const crypto = require("crypto");

function hmacSha256(key, data) {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest();
}

function sha256(data) {
  return crypto.createHash("sha256").update(data || "", "utf8").digest("hex");
}

function responseHeaders(headers) {
  if (!headers) return {};
  if (typeof headers.entries === "function") return Object.fromEntries(headers.entries());
  const out = {};
  if (typeof headers.get === "function") {
    for (const key of ["content-type", "etag", "x-amz-version-id", "x-amz-request-id", "x-amz-function-error", "x-amz-log-result", "x-amz-executed-version"]) {
      const value = headers.get(key);
      if (value !== undefined && value !== null) out[key] = value;
    }
  }
  return out;
}

function getSignatureKey(secretKey, dateStamp, region, service) {
  let k = hmacSha256("AWS4" + secretKey, dateStamp);
  k = hmacSha256(k, region);
  k = hmacSha256(k, service);
  k = hmacSha256(k, "aws4_request");
  return k;
}

function awsSign(method, url, headers, body, credentials, service) {
  const { accessKeyId, secretAccessKey, region } = credentials;
  if (!accessKeyId || !secretAccessKey || !region) {
    throw new Error("Missing AWS credentials (accessKeyId, secretAccessKey, region).");
  }

  const u = new URL(url);
  const now = new Date();
  const dateStamp = now.toISOString().replace(/[-:]/g, "").slice(0, 8);
  const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z/, "Z");

  headers["x-amz-date"] = amzDate;
  headers["host"] = u.host;

  const payloadHash = sha256(body || "");
  headers["x-amz-content-sha256"] = payloadHash;

  const signedHeaderKeys = Object.keys(headers).map(k => k.toLowerCase()).sort();
  const signedHeaders = signedHeaderKeys.join(";");
  const canonicalHeaders = signedHeaderKeys.map(k => `${k}:${headers[Object.keys(headers).find(h => h.toLowerCase() === k)]}\n`).join("");

  const canonicalQuerystring = u.searchParams.toString().split("&").sort().join("&");
  const canonicalUri = u.pathname || "/";

  const canonicalRequest = [method, canonicalUri, canonicalQuerystring, canonicalHeaders, signedHeaders, payloadHash].join("\n");

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, sha256(canonicalRequest)].join("\n");

  const signingKey = getSignatureKey(secretAccessKey, dateStamp, region, service);
  const signature = crypto.createHmac("sha256", signingKey).update(stringToSign, "utf8").digest("hex");

  headers["Authorization"] = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return headers;
}

async function s3Request(opts, method, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const { region } = credentials;
  if (!region) return { ok: false, error: "Missing AWS region." };

  const url = `https://s3.${region}.amazonaws.com${path}`;
  const headers = { ...(options.headers || {}) };
  if (options.contentType) headers["Content-Type"] = options.contentType;

  let body = options.body || undefined;

  try {
    awsSign(method, url, headers, body, credentials, "s3");
  } catch (e) {
    return { ok: false, error: e.message };
  }

  // Remove host header (fetch sets it)
  const fetchHeaders = { ...headers };
  delete fetchHeaders["host"];

  let res;
  try {
    res = await fetch(url, { method, headers: fetchHeaders, body });
  } catch (e) {
    return { ok: false, error: e.message };
  }

  if (options.rawResponse) {
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `HTTP ${res.status}`, status: res.status, details: text };
    }
    const buffer = await res.arrayBuffer();
    return { ok: true, data: Buffer.from(buffer).toString("base64"), contentType: res.headers.get("content-type") };
  }

  const text = await res.text();
  if (!res.ok) {
    return { ok: false, error: `HTTP ${res.status}`, status: res.status, details: text };
  }

  return { ok: true, data: text, status: res.status, headers: responseHeaders(res.headers) };
}

async function sesRequest(opts, action, params = {}) {
  const credentials = (opts && opts.credentials) || {};
  const { region } = credentials;
  if (!region) return { ok: false, error: "Missing AWS region." };

  const url = `https://email.${region}.amazonaws.com/`;
  const body = new URLSearchParams({ Action: action, ...params }).toString();
  const headers = { "Content-Type": "application/x-www-form-urlencoded" };

  try {
    awsSign("POST", url, headers, body, credentials, "ses");
  } catch (e) {
    return { ok: false, error: e.message };
  }

  const fetchHeaders = { ...headers };
  delete fetchHeaders["host"];

  let res;
  try {
    res = await fetch(url, { method: "POST", headers: fetchHeaders, body });
  } catch (e) {
    return { ok: false, error: e.message };
  }

  const text = await res.text();
  if (!res.ok) {
    return { ok: false, error: `HTTP ${res.status}`, status: res.status, details: text };
  }

  return { ok: true, data: text, status: res.status };
}

async function awsQueryRequest(opts, service, action, params = {}, version) {
  const credentials = (opts && opts.credentials) || {};
  const { region } = credentials;
  if (!region) return { ok: false, error: "Missing AWS region." };

  const url = `https://${service}.${region}.amazonaws.com/`;
  const body = new URLSearchParams({ Action: action, Version: version, ...params }).toString();
  const headers = { "Content-Type": "application/x-www-form-urlencoded" };

  try {
    awsSign("POST", url, headers, body, credentials, service);
  } catch (e) {
    return { ok: false, error: e.message };
  }

  const fetchHeaders = { ...headers };
  delete fetchHeaders["host"];

  let res;
  try {
    res = await fetch(url, { method: "POST", headers: fetchHeaders, body });
  } catch (e) {
    return { ok: false, error: e.message };
  }

  const text = await res.text();
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}`, status: res.status, details: text };
  return { ok: true, data: text, status: res.status, headers: responseHeaders(res.headers) };
}

async function lambdaInvoke(opts, functionName, payload, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const { region } = credentials;
  if (!region) return { ok: false, error: "Missing AWS region." };

  const encoded = encodeURIComponent(functionName);
  const query = options.qualifier ? `?Qualifier=${encodeURIComponent(options.qualifier)}` : "";
  const url = `https://lambda.${region}.amazonaws.com/2015-03-31/functions/${encoded}/invocations${query}`;
  const body = typeof payload === "string" ? payload : JSON.stringify(payload || {});
  const headers = {
    "Content-Type": "application/json",
    "X-Amz-Invocation-Type": options.invocationType || "RequestResponse",
    "X-Amz-Log-Type": options.logType || "None"
  };

  try {
    awsSign("POST", url, headers, body, credentials, "lambda");
  } catch (e) {
    return { ok: false, error: e.message };
  }

  const fetchHeaders = { ...headers };
  delete fetchHeaders["host"];

  let res;
  try {
    res = await fetch(url, { method: "POST", headers: fetchHeaders, body });
  } catch (e) {
    return { ok: false, error: e.message };
  }

  const text = await res.text();
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}`, status: res.status, details: text };
  return { ok: true, data: text, status: res.status, headers: responseHeaders(res.headers) };
}

function parseXmlTag(xml, tag) {
  const r = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "g");
  const matches = [];
  let m;
  while ((m = r.exec(xml)) !== null) matches.push(m[1]);
  return matches;
}

function parseXmlTagSingle(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return m ? m[1] : null;
}

module.exports = { utils: { awsSign, s3Request, sesRequest, awsQueryRequest, lambdaInvoke, parseXmlTag, parseXmlTagSingle } };
