const { utils } = require("./utils");

module.exports = {
  async aws_lambda_list_functions(node, msg, inputs, opts) {
    const d = inputs || {};
    const params = {};
    if (d.maxItems) params.MaxItems = String(d.maxItems);

    const res = await utils.awsQueryRequest(opts, "lambda", "ListFunctions", params, "2015-03-31");
    if (!res.ok) return res;

    const names = utils.parseXmlTag(res.data, "FunctionName");
    const arns = utils.parseXmlTag(res.data, "FunctionArn");
    const runtimes = utils.parseXmlTag(res.data, "Runtime");
    const modified = utils.parseXmlTag(res.data, "LastModified");

    const items = names.map((name, i) => ({
      functionName: name || "",
      functionArn: arns[i] || "",
      runtime: runtimes[i] || "",
      lastModified: modified[i] || ""
    }));

    return { ok: true, functions: items, totalCount: String(items.length) };
  }
};
