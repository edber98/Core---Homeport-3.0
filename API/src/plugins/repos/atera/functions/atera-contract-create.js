const { utils } = require("./utils");

module.exports = {
  async atera_contract_create(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.ContractName) return { ok: false, error: "Missing ContractName." };
    if (!d.CustomerID) return { ok: false, error: "Missing CustomerID." };

    const body = { ContractName: d.ContractName, CustomerID: Number(d.CustomerID) };
    if (d.ContractType) body.ContractType = d.ContractType;
    if (d.Active !== undefined && d.Active !== "") body.Active = d.Active === "true" || d.Active === true;
    if (d.StartDate) body.StartDate = d.StartDate;
    if (d.EndDate) body.EndDate = d.EndDate;

    const res = await utils.ateraRequest(opts, "/contracts", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...res.data };
  }
};
