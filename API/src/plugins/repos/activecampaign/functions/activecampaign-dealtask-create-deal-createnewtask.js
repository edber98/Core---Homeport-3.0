const { utils } = require('./utils');

module.exports = {
  async activecampaign_dealtask_create_deal_createnewtask(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/dealTasks";
    

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = {};
    if (d.dealtask_title !== undefined && d.dealtask_title !== null && d.dealtask_title !== "") {
          if (!body["dealtask"] || typeof body["dealtask"] !== 'object' || Array.isArray(body["dealtask"])) body["dealtask"] = {};
          body["dealtask"]["title"] = d.dealtask_title;
        }
    if (d.dealtask_ownertype !== undefined && d.dealtask_ownertype !== null && d.dealtask_ownertype !== "") {
          if (!body["dealtask"] || typeof body["dealtask"] !== 'object' || Array.isArray(body["dealtask"])) body["dealtask"] = {};
          body["dealtask"]["ownertype"] = d.dealtask_ownertype;
        }
    if (d.dealtask_relid !== undefined && d.dealtask_relid !== null && d.dealtask_relid !== "") {
          if (!body["dealtask"] || typeof body["dealtask"] !== 'object' || Array.isArray(body["dealtask"])) body["dealtask"] = {};
          body["dealtask"]["relid"] = d.dealtask_relid;
        }
    if (d.dealtask_status !== undefined && d.dealtask_status !== null && d.dealtask_status !== "") {
          if (!body["dealtask"] || typeof body["dealtask"] !== 'object' || Array.isArray(body["dealtask"])) body["dealtask"] = {};
          body["dealtask"]["status"] = d.dealtask_status;
        }
    if (d.dealtask_note !== undefined && d.dealtask_note !== null && d.dealtask_note !== "") {
          if (!body["dealtask"] || typeof body["dealtask"] !== 'object' || Array.isArray(body["dealtask"])) body["dealtask"] = {};
          body["dealtask"]["note"] = d.dealtask_note;
        }
    if (d.dealtask_duedate !== undefined && d.dealtask_duedate !== null && d.dealtask_duedate !== "") {
          if (!body["dealtask"] || typeof body["dealtask"] !== 'object' || Array.isArray(body["dealtask"])) body["dealtask"] = {};
          body["dealtask"]["duedate"] = d.dealtask_duedate;
        }
    if (d.dealtask_dealtasktype !== undefined && d.dealtask_dealtasktype !== null && d.dealtask_dealtasktype !== "") {
          if (!body["dealtask"] || typeof body["dealtask"] !== 'object' || Array.isArray(body["dealtask"])) body["dealtask"] = {};
          body["dealtask"]["dealtasktype"] = d.dealtask_dealtasktype;
        }
    if (d.dealtask_assignee !== undefined && d.dealtask_assignee !== null && d.dealtask_assignee !== "") {
          if (!body["dealtask"] || typeof body["dealtask"] !== 'object' || Array.isArray(body["dealtask"])) body["dealtask"] = {};
          body["dealtask"]["assignee"] = d.dealtask_assignee;
        }
    if (d.dealtask_triggerautomationoncreate !== undefined && d.dealtask_triggerautomationoncreate !== null && d.dealtask_triggerautomationoncreate !== "") {
          if (!body["dealtask"] || typeof body["dealtask"] !== 'object' || Array.isArray(body["dealtask"])) body["dealtask"] = {};
          body["dealtask"]["triggerautomationoncreate"] = d.dealtask_triggerautomationoncreate;
        }
    if (d.dealtask_doneautomation !== undefined && d.dealtask_doneautomation !== null && d.dealtask_doneautomation !== "") {
          if (!body["dealtask"] || typeof body["dealtask"] !== 'object' || Array.isArray(body["dealtask"])) body["dealtask"] = {};
          body["dealtask"]["doneautomation"] = d.dealtask_doneautomation;
        }
    const requestBody = Object.keys(body).length ? body : undefined;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'POST', query, body: requestBody });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return {
      ok: true,
      id: r.id || r.uuid || r.key || '',
      name: r.name || r.title || '',
      url: r.url || r.html_url || '',
      status: r.status || r.state || '',
      created_at: r.created_at || r.createdAt || '',
      updated_at: r.updated_at || r.updatedAt || '',
      raw: r
    };
  }
};
