const { utils } = require("./utils");

module.exports = {
  async datadog_monitors_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    log("Liste des monitors...");
    const res = await utils.datadogRequest(opts, "/api/v1/monitor", {
      query: utils.compact({
        group_states: d.groupStates,
        name: d.name,
        tags: d.tags,
        monitor_tags: d.monitorTags,
        page: utils.toNumber(d.page),
        page_size: utils.toNumber(d.pageSize)
      })
    });
    if (!res.ok) return res;
    return utils.monitorsResult(res.data);
  }
};
