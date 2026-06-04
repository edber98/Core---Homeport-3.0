const { utils } = require('./utils');

module.exports = {
  async outreach_sequencetemplate_create_create_a_new_sequence_template(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/sequenceTemplates";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.data_attributes_bouncecount !== undefined && d.data_attributes_bouncecount !== null && d.data_attributes_bouncecount !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["bouncecount"] = d.data_attributes_bouncecount;
    }
    if (d.data_attributes_clickcount !== undefined && d.data_attributes_clickcount !== null && d.data_attributes_clickcount !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["clickcount"] = d.data_attributes_clickcount;
    }
    if (d.data_attributes_createdat !== undefined && d.data_attributes_createdat !== null && d.data_attributes_createdat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["createdat"] = d.data_attributes_createdat;
    }
    if (d.data_attributes_delivercount !== undefined && d.data_attributes_delivercount !== null && d.data_attributes_delivercount !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["delivercount"] = d.data_attributes_delivercount;
    }
    if (d.data_attributes_enabled !== undefined && d.data_attributes_enabled !== null && d.data_attributes_enabled !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["enabled"] = d.data_attributes_enabled;
    }
    if (d.data_attributes_enabledat !== undefined && d.data_attributes_enabledat !== null && d.data_attributes_enabledat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["enabledat"] = d.data_attributes_enabledat;
    }
    if (d.data_attributes_failurecount !== undefined && d.data_attributes_failurecount !== null && d.data_attributes_failurecount !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["failurecount"] = d.data_attributes_failurecount;
    }
    if (d.data_attributes_isreply !== undefined && d.data_attributes_isreply !== null && d.data_attributes_isreply !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["isreply"] = d.data_attributes_isreply;
    }
    if (d.data_attributes_negativereplycount !== undefined && d.data_attributes_negativereplycount !== null && d.data_attributes_negativereplycount !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["negativereplycount"] = d.data_attributes_negativereplycount;
    }
    if (d.data_attributes_neutralreplycount !== undefined && d.data_attributes_neutralreplycount !== null && d.data_attributes_neutralreplycount !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["neutralreplycount"] = d.data_attributes_neutralreplycount;
    }
    if (d.data_attributes_opencount !== undefined && d.data_attributes_opencount !== null && d.data_attributes_opencount !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["opencount"] = d.data_attributes_opencount;
    }
    if (d.data_attributes_optoutcount !== undefined && d.data_attributes_optoutcount !== null && d.data_attributes_optoutcount !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["optoutcount"] = d.data_attributes_optoutcount;
    }
    if (d.data_attributes_positivereplycount !== undefined && d.data_attributes_positivereplycount !== null && d.data_attributes_positivereplycount !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["positivereplycount"] = d.data_attributes_positivereplycount;
    }
    if (d.data_attributes_replycount !== undefined && d.data_attributes_replycount !== null && d.data_attributes_replycount !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["replycount"] = d.data_attributes_replycount;
    }
    if (d.data_attributes_schedulecount !== undefined && d.data_attributes_schedulecount !== null && d.data_attributes_schedulecount !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["schedulecount"] = d.data_attributes_schedulecount;
    }
    if (d.data_attributes_updatedat !== undefined && d.data_attributes_updatedat !== null && d.data_attributes_updatedat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["updatedat"] = d.data_attributes_updatedat;
    }
    if (d.data_relationships_creator_data_id !== undefined && d.data_relationships_creator_data_id !== null && d.data_relationships_creator_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["creator"] || typeof body["data"]["relationships"]["creator"] !== 'object' || Array.isArray(body["data"]["relationships"]["creator"])) body["data"]["relationships"]["creator"] = {};
      if (!body["data"]["relationships"]["creator"]["data"] || typeof body["data"]["relationships"]["creator"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["creator"]["data"])) body["data"]["relationships"]["creator"]["data"] = {};
      body["data"]["relationships"]["creator"]["data"]["id"] = d.data_relationships_creator_data_id;
    }
    if (d.data_relationships_creator_data_type !== undefined && d.data_relationships_creator_data_type !== null && d.data_relationships_creator_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["creator"] || typeof body["data"]["relationships"]["creator"] !== 'object' || Array.isArray(body["data"]["relationships"]["creator"])) body["data"]["relationships"]["creator"] = {};
      if (!body["data"]["relationships"]["creator"]["data"] || typeof body["data"]["relationships"]["creator"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["creator"]["data"])) body["data"]["relationships"]["creator"]["data"] = {};
      body["data"]["relationships"]["creator"]["data"]["type"] = d.data_relationships_creator_data_type;
    }
    if (d.data_relationships_creator_links_related !== undefined && d.data_relationships_creator_links_related !== null && d.data_relationships_creator_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["creator"] || typeof body["data"]["relationships"]["creator"] !== 'object' || Array.isArray(body["data"]["relationships"]["creator"])) body["data"]["relationships"]["creator"] = {};
      if (!body["data"]["relationships"]["creator"]["links"] || typeof body["data"]["relationships"]["creator"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["creator"]["links"])) body["data"]["relationships"]["creator"]["links"] = {};
      body["data"]["relationships"]["creator"]["links"]["related"] = d.data_relationships_creator_links_related;
    }
    if (d.data_relationships_sequencestep_data_id !== undefined && d.data_relationships_sequencestep_data_id !== null && d.data_relationships_sequencestep_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["sequencestep"] || typeof body["data"]["relationships"]["sequencestep"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequencestep"])) body["data"]["relationships"]["sequencestep"] = {};
      if (!body["data"]["relationships"]["sequencestep"]["data"] || typeof body["data"]["relationships"]["sequencestep"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequencestep"]["data"])) body["data"]["relationships"]["sequencestep"]["data"] = {};
      body["data"]["relationships"]["sequencestep"]["data"]["id"] = d.data_relationships_sequencestep_data_id;
    }
    if (d.data_relationships_sequencestep_data_type !== undefined && d.data_relationships_sequencestep_data_type !== null && d.data_relationships_sequencestep_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["sequencestep"] || typeof body["data"]["relationships"]["sequencestep"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequencestep"])) body["data"]["relationships"]["sequencestep"] = {};
      if (!body["data"]["relationships"]["sequencestep"]["data"] || typeof body["data"]["relationships"]["sequencestep"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequencestep"]["data"])) body["data"]["relationships"]["sequencestep"]["data"] = {};
      body["data"]["relationships"]["sequencestep"]["data"]["type"] = d.data_relationships_sequencestep_data_type;
    }
    if (d.data_relationships_sequencestep_links_related !== undefined && d.data_relationships_sequencestep_links_related !== null && d.data_relationships_sequencestep_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["sequencestep"] || typeof body["data"]["relationships"]["sequencestep"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequencestep"])) body["data"]["relationships"]["sequencestep"] = {};
      if (!body["data"]["relationships"]["sequencestep"]["links"] || typeof body["data"]["relationships"]["sequencestep"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequencestep"]["links"])) body["data"]["relationships"]["sequencestep"]["links"] = {};
      body["data"]["relationships"]["sequencestep"]["links"]["related"] = d.data_relationships_sequencestep_links_related;
    }
    if (d.data_relationships_template_data_id !== undefined && d.data_relationships_template_data_id !== null && d.data_relationships_template_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["template"] || typeof body["data"]["relationships"]["template"] !== 'object' || Array.isArray(body["data"]["relationships"]["template"])) body["data"]["relationships"]["template"] = {};
      if (!body["data"]["relationships"]["template"]["data"] || typeof body["data"]["relationships"]["template"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["template"]["data"])) body["data"]["relationships"]["template"]["data"] = {};
      body["data"]["relationships"]["template"]["data"]["id"] = d.data_relationships_template_data_id;
    }
    if (d.data_relationships_template_data_type !== undefined && d.data_relationships_template_data_type !== null && d.data_relationships_template_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["template"] || typeof body["data"]["relationships"]["template"] !== 'object' || Array.isArray(body["data"]["relationships"]["template"])) body["data"]["relationships"]["template"] = {};
      if (!body["data"]["relationships"]["template"]["data"] || typeof body["data"]["relationships"]["template"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["template"]["data"])) body["data"]["relationships"]["template"]["data"] = {};
      body["data"]["relationships"]["template"]["data"]["type"] = d.data_relationships_template_data_type;
    }
    if (d.data_relationships_template_links_related !== undefined && d.data_relationships_template_links_related !== null && d.data_relationships_template_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["template"] || typeof body["data"]["relationships"]["template"] !== 'object' || Array.isArray(body["data"]["relationships"]["template"])) body["data"]["relationships"]["template"] = {};
      if (!body["data"]["relationships"]["template"]["links"] || typeof body["data"]["relationships"]["template"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["template"]["links"])) body["data"]["relationships"]["template"]["links"] = {};
      body["data"]["relationships"]["template"]["links"]["related"] = d.data_relationships_template_links_related;
    }
    if (d.data_relationships_updater_data_id !== undefined && d.data_relationships_updater_data_id !== null && d.data_relationships_updater_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["updater"] || typeof body["data"]["relationships"]["updater"] !== 'object' || Array.isArray(body["data"]["relationships"]["updater"])) body["data"]["relationships"]["updater"] = {};
      if (!body["data"]["relationships"]["updater"]["data"] || typeof body["data"]["relationships"]["updater"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["updater"]["data"])) body["data"]["relationships"]["updater"]["data"] = {};
      body["data"]["relationships"]["updater"]["data"]["id"] = d.data_relationships_updater_data_id;
    }
    if (d.data_relationships_updater_data_type !== undefined && d.data_relationships_updater_data_type !== null && d.data_relationships_updater_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["updater"] || typeof body["data"]["relationships"]["updater"] !== 'object' || Array.isArray(body["data"]["relationships"]["updater"])) body["data"]["relationships"]["updater"] = {};
      if (!body["data"]["relationships"]["updater"]["data"] || typeof body["data"]["relationships"]["updater"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["updater"]["data"])) body["data"]["relationships"]["updater"]["data"] = {};
      body["data"]["relationships"]["updater"]["data"]["type"] = d.data_relationships_updater_data_type;
    }
    if (d.data_relationships_updater_links_related !== undefined && d.data_relationships_updater_links_related !== null && d.data_relationships_updater_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["updater"] || typeof body["data"]["relationships"]["updater"] !== 'object' || Array.isArray(body["data"]["relationships"]["updater"])) body["data"]["relationships"]["updater"] = {};
      if (!body["data"]["relationships"]["updater"]["links"] || typeof body["data"]["relationships"]["updater"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["updater"]["links"])) body["data"]["relationships"]["updater"]["links"] = {};
      body["data"]["relationships"]["updater"]["links"]["related"] = d.data_relationships_updater_links_related;
    }
    if (d.data_type !== undefined && d.data_type !== null && d.data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      body["data"]["type"] = d.data_type;
    }

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'POST', query, body });
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

