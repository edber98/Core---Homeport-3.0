const { utils } = require("./utils");

module.exports = {
  async aws_lambda_invoke(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const functionName = String(d.functionName || "").trim();
    if (!functionName) return { ok: false, error: "Nom de fonction requis." };

    let payload = {};
    if (d.payload) {
      try {
        payload = typeof d.payload === "object" ? d.payload : JSON.parse(String(d.payload));
      } catch {
        return { ok: false, error: "JSON invalide dans payload." };
      }
    }

    log("Invocation Lambda...");
    const res = await utils.lambdaInvoke(opts, functionName, payload, {
      invocationType: d.invocationType || "RequestResponse",
      logType: d.logType || "None",
      qualifier: d.qualifier
    });
    if (!res.ok) return res;
    return {
      ok: true,
      statusCode: String(res.status || ""),
      functionError: res.headers && res.headers["x-amz-function-error"] || "",
      executedVersion: res.headers && res.headers["x-amz-executed-version"] || "",
      logResult: res.headers && res.headers["x-amz-log-result"] || "",
      payload: res.data || ""
    };
  }
};
