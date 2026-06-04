const { utils } = require('./utils');

module.exports = {
  async outreach_sequencestep_update_update_a_sequence_step(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/sequenceSteps/{id}";
    const id = String(d.id || '').trim();
    if (!id) return { ok: false, error: 'id requis.' };
    reqPath = reqPath.replace('{id}', encodeURIComponent(id));

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
    if (d.data_attributes_date !== undefined && d.data_attributes_date !== null && d.data_attributes_date !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["date"] = d.data_attributes_date;
    }
    if (d.data_attributes_delivercount !== undefined && d.data_attributes_delivercount !== null && d.data_attributes_delivercount !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["delivercount"] = d.data_attributes_delivercount;
    }
    if (d.data_attributes_displayname !== undefined && d.data_attributes_displayname !== null && d.data_attributes_displayname !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["displayname"] = d.data_attributes_displayname;
    }
    if (d.data_attributes_failurecount !== undefined && d.data_attributes_failurecount !== null && d.data_attributes_failurecount !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["failurecount"] = d.data_attributes_failurecount;
    }
    if (d.data_attributes_interval !== undefined && d.data_attributes_interval !== null && d.data_attributes_interval !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["interval"] = d.data_attributes_interval;
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
    if (d.data_attributes_order !== undefined && d.data_attributes_order !== null && d.data_attributes_order !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["order"] = d.data_attributes_order;
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
    if (d.data_attributes_steptype !== undefined && d.data_attributes_steptype !== null && d.data_attributes_steptype !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["steptype"] = d.data_attributes_steptype;
    }
    if (d.data_attributes_taskautoskipdelay !== undefined && d.data_attributes_taskautoskipdelay !== null && d.data_attributes_taskautoskipdelay !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["taskautoskipdelay"] = d.data_attributes_taskautoskipdelay;
    }
    if (d.data_attributes_tasknote !== undefined && d.data_attributes_tasknote !== null && d.data_attributes_tasknote !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["tasknote"] = d.data_attributes_tasknote;
    }
    if (d.data_attributes_updatedat !== undefined && d.data_attributes_updatedat !== null && d.data_attributes_updatedat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["updatedat"] = d.data_attributes_updatedat;
    }
    if (d.data_id !== undefined && d.data_id !== null && d.data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      body["data"]["id"] = d.data_id;
    }
    if (d.data_relationships_callpurpose_data_id !== undefined && d.data_relationships_callpurpose_data_id !== null && d.data_relationships_callpurpose_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["callpurpose"] || typeof body["data"]["relationships"]["callpurpose"] !== 'object' || Array.isArray(body["data"]["relationships"]["callpurpose"])) body["data"]["relationships"]["callpurpose"] = {};
      if (!body["data"]["relationships"]["callpurpose"]["data"] || typeof body["data"]["relationships"]["callpurpose"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["callpurpose"]["data"])) body["data"]["relationships"]["callpurpose"]["data"] = {};
      body["data"]["relationships"]["callpurpose"]["data"]["id"] = d.data_relationships_callpurpose_data_id;
    }
    if (d.data_relationships_callpurpose_data_type !== undefined && d.data_relationships_callpurpose_data_type !== null && d.data_relationships_callpurpose_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["callpurpose"] || typeof body["data"]["relationships"]["callpurpose"] !== 'object' || Array.isArray(body["data"]["relationships"]["callpurpose"])) body["data"]["relationships"]["callpurpose"] = {};
      if (!body["data"]["relationships"]["callpurpose"]["data"] || typeof body["data"]["relationships"]["callpurpose"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["callpurpose"]["data"])) body["data"]["relationships"]["callpurpose"]["data"] = {};
      body["data"]["relationships"]["callpurpose"]["data"]["type"] = d.data_relationships_callpurpose_data_type;
    }
    if (d.data_relationships_callpurpose_links_related !== undefined && d.data_relationships_callpurpose_links_related !== null && d.data_relationships_callpurpose_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["callpurpose"] || typeof body["data"]["relationships"]["callpurpose"] !== 'object' || Array.isArray(body["data"]["relationships"]["callpurpose"])) body["data"]["relationships"]["callpurpose"] = {};
      if (!body["data"]["relationships"]["callpurpose"]["links"] || typeof body["data"]["relationships"]["callpurpose"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["callpurpose"]["links"])) body["data"]["relationships"]["callpurpose"]["links"] = {};
      body["data"]["relationships"]["callpurpose"]["links"]["related"] = d.data_relationships_callpurpose_links_related;
    }
    if (d.data_relationships_calls_links_related !== undefined && d.data_relationships_calls_links_related !== null && d.data_relationships_calls_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["calls"] || typeof body["data"]["relationships"]["calls"] !== 'object' || Array.isArray(body["data"]["relationships"]["calls"])) body["data"]["relationships"]["calls"] = {};
      if (!body["data"]["relationships"]["calls"]["links"] || typeof body["data"]["relationships"]["calls"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["calls"]["links"])) body["data"]["relationships"]["calls"]["links"] = {};
      body["data"]["relationships"]["calls"]["links"]["related"] = d.data_relationships_calls_links_related;
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
    if (d.data_relationships_mailings_links_related !== undefined && d.data_relationships_mailings_links_related !== null && d.data_relationships_mailings_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["mailings"] || typeof body["data"]["relationships"]["mailings"] !== 'object' || Array.isArray(body["data"]["relationships"]["mailings"])) body["data"]["relationships"]["mailings"] = {};
      if (!body["data"]["relationships"]["mailings"]["links"] || typeof body["data"]["relationships"]["mailings"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["mailings"]["links"])) body["data"]["relationships"]["mailings"]["links"] = {};
      body["data"]["relationships"]["mailings"]["links"]["related"] = d.data_relationships_mailings_links_related;
    }
    if (d.data_relationships_schedule_data_id !== undefined && d.data_relationships_schedule_data_id !== null && d.data_relationships_schedule_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["schedule"] || typeof body["data"]["relationships"]["schedule"] !== 'object' || Array.isArray(body["data"]["relationships"]["schedule"])) body["data"]["relationships"]["schedule"] = {};
      if (!body["data"]["relationships"]["schedule"]["data"] || typeof body["data"]["relationships"]["schedule"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["schedule"]["data"])) body["data"]["relationships"]["schedule"]["data"] = {};
      body["data"]["relationships"]["schedule"]["data"]["id"] = d.data_relationships_schedule_data_id;
    }
    if (d.data_relationships_schedule_data_type !== undefined && d.data_relationships_schedule_data_type !== null && d.data_relationships_schedule_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["schedule"] || typeof body["data"]["relationships"]["schedule"] !== 'object' || Array.isArray(body["data"]["relationships"]["schedule"])) body["data"]["relationships"]["schedule"] = {};
      if (!body["data"]["relationships"]["schedule"]["data"] || typeof body["data"]["relationships"]["schedule"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["schedule"]["data"])) body["data"]["relationships"]["schedule"]["data"] = {};
      body["data"]["relationships"]["schedule"]["data"]["type"] = d.data_relationships_schedule_data_type;
    }
    if (d.data_relationships_schedule_links_related !== undefined && d.data_relationships_schedule_links_related !== null && d.data_relationships_schedule_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["schedule"] || typeof body["data"]["relationships"]["schedule"] !== 'object' || Array.isArray(body["data"]["relationships"]["schedule"])) body["data"]["relationships"]["schedule"] = {};
      if (!body["data"]["relationships"]["schedule"]["links"] || typeof body["data"]["relationships"]["schedule"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["schedule"]["links"])) body["data"]["relationships"]["schedule"]["links"] = {};
      body["data"]["relationships"]["schedule"]["links"]["related"] = d.data_relationships_schedule_links_related;
    }
    if (d.data_relationships_sequence_data_id !== undefined && d.data_relationships_sequence_data_id !== null && d.data_relationships_sequence_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["sequence"] || typeof body["data"]["relationships"]["sequence"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequence"])) body["data"]["relationships"]["sequence"] = {};
      if (!body["data"]["relationships"]["sequence"]["data"] || typeof body["data"]["relationships"]["sequence"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequence"]["data"])) body["data"]["relationships"]["sequence"]["data"] = {};
      body["data"]["relationships"]["sequence"]["data"]["id"] = d.data_relationships_sequence_data_id;
    }
    if (d.data_relationships_sequence_data_type !== undefined && d.data_relationships_sequence_data_type !== null && d.data_relationships_sequence_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["sequence"] || typeof body["data"]["relationships"]["sequence"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequence"])) body["data"]["relationships"]["sequence"] = {};
      if (!body["data"]["relationships"]["sequence"]["data"] || typeof body["data"]["relationships"]["sequence"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequence"]["data"])) body["data"]["relationships"]["sequence"]["data"] = {};
      body["data"]["relationships"]["sequence"]["data"]["type"] = d.data_relationships_sequence_data_type;
    }
    if (d.data_relationships_sequence_links_related !== undefined && d.data_relationships_sequence_links_related !== null && d.data_relationships_sequence_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["sequence"] || typeof body["data"]["relationships"]["sequence"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequence"])) body["data"]["relationships"]["sequence"] = {};
      if (!body["data"]["relationships"]["sequence"]["links"] || typeof body["data"]["relationships"]["sequence"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequence"]["links"])) body["data"]["relationships"]["sequence"]["links"] = {};
      body["data"]["relationships"]["sequence"]["links"]["related"] = d.data_relationships_sequence_links_related;
    }
    if (d.data_relationships_sequencetemplates_data !== undefined && d.data_relationships_sequencetemplates_data !== null && d.data_relationships_sequencetemplates_data !== '') {
      body["data_relationships_sequencetemplates_data"] = d.data_relationships_sequencetemplates_data;
    }
    if (d.data_relationships_sequencetemplates_links_related !== undefined && d.data_relationships_sequencetemplates_links_related !== null && d.data_relationships_sequencetemplates_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["sequencetemplates"] || typeof body["data"]["relationships"]["sequencetemplates"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequencetemplates"])) body["data"]["relationships"]["sequencetemplates"] = {};
      if (!body["data"]["relationships"]["sequencetemplates"]["links"] || typeof body["data"]["relationships"]["sequencetemplates"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequencetemplates"]["links"])) body["data"]["relationships"]["sequencetemplates"]["links"] = {};
      body["data"]["relationships"]["sequencetemplates"]["links"]["related"] = d.data_relationships_sequencetemplates_links_related;
    }
    if (d.data_relationships_taskpriority_data_id !== undefined && d.data_relationships_taskpriority_data_id !== null && d.data_relationships_taskpriority_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["taskpriority"] || typeof body["data"]["relationships"]["taskpriority"] !== 'object' || Array.isArray(body["data"]["relationships"]["taskpriority"])) body["data"]["relationships"]["taskpriority"] = {};
      if (!body["data"]["relationships"]["taskpriority"]["data"] || typeof body["data"]["relationships"]["taskpriority"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["taskpriority"]["data"])) body["data"]["relationships"]["taskpriority"]["data"] = {};
      body["data"]["relationships"]["taskpriority"]["data"]["id"] = d.data_relationships_taskpriority_data_id;
    }
    if (d.data_relationships_taskpriority_data_type !== undefined && d.data_relationships_taskpriority_data_type !== null && d.data_relationships_taskpriority_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["taskpriority"] || typeof body["data"]["relationships"]["taskpriority"] !== 'object' || Array.isArray(body["data"]["relationships"]["taskpriority"])) body["data"]["relationships"]["taskpriority"] = {};
      if (!body["data"]["relationships"]["taskpriority"]["data"] || typeof body["data"]["relationships"]["taskpriority"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["taskpriority"]["data"])) body["data"]["relationships"]["taskpriority"]["data"] = {};
      body["data"]["relationships"]["taskpriority"]["data"]["type"] = d.data_relationships_taskpriority_data_type;
    }
    if (d.data_relationships_taskpriority_links_related !== undefined && d.data_relationships_taskpriority_links_related !== null && d.data_relationships_taskpriority_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["taskpriority"] || typeof body["data"]["relationships"]["taskpriority"] !== 'object' || Array.isArray(body["data"]["relationships"]["taskpriority"])) body["data"]["relationships"]["taskpriority"] = {};
      if (!body["data"]["relationships"]["taskpriority"]["links"] || typeof body["data"]["relationships"]["taskpriority"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["taskpriority"]["links"])) body["data"]["relationships"]["taskpriority"]["links"] = {};
      body["data"]["relationships"]["taskpriority"]["links"]["related"] = d.data_relationships_taskpriority_links_related;
    }
    if (d.data_relationships_tasks_links_related !== undefined && d.data_relationships_tasks_links_related !== null && d.data_relationships_tasks_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["tasks"] || typeof body["data"]["relationships"]["tasks"] !== 'object' || Array.isArray(body["data"]["relationships"]["tasks"])) body["data"]["relationships"]["tasks"] = {};
      if (!body["data"]["relationships"]["tasks"]["links"] || typeof body["data"]["relationships"]["tasks"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["tasks"]["links"])) body["data"]["relationships"]["tasks"]["links"] = {};
      body["data"]["relationships"]["tasks"]["links"]["related"] = d.data_relationships_tasks_links_related;
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
    const res = await utils.providerRequest(opts, reqPath, { method: 'PATCH', query, body });
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

