const { utils } = require("./utils");

module.exports = {
  async aws_lambda_invoke(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const functionName = String(d.functionName || "").trim();
    if (!functionName) return { ok: false, error: "Nom de fonction requis." };

    const payload = {};
    for (const field of Array.isArray(d.eventFields) ? d.eventFields : []) {
      const key = String(field && field.eventKey || "").trim();
      if (!key) continue;
      const rawValue = field && field.eventValue;
      switch (field && field.eventValueType || "string") {
        case "number": {
          const numberValue = Number(rawValue);
          if (Number.isNaN(numberValue)) return { ok: false, error: `Nombre invalide pour ${key}.` };
          payload[key] = numberValue;
          break;
        }
        case "boolean":
          payload[key] = rawValue === true || String(rawValue).toLowerCase() === "true";
          break;
        case "null":
          payload[key] = null;
          break;
        default:
          payload[key] = rawValue == null ? "" : String(rawValue);
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
