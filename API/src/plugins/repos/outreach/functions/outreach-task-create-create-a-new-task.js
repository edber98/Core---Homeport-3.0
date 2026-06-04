const { utils } = require('./utils');

module.exports = {
  async outreach_task_create_create_a_new_task(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/tasks";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.data_attributes_action !== undefined && d.data_attributes_action !== null && d.data_attributes_action !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["action"] = d.data_attributes_action;
    }
    if (d.data_attributes_autoskipat !== undefined && d.data_attributes_autoskipat !== null && d.data_attributes_autoskipat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["autoskipat"] = d.data_attributes_autoskipat;
    }
    if (d.data_attributes_compiledsequencetemplatehtml !== undefined && d.data_attributes_compiledsequencetemplatehtml !== null && d.data_attributes_compiledsequencetemplatehtml !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["compiledsequencetemplatehtml"] = d.data_attributes_compiledsequencetemplatehtml;
    }
    if (d.data_attributes_completed !== undefined && d.data_attributes_completed !== null && d.data_attributes_completed !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["completed"] = d.data_attributes_completed;
    }
    if (d.data_attributes_completedat !== undefined && d.data_attributes_completedat !== null && d.data_attributes_completedat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["completedat"] = d.data_attributes_completedat;
    }
    if (d.data_attributes_createdat !== undefined && d.data_attributes_createdat !== null && d.data_attributes_createdat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["createdat"] = d.data_attributes_createdat;
    }
    if (d.data_attributes_dueat !== undefined && d.data_attributes_dueat !== null && d.data_attributes_dueat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["dueat"] = d.data_attributes_dueat;
    }
    if (d.data_attributes_note !== undefined && d.data_attributes_note !== null && d.data_attributes_note !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["note"] = d.data_attributes_note;
    }
    if (d.data_attributes_opportunityassociation !== undefined && d.data_attributes_opportunityassociation !== null && d.data_attributes_opportunityassociation !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["opportunityassociation"] = d.data_attributes_opportunityassociation;
    }
    if (d.data_attributes_scheduledat !== undefined && d.data_attributes_scheduledat !== null && d.data_attributes_scheduledat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["scheduledat"] = d.data_attributes_scheduledat;
    }
    if (d.data_attributes_state !== undefined && d.data_attributes_state !== null && d.data_attributes_state !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["state"] = d.data_attributes_state;
    }
    if (d.data_attributes_statechangedat !== undefined && d.data_attributes_statechangedat !== null && d.data_attributes_statechangedat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["statechangedat"] = d.data_attributes_statechangedat;
    }
    if (d.data_attributes_tasktype !== undefined && d.data_attributes_tasktype !== null && d.data_attributes_tasktype !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["tasktype"] = d.data_attributes_tasktype;
    }
    if (d.data_attributes_updatedat !== undefined && d.data_attributes_updatedat !== null && d.data_attributes_updatedat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["updatedat"] = d.data_attributes_updatedat;
    }
    if (d.data_relationships_account_data_id !== undefined && d.data_relationships_account_data_id !== null && d.data_relationships_account_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["account"] || typeof body["data"]["relationships"]["account"] !== 'object' || Array.isArray(body["data"]["relationships"]["account"])) body["data"]["relationships"]["account"] = {};
      if (!body["data"]["relationships"]["account"]["data"] || typeof body["data"]["relationships"]["account"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["account"]["data"])) body["data"]["relationships"]["account"]["data"] = {};
      body["data"]["relationships"]["account"]["data"]["id"] = d.data_relationships_account_data_id;
    }
    if (d.data_relationships_account_data_type !== undefined && d.data_relationships_account_data_type !== null && d.data_relationships_account_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["account"] || typeof body["data"]["relationships"]["account"] !== 'object' || Array.isArray(body["data"]["relationships"]["account"])) body["data"]["relationships"]["account"] = {};
      if (!body["data"]["relationships"]["account"]["data"] || typeof body["data"]["relationships"]["account"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["account"]["data"])) body["data"]["relationships"]["account"]["data"] = {};
      body["data"]["relationships"]["account"]["data"]["type"] = d.data_relationships_account_data_type;
    }
    if (d.data_relationships_account_links_related !== undefined && d.data_relationships_account_links_related !== null && d.data_relationships_account_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["account"] || typeof body["data"]["relationships"]["account"] !== 'object' || Array.isArray(body["data"]["relationships"]["account"])) body["data"]["relationships"]["account"] = {};
      if (!body["data"]["relationships"]["account"]["links"] || typeof body["data"]["relationships"]["account"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["account"]["links"])) body["data"]["relationships"]["account"]["links"] = {};
      body["data"]["relationships"]["account"]["links"]["related"] = d.data_relationships_account_links_related;
    }
    if (d.data_relationships_call_data_id !== undefined && d.data_relationships_call_data_id !== null && d.data_relationships_call_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["call"] || typeof body["data"]["relationships"]["call"] !== 'object' || Array.isArray(body["data"]["relationships"]["call"])) body["data"]["relationships"]["call"] = {};
      if (!body["data"]["relationships"]["call"]["data"] || typeof body["data"]["relationships"]["call"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["call"]["data"])) body["data"]["relationships"]["call"]["data"] = {};
      body["data"]["relationships"]["call"]["data"]["id"] = d.data_relationships_call_data_id;
    }
    if (d.data_relationships_call_data_type !== undefined && d.data_relationships_call_data_type !== null && d.data_relationships_call_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["call"] || typeof body["data"]["relationships"]["call"] !== 'object' || Array.isArray(body["data"]["relationships"]["call"])) body["data"]["relationships"]["call"] = {};
      if (!body["data"]["relationships"]["call"]["data"] || typeof body["data"]["relationships"]["call"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["call"]["data"])) body["data"]["relationships"]["call"]["data"] = {};
      body["data"]["relationships"]["call"]["data"]["type"] = d.data_relationships_call_data_type;
    }
    if (d.data_relationships_call_links_related !== undefined && d.data_relationships_call_links_related !== null && d.data_relationships_call_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["call"] || typeof body["data"]["relationships"]["call"] !== 'object' || Array.isArray(body["data"]["relationships"]["call"])) body["data"]["relationships"]["call"] = {};
      if (!body["data"]["relationships"]["call"]["links"] || typeof body["data"]["relationships"]["call"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["call"]["links"])) body["data"]["relationships"]["call"]["links"] = {};
      body["data"]["relationships"]["call"]["links"]["related"] = d.data_relationships_call_links_related;
    }
    if (d.data_relationships_calls_links_related !== undefined && d.data_relationships_calls_links_related !== null && d.data_relationships_calls_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["calls"] || typeof body["data"]["relationships"]["calls"] !== 'object' || Array.isArray(body["data"]["relationships"]["calls"])) body["data"]["relationships"]["calls"] = {};
      if (!body["data"]["relationships"]["calls"]["links"] || typeof body["data"]["relationships"]["calls"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["calls"]["links"])) body["data"]["relationships"]["calls"]["links"] = {};
      body["data"]["relationships"]["calls"]["links"]["related"] = d.data_relationships_calls_links_related;
    }
    if (d.data_relationships_completer_data_id !== undefined && d.data_relationships_completer_data_id !== null && d.data_relationships_completer_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["completer"] || typeof body["data"]["relationships"]["completer"] !== 'object' || Array.isArray(body["data"]["relationships"]["completer"])) body["data"]["relationships"]["completer"] = {};
      if (!body["data"]["relationships"]["completer"]["data"] || typeof body["data"]["relationships"]["completer"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["completer"]["data"])) body["data"]["relationships"]["completer"]["data"] = {};
      body["data"]["relationships"]["completer"]["data"]["id"] = d.data_relationships_completer_data_id;
    }
    if (d.data_relationships_completer_data_type !== undefined && d.data_relationships_completer_data_type !== null && d.data_relationships_completer_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["completer"] || typeof body["data"]["relationships"]["completer"] !== 'object' || Array.isArray(body["data"]["relationships"]["completer"])) body["data"]["relationships"]["completer"] = {};
      if (!body["data"]["relationships"]["completer"]["data"] || typeof body["data"]["relationships"]["completer"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["completer"]["data"])) body["data"]["relationships"]["completer"]["data"] = {};
      body["data"]["relationships"]["completer"]["data"]["type"] = d.data_relationships_completer_data_type;
    }
    if (d.data_relationships_completer_links_related !== undefined && d.data_relationships_completer_links_related !== null && d.data_relationships_completer_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["completer"] || typeof body["data"]["relationships"]["completer"] !== 'object' || Array.isArray(body["data"]["relationships"]["completer"])) body["data"]["relationships"]["completer"] = {};
      if (!body["data"]["relationships"]["completer"]["links"] || typeof body["data"]["relationships"]["completer"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["completer"]["links"])) body["data"]["relationships"]["completer"]["links"] = {};
      body["data"]["relationships"]["completer"]["links"]["related"] = d.data_relationships_completer_links_related;
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
    if (d.data_relationships_defaultpluginmapping_data_id !== undefined && d.data_relationships_defaultpluginmapping_data_id !== null && d.data_relationships_defaultpluginmapping_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["defaultpluginmapping"] || typeof body["data"]["relationships"]["defaultpluginmapping"] !== 'object' || Array.isArray(body["data"]["relationships"]["defaultpluginmapping"])) body["data"]["relationships"]["defaultpluginmapping"] = {};
      if (!body["data"]["relationships"]["defaultpluginmapping"]["data"] || typeof body["data"]["relationships"]["defaultpluginmapping"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["defaultpluginmapping"]["data"])) body["data"]["relationships"]["defaultpluginmapping"]["data"] = {};
      body["data"]["relationships"]["defaultpluginmapping"]["data"]["id"] = d.data_relationships_defaultpluginmapping_data_id;
    }
    if (d.data_relationships_defaultpluginmapping_data_type !== undefined && d.data_relationships_defaultpluginmapping_data_type !== null && d.data_relationships_defaultpluginmapping_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["defaultpluginmapping"] || typeof body["data"]["relationships"]["defaultpluginmapping"] !== 'object' || Array.isArray(body["data"]["relationships"]["defaultpluginmapping"])) body["data"]["relationships"]["defaultpluginmapping"] = {};
      if (!body["data"]["relationships"]["defaultpluginmapping"]["data"] || typeof body["data"]["relationships"]["defaultpluginmapping"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["defaultpluginmapping"]["data"])) body["data"]["relationships"]["defaultpluginmapping"]["data"] = {};
      body["data"]["relationships"]["defaultpluginmapping"]["data"]["type"] = d.data_relationships_defaultpluginmapping_data_type;
    }
    if (d.data_relationships_defaultpluginmapping_links_related !== undefined && d.data_relationships_defaultpluginmapping_links_related !== null && d.data_relationships_defaultpluginmapping_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["defaultpluginmapping"] || typeof body["data"]["relationships"]["defaultpluginmapping"] !== 'object' || Array.isArray(body["data"]["relationships"]["defaultpluginmapping"])) body["data"]["relationships"]["defaultpluginmapping"] = {};
      if (!body["data"]["relationships"]["defaultpluginmapping"]["links"] || typeof body["data"]["relationships"]["defaultpluginmapping"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["defaultpluginmapping"]["links"])) body["data"]["relationships"]["defaultpluginmapping"]["links"] = {};
      body["data"]["relationships"]["defaultpluginmapping"]["links"]["related"] = d.data_relationships_defaultpluginmapping_links_related;
    }
    if (d.data_relationships_mailing_data_id !== undefined && d.data_relationships_mailing_data_id !== null && d.data_relationships_mailing_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["mailing"] || typeof body["data"]["relationships"]["mailing"] !== 'object' || Array.isArray(body["data"]["relationships"]["mailing"])) body["data"]["relationships"]["mailing"] = {};
      if (!body["data"]["relationships"]["mailing"]["data"] || typeof body["data"]["relationships"]["mailing"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["mailing"]["data"])) body["data"]["relationships"]["mailing"]["data"] = {};
      body["data"]["relationships"]["mailing"]["data"]["id"] = d.data_relationships_mailing_data_id;
    }
    if (d.data_relationships_mailing_data_type !== undefined && d.data_relationships_mailing_data_type !== null && d.data_relationships_mailing_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["mailing"] || typeof body["data"]["relationships"]["mailing"] !== 'object' || Array.isArray(body["data"]["relationships"]["mailing"])) body["data"]["relationships"]["mailing"] = {};
      if (!body["data"]["relationships"]["mailing"]["data"] || typeof body["data"]["relationships"]["mailing"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["mailing"]["data"])) body["data"]["relationships"]["mailing"]["data"] = {};
      body["data"]["relationships"]["mailing"]["data"]["type"] = d.data_relationships_mailing_data_type;
    }
    if (d.data_relationships_mailing_links_related !== undefined && d.data_relationships_mailing_links_related !== null && d.data_relationships_mailing_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["mailing"] || typeof body["data"]["relationships"]["mailing"] !== 'object' || Array.isArray(body["data"]["relationships"]["mailing"])) body["data"]["relationships"]["mailing"] = {};
      if (!body["data"]["relationships"]["mailing"]["links"] || typeof body["data"]["relationships"]["mailing"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["mailing"]["links"])) body["data"]["relationships"]["mailing"]["links"] = {};
      body["data"]["relationships"]["mailing"]["links"]["related"] = d.data_relationships_mailing_links_related;
    }
    if (d.data_relationships_mailings_links_related !== undefined && d.data_relationships_mailings_links_related !== null && d.data_relationships_mailings_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["mailings"] || typeof body["data"]["relationships"]["mailings"] !== 'object' || Array.isArray(body["data"]["relationships"]["mailings"])) body["data"]["relationships"]["mailings"] = {};
      if (!body["data"]["relationships"]["mailings"]["links"] || typeof body["data"]["relationships"]["mailings"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["mailings"]["links"])) body["data"]["relationships"]["mailings"]["links"] = {};
      body["data"]["relationships"]["mailings"]["links"]["related"] = d.data_relationships_mailings_links_related;
    }
    if (d.data_relationships_opportunity_data_id !== undefined && d.data_relationships_opportunity_data_id !== null && d.data_relationships_opportunity_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["opportunity"] || typeof body["data"]["relationships"]["opportunity"] !== 'object' || Array.isArray(body["data"]["relationships"]["opportunity"])) body["data"]["relationships"]["opportunity"] = {};
      if (!body["data"]["relationships"]["opportunity"]["data"] || typeof body["data"]["relationships"]["opportunity"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["opportunity"]["data"])) body["data"]["relationships"]["opportunity"]["data"] = {};
      body["data"]["relationships"]["opportunity"]["data"]["id"] = d.data_relationships_opportunity_data_id;
    }
    if (d.data_relationships_opportunity_data_type !== undefined && d.data_relationships_opportunity_data_type !== null && d.data_relationships_opportunity_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["opportunity"] || typeof body["data"]["relationships"]["opportunity"] !== 'object' || Array.isArray(body["data"]["relationships"]["opportunity"])) body["data"]["relationships"]["opportunity"] = {};
      if (!body["data"]["relationships"]["opportunity"]["data"] || typeof body["data"]["relationships"]["opportunity"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["opportunity"]["data"])) body["data"]["relationships"]["opportunity"]["data"] = {};
      body["data"]["relationships"]["opportunity"]["data"]["type"] = d.data_relationships_opportunity_data_type;
    }
    if (d.data_relationships_opportunity_links_related !== undefined && d.data_relationships_opportunity_links_related !== null && d.data_relationships_opportunity_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["opportunity"] || typeof body["data"]["relationships"]["opportunity"] !== 'object' || Array.isArray(body["data"]["relationships"]["opportunity"])) body["data"]["relationships"]["opportunity"] = {};
      if (!body["data"]["relationships"]["opportunity"]["links"] || typeof body["data"]["relationships"]["opportunity"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["opportunity"]["links"])) body["data"]["relationships"]["opportunity"]["links"] = {};
      body["data"]["relationships"]["opportunity"]["links"]["related"] = d.data_relationships_opportunity_links_related;
    }
    if (d.data_relationships_owner_data_id !== undefined && d.data_relationships_owner_data_id !== null && d.data_relationships_owner_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["owner"] || typeof body["data"]["relationships"]["owner"] !== 'object' || Array.isArray(body["data"]["relationships"]["owner"])) body["data"]["relationships"]["owner"] = {};
      if (!body["data"]["relationships"]["owner"]["data"] || typeof body["data"]["relationships"]["owner"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["owner"]["data"])) body["data"]["relationships"]["owner"]["data"] = {};
      body["data"]["relationships"]["owner"]["data"]["id"] = d.data_relationships_owner_data_id;
    }
    if (d.data_relationships_owner_data_type !== undefined && d.data_relationships_owner_data_type !== null && d.data_relationships_owner_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["owner"] || typeof body["data"]["relationships"]["owner"] !== 'object' || Array.isArray(body["data"]["relationships"]["owner"])) body["data"]["relationships"]["owner"] = {};
      if (!body["data"]["relationships"]["owner"]["data"] || typeof body["data"]["relationships"]["owner"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["owner"]["data"])) body["data"]["relationships"]["owner"]["data"] = {};
      body["data"]["relationships"]["owner"]["data"]["type"] = d.data_relationships_owner_data_type;
    }
    if (d.data_relationships_owner_links_related !== undefined && d.data_relationships_owner_links_related !== null && d.data_relationships_owner_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["owner"] || typeof body["data"]["relationships"]["owner"] !== 'object' || Array.isArray(body["data"]["relationships"]["owner"])) body["data"]["relationships"]["owner"] = {};
      if (!body["data"]["relationships"]["owner"]["links"] || typeof body["data"]["relationships"]["owner"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["owner"]["links"])) body["data"]["relationships"]["owner"]["links"] = {};
      body["data"]["relationships"]["owner"]["links"]["related"] = d.data_relationships_owner_links_related;
    }
    if (d.data_relationships_prospect_data_id !== undefined && d.data_relationships_prospect_data_id !== null && d.data_relationships_prospect_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["prospect"] || typeof body["data"]["relationships"]["prospect"] !== 'object' || Array.isArray(body["data"]["relationships"]["prospect"])) body["data"]["relationships"]["prospect"] = {};
      if (!body["data"]["relationships"]["prospect"]["data"] || typeof body["data"]["relationships"]["prospect"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["prospect"]["data"])) body["data"]["relationships"]["prospect"]["data"] = {};
      body["data"]["relationships"]["prospect"]["data"]["id"] = d.data_relationships_prospect_data_id;
    }
    if (d.data_relationships_prospect_data_type !== undefined && d.data_relationships_prospect_data_type !== null && d.data_relationships_prospect_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["prospect"] || typeof body["data"]["relationships"]["prospect"] !== 'object' || Array.isArray(body["data"]["relationships"]["prospect"])) body["data"]["relationships"]["prospect"] = {};
      if (!body["data"]["relationships"]["prospect"]["data"] || typeof body["data"]["relationships"]["prospect"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["prospect"]["data"])) body["data"]["relationships"]["prospect"]["data"] = {};
      body["data"]["relationships"]["prospect"]["data"]["type"] = d.data_relationships_prospect_data_type;
    }
    if (d.data_relationships_prospect_links_related !== undefined && d.data_relationships_prospect_links_related !== null && d.data_relationships_prospect_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["prospect"] || typeof body["data"]["relationships"]["prospect"] !== 'object' || Array.isArray(body["data"]["relationships"]["prospect"])) body["data"]["relationships"]["prospect"] = {};
      if (!body["data"]["relationships"]["prospect"]["links"] || typeof body["data"]["relationships"]["prospect"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["prospect"]["links"])) body["data"]["relationships"]["prospect"]["links"] = {};
      body["data"]["relationships"]["prospect"]["links"]["related"] = d.data_relationships_prospect_links_related;
    }
    if (d.data_relationships_prospectaccount_data_id !== undefined && d.data_relationships_prospectaccount_data_id !== null && d.data_relationships_prospectaccount_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["prospectaccount"] || typeof body["data"]["relationships"]["prospectaccount"] !== 'object' || Array.isArray(body["data"]["relationships"]["prospectaccount"])) body["data"]["relationships"]["prospectaccount"] = {};
      if (!body["data"]["relationships"]["prospectaccount"]["data"] || typeof body["data"]["relationships"]["prospectaccount"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["prospectaccount"]["data"])) body["data"]["relationships"]["prospectaccount"]["data"] = {};
      body["data"]["relationships"]["prospectaccount"]["data"]["id"] = d.data_relationships_prospectaccount_data_id;
    }
    if (d.data_relationships_prospectaccount_data_type !== undefined && d.data_relationships_prospectaccount_data_type !== null && d.data_relationships_prospectaccount_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["prospectaccount"] || typeof body["data"]["relationships"]["prospectaccount"] !== 'object' || Array.isArray(body["data"]["relationships"]["prospectaccount"])) body["data"]["relationships"]["prospectaccount"] = {};
      if (!body["data"]["relationships"]["prospectaccount"]["data"] || typeof body["data"]["relationships"]["prospectaccount"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["prospectaccount"]["data"])) body["data"]["relationships"]["prospectaccount"]["data"] = {};
      body["data"]["relationships"]["prospectaccount"]["data"]["type"] = d.data_relationships_prospectaccount_data_type;
    }
    if (d.data_relationships_prospectaccount_links_related !== undefined && d.data_relationships_prospectaccount_links_related !== null && d.data_relationships_prospectaccount_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["prospectaccount"] || typeof body["data"]["relationships"]["prospectaccount"] !== 'object' || Array.isArray(body["data"]["relationships"]["prospectaccount"])) body["data"]["relationships"]["prospectaccount"] = {};
      if (!body["data"]["relationships"]["prospectaccount"]["links"] || typeof body["data"]["relationships"]["prospectaccount"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["prospectaccount"]["links"])) body["data"]["relationships"]["prospectaccount"]["links"] = {};
      body["data"]["relationships"]["prospectaccount"]["links"]["related"] = d.data_relationships_prospectaccount_links_related;
    }
    if (d.data_relationships_prospectcontacts_data !== undefined && d.data_relationships_prospectcontacts_data !== null && d.data_relationships_prospectcontacts_data !== '') {
      body["data_relationships_prospectcontacts_data"] = d.data_relationships_prospectcontacts_data;
    }
    if (d.data_relationships_prospectcontacts_links_related !== undefined && d.data_relationships_prospectcontacts_links_related !== null && d.data_relationships_prospectcontacts_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["prospectcontacts"] || typeof body["data"]["relationships"]["prospectcontacts"] !== 'object' || Array.isArray(body["data"]["relationships"]["prospectcontacts"])) body["data"]["relationships"]["prospectcontacts"] = {};
      if (!body["data"]["relationships"]["prospectcontacts"]["links"] || typeof body["data"]["relationships"]["prospectcontacts"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["prospectcontacts"]["links"])) body["data"]["relationships"]["prospectcontacts"]["links"] = {};
      body["data"]["relationships"]["prospectcontacts"]["links"]["related"] = d.data_relationships_prospectcontacts_links_related;
    }
    if (d.data_relationships_prospectowner_data_id !== undefined && d.data_relationships_prospectowner_data_id !== null && d.data_relationships_prospectowner_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["prospectowner"] || typeof body["data"]["relationships"]["prospectowner"] !== 'object' || Array.isArray(body["data"]["relationships"]["prospectowner"])) body["data"]["relationships"]["prospectowner"] = {};
      if (!body["data"]["relationships"]["prospectowner"]["data"] || typeof body["data"]["relationships"]["prospectowner"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["prospectowner"]["data"])) body["data"]["relationships"]["prospectowner"]["data"] = {};
      body["data"]["relationships"]["prospectowner"]["data"]["id"] = d.data_relationships_prospectowner_data_id;
    }
    if (d.data_relationships_prospectowner_data_type !== undefined && d.data_relationships_prospectowner_data_type !== null && d.data_relationships_prospectowner_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["prospectowner"] || typeof body["data"]["relationships"]["prospectowner"] !== 'object' || Array.isArray(body["data"]["relationships"]["prospectowner"])) body["data"]["relationships"]["prospectowner"] = {};
      if (!body["data"]["relationships"]["prospectowner"]["data"] || typeof body["data"]["relationships"]["prospectowner"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["prospectowner"]["data"])) body["data"]["relationships"]["prospectowner"]["data"] = {};
      body["data"]["relationships"]["prospectowner"]["data"]["type"] = d.data_relationships_prospectowner_data_type;
    }
    if (d.data_relationships_prospectowner_links_related !== undefined && d.data_relationships_prospectowner_links_related !== null && d.data_relationships_prospectowner_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["prospectowner"] || typeof body["data"]["relationships"]["prospectowner"] !== 'object' || Array.isArray(body["data"]["relationships"]["prospectowner"])) body["data"]["relationships"]["prospectowner"] = {};
      if (!body["data"]["relationships"]["prospectowner"]["links"] || typeof body["data"]["relationships"]["prospectowner"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["prospectowner"]["links"])) body["data"]["relationships"]["prospectowner"]["links"] = {};
      body["data"]["relationships"]["prospectowner"]["links"]["related"] = d.data_relationships_prospectowner_links_related;
    }
    if (d.data_relationships_prospectphonenumbers_data !== undefined && d.data_relationships_prospectphonenumbers_data !== null && d.data_relationships_prospectphonenumbers_data !== '') {
      body["data_relationships_prospectphonenumbers_data"] = d.data_relationships_prospectphonenumbers_data;
    }
    if (d.data_relationships_prospectphonenumbers_links_related !== undefined && d.data_relationships_prospectphonenumbers_links_related !== null && d.data_relationships_prospectphonenumbers_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["prospectphonenumbers"] || typeof body["data"]["relationships"]["prospectphonenumbers"] !== 'object' || Array.isArray(body["data"]["relationships"]["prospectphonenumbers"])) body["data"]["relationships"]["prospectphonenumbers"] = {};
      if (!body["data"]["relationships"]["prospectphonenumbers"]["links"] || typeof body["data"]["relationships"]["prospectphonenumbers"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["prospectphonenumbers"]["links"])) body["data"]["relationships"]["prospectphonenumbers"]["links"] = {};
      body["data"]["relationships"]["prospectphonenumbers"]["links"]["related"] = d.data_relationships_prospectphonenumbers_links_related;
    }
    if (d.data_relationships_prospectstage_data_id !== undefined && d.data_relationships_prospectstage_data_id !== null && d.data_relationships_prospectstage_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["prospectstage"] || typeof body["data"]["relationships"]["prospectstage"] !== 'object' || Array.isArray(body["data"]["relationships"]["prospectstage"])) body["data"]["relationships"]["prospectstage"] = {};
      if (!body["data"]["relationships"]["prospectstage"]["data"] || typeof body["data"]["relationships"]["prospectstage"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["prospectstage"]["data"])) body["data"]["relationships"]["prospectstage"]["data"] = {};
      body["data"]["relationships"]["prospectstage"]["data"]["id"] = d.data_relationships_prospectstage_data_id;
    }
    if (d.data_relationships_prospectstage_data_type !== undefined && d.data_relationships_prospectstage_data_type !== null && d.data_relationships_prospectstage_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["prospectstage"] || typeof body["data"]["relationships"]["prospectstage"] !== 'object' || Array.isArray(body["data"]["relationships"]["prospectstage"])) body["data"]["relationships"]["prospectstage"] = {};
      if (!body["data"]["relationships"]["prospectstage"]["data"] || typeof body["data"]["relationships"]["prospectstage"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["prospectstage"]["data"])) body["data"]["relationships"]["prospectstage"]["data"] = {};
      body["data"]["relationships"]["prospectstage"]["data"]["type"] = d.data_relationships_prospectstage_data_type;
    }
    if (d.data_relationships_prospectstage_links_related !== undefined && d.data_relationships_prospectstage_links_related !== null && d.data_relationships_prospectstage_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["prospectstage"] || typeof body["data"]["relationships"]["prospectstage"] !== 'object' || Array.isArray(body["data"]["relationships"]["prospectstage"])) body["data"]["relationships"]["prospectstage"] = {};
      if (!body["data"]["relationships"]["prospectstage"]["links"] || typeof body["data"]["relationships"]["prospectstage"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["prospectstage"]["links"])) body["data"]["relationships"]["prospectstage"]["links"] = {};
      body["data"]["relationships"]["prospectstage"]["links"]["related"] = d.data_relationships_prospectstage_links_related;
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
    if (d.data_relationships_sequencesequencesteps_data !== undefined && d.data_relationships_sequencesequencesteps_data !== null && d.data_relationships_sequencesequencesteps_data !== '') {
      body["data_relationships_sequencesequencesteps_data"] = d.data_relationships_sequencesequencesteps_data;
    }
    if (d.data_relationships_sequencesequencesteps_links_related !== undefined && d.data_relationships_sequencesequencesteps_links_related !== null && d.data_relationships_sequencesequencesteps_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["sequencesequencesteps"] || typeof body["data"]["relationships"]["sequencesequencesteps"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequencesequencesteps"])) body["data"]["relationships"]["sequencesequencesteps"] = {};
      if (!body["data"]["relationships"]["sequencesequencesteps"]["links"] || typeof body["data"]["relationships"]["sequencesequencesteps"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequencesequencesteps"]["links"])) body["data"]["relationships"]["sequencesequencesteps"]["links"] = {};
      body["data"]["relationships"]["sequencesequencesteps"]["links"]["related"] = d.data_relationships_sequencesequencesteps_links_related;
    }
    if (d.data_relationships_sequencestate_data_id !== undefined && d.data_relationships_sequencestate_data_id !== null && d.data_relationships_sequencestate_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["sequencestate"] || typeof body["data"]["relationships"]["sequencestate"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequencestate"])) body["data"]["relationships"]["sequencestate"] = {};
      if (!body["data"]["relationships"]["sequencestate"]["data"] || typeof body["data"]["relationships"]["sequencestate"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequencestate"]["data"])) body["data"]["relationships"]["sequencestate"]["data"] = {};
      body["data"]["relationships"]["sequencestate"]["data"]["id"] = d.data_relationships_sequencestate_data_id;
    }
    if (d.data_relationships_sequencestate_data_type !== undefined && d.data_relationships_sequencestate_data_type !== null && d.data_relationships_sequencestate_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["sequencestate"] || typeof body["data"]["relationships"]["sequencestate"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequencestate"])) body["data"]["relationships"]["sequencestate"] = {};
      if (!body["data"]["relationships"]["sequencestate"]["data"] || typeof body["data"]["relationships"]["sequencestate"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequencestate"]["data"])) body["data"]["relationships"]["sequencestate"]["data"] = {};
      body["data"]["relationships"]["sequencestate"]["data"]["type"] = d.data_relationships_sequencestate_data_type;
    }
    if (d.data_relationships_sequencestate_links_related !== undefined && d.data_relationships_sequencestate_links_related !== null && d.data_relationships_sequencestate_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["sequencestate"] || typeof body["data"]["relationships"]["sequencestate"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequencestate"])) body["data"]["relationships"]["sequencestate"] = {};
      if (!body["data"]["relationships"]["sequencestate"]["links"] || typeof body["data"]["relationships"]["sequencestate"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequencestate"]["links"])) body["data"]["relationships"]["sequencestate"]["links"] = {};
      body["data"]["relationships"]["sequencestate"]["links"]["related"] = d.data_relationships_sequencestate_links_related;
    }
    if (d.data_relationships_sequencestatesequencestep_data_id !== undefined && d.data_relationships_sequencestatesequencestep_data_id !== null && d.data_relationships_sequencestatesequencestep_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["sequencestatesequencestep"] || typeof body["data"]["relationships"]["sequencestatesequencestep"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequencestatesequencestep"])) body["data"]["relationships"]["sequencestatesequencestep"] = {};
      if (!body["data"]["relationships"]["sequencestatesequencestep"]["data"] || typeof body["data"]["relationships"]["sequencestatesequencestep"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequencestatesequencestep"]["data"])) body["data"]["relationships"]["sequencestatesequencestep"]["data"] = {};
      body["data"]["relationships"]["sequencestatesequencestep"]["data"]["id"] = d.data_relationships_sequencestatesequencestep_data_id;
    }
    if (d.data_relationships_sequencestatesequencestep_data_type !== undefined && d.data_relationships_sequencestatesequencestep_data_type !== null && d.data_relationships_sequencestatesequencestep_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["sequencestatesequencestep"] || typeof body["data"]["relationships"]["sequencestatesequencestep"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequencestatesequencestep"])) body["data"]["relationships"]["sequencestatesequencestep"] = {};
      if (!body["data"]["relationships"]["sequencestatesequencestep"]["data"] || typeof body["data"]["relationships"]["sequencestatesequencestep"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequencestatesequencestep"]["data"])) body["data"]["relationships"]["sequencestatesequencestep"]["data"] = {};
      body["data"]["relationships"]["sequencestatesequencestep"]["data"]["type"] = d.data_relationships_sequencestatesequencestep_data_type;
    }
    if (d.data_relationships_sequencestatesequencestep_links_related !== undefined && d.data_relationships_sequencestatesequencestep_links_related !== null && d.data_relationships_sequencestatesequencestep_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["sequencestatesequencestep"] || typeof body["data"]["relationships"]["sequencestatesequencestep"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequencestatesequencestep"])) body["data"]["relationships"]["sequencestatesequencestep"] = {};
      if (!body["data"]["relationships"]["sequencestatesequencestep"]["links"] || typeof body["data"]["relationships"]["sequencestatesequencestep"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequencestatesequencestep"]["links"])) body["data"]["relationships"]["sequencestatesequencestep"]["links"] = {};
      body["data"]["relationships"]["sequencestatesequencestep"]["links"]["related"] = d.data_relationships_sequencestatesequencestep_links_related;
    }
    if (d.data_relationships_sequencestatesequencestepoverrides_data !== undefined && d.data_relationships_sequencestatesequencestepoverrides_data !== null && d.data_relationships_sequencestatesequencestepoverrides_data !== '') {
      body["data_relationships_sequencestatesequencestepoverrides_data"] = d.data_relationships_sequencestatesequencestepoverrides_data;
    }
    if (d.data_relationships_sequencestatesequencestepoverrides_links_related !== undefined && d.data_relationships_sequencestatesequencestepoverrides_links_related !== null && d.data_relationships_sequencestatesequencestepoverrides_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["sequencestatesequencestepoverrides"] || typeof body["data"]["relationships"]["sequencestatesequencestepoverrides"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequencestatesequencestepoverrides"])) body["data"]["relationships"]["sequencestatesequencestepoverrides"] = {};
      if (!body["data"]["relationships"]["sequencestatesequencestepoverrides"]["links"] || typeof body["data"]["relationships"]["sequencestatesequencestepoverrides"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequencestatesequencestepoverrides"]["links"])) body["data"]["relationships"]["sequencestatesequencestepoverrides"]["links"] = {};
      body["data"]["relationships"]["sequencestatesequencestepoverrides"]["links"]["related"] = d.data_relationships_sequencestatesequencestepoverrides_links_related;
    }
    if (d.data_relationships_sequencestatestartingtemplate_data_id !== undefined && d.data_relationships_sequencestatestartingtemplate_data_id !== null && d.data_relationships_sequencestatestartingtemplate_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["sequencestatestartingtemplate"] || typeof body["data"]["relationships"]["sequencestatestartingtemplate"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequencestatestartingtemplate"])) body["data"]["relationships"]["sequencestatestartingtemplate"] = {};
      if (!body["data"]["relationships"]["sequencestatestartingtemplate"]["data"] || typeof body["data"]["relationships"]["sequencestatestartingtemplate"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequencestatestartingtemplate"]["data"])) body["data"]["relationships"]["sequencestatestartingtemplate"]["data"] = {};
      body["data"]["relationships"]["sequencestatestartingtemplate"]["data"]["id"] = d.data_relationships_sequencestatestartingtemplate_data_id;
    }
    if (d.data_relationships_sequencestatestartingtemplate_data_type !== undefined && d.data_relationships_sequencestatestartingtemplate_data_type !== null && d.data_relationships_sequencestatestartingtemplate_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["sequencestatestartingtemplate"] || typeof body["data"]["relationships"]["sequencestatestartingtemplate"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequencestatestartingtemplate"])) body["data"]["relationships"]["sequencestatestartingtemplate"] = {};
      if (!body["data"]["relationships"]["sequencestatestartingtemplate"]["data"] || typeof body["data"]["relationships"]["sequencestatestartingtemplate"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequencestatestartingtemplate"]["data"])) body["data"]["relationships"]["sequencestatestartingtemplate"]["data"] = {};
      body["data"]["relationships"]["sequencestatestartingtemplate"]["data"]["type"] = d.data_relationships_sequencestatestartingtemplate_data_type;
    }
    if (d.data_relationships_sequencestatestartingtemplate_links_related !== undefined && d.data_relationships_sequencestatestartingtemplate_links_related !== null && d.data_relationships_sequencestatestartingtemplate_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["sequencestatestartingtemplate"] || typeof body["data"]["relationships"]["sequencestatestartingtemplate"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequencestatestartingtemplate"])) body["data"]["relationships"]["sequencestatestartingtemplate"] = {};
      if (!body["data"]["relationships"]["sequencestatestartingtemplate"]["links"] || typeof body["data"]["relationships"]["sequencestatestartingtemplate"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequencestatestartingtemplate"]["links"])) body["data"]["relationships"]["sequencestatestartingtemplate"]["links"] = {};
      body["data"]["relationships"]["sequencestatestartingtemplate"]["links"]["related"] = d.data_relationships_sequencestatestartingtemplate_links_related;
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
    if (d.data_relationships_sequencestepoverridetemplates_data !== undefined && d.data_relationships_sequencestepoverridetemplates_data !== null && d.data_relationships_sequencestepoverridetemplates_data !== '') {
      body["data_relationships_sequencestepoverridetemplates_data"] = d.data_relationships_sequencestepoverridetemplates_data;
    }
    if (d.data_relationships_sequencestepoverridetemplates_links_related !== undefined && d.data_relationships_sequencestepoverridetemplates_links_related !== null && d.data_relationships_sequencestepoverridetemplates_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["sequencestepoverridetemplates"] || typeof body["data"]["relationships"]["sequencestepoverridetemplates"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequencestepoverridetemplates"])) body["data"]["relationships"]["sequencestepoverridetemplates"] = {};
      if (!body["data"]["relationships"]["sequencestepoverridetemplates"]["links"] || typeof body["data"]["relationships"]["sequencestepoverridetemplates"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequencestepoverridetemplates"]["links"])) body["data"]["relationships"]["sequencestepoverridetemplates"]["links"] = {};
      body["data"]["relationships"]["sequencestepoverridetemplates"]["links"]["related"] = d.data_relationships_sequencestepoverridetemplates_links_related;
    }
    if (d.data_relationships_sequencetemplate_data_id !== undefined && d.data_relationships_sequencetemplate_data_id !== null && d.data_relationships_sequencetemplate_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["sequencetemplate"] || typeof body["data"]["relationships"]["sequencetemplate"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequencetemplate"])) body["data"]["relationships"]["sequencetemplate"] = {};
      if (!body["data"]["relationships"]["sequencetemplate"]["data"] || typeof body["data"]["relationships"]["sequencetemplate"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequencetemplate"]["data"])) body["data"]["relationships"]["sequencetemplate"]["data"] = {};
      body["data"]["relationships"]["sequencetemplate"]["data"]["id"] = d.data_relationships_sequencetemplate_data_id;
    }
    if (d.data_relationships_sequencetemplate_data_type !== undefined && d.data_relationships_sequencetemplate_data_type !== null && d.data_relationships_sequencetemplate_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["sequencetemplate"] || typeof body["data"]["relationships"]["sequencetemplate"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequencetemplate"])) body["data"]["relationships"]["sequencetemplate"] = {};
      if (!body["data"]["relationships"]["sequencetemplate"]["data"] || typeof body["data"]["relationships"]["sequencetemplate"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequencetemplate"]["data"])) body["data"]["relationships"]["sequencetemplate"]["data"] = {};
      body["data"]["relationships"]["sequencetemplate"]["data"]["type"] = d.data_relationships_sequencetemplate_data_type;
    }
    if (d.data_relationships_sequencetemplate_links_related !== undefined && d.data_relationships_sequencetemplate_links_related !== null && d.data_relationships_sequencetemplate_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["sequencetemplate"] || typeof body["data"]["relationships"]["sequencetemplate"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequencetemplate"])) body["data"]["relationships"]["sequencetemplate"] = {};
      if (!body["data"]["relationships"]["sequencetemplate"]["links"] || typeof body["data"]["relationships"]["sequencetemplate"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequencetemplate"]["links"])) body["data"]["relationships"]["sequencetemplate"]["links"] = {};
      body["data"]["relationships"]["sequencetemplate"]["links"]["related"] = d.data_relationships_sequencetemplate_links_related;
    }
    if (d.data_relationships_sequencetemplatetemplate_data_id !== undefined && d.data_relationships_sequencetemplatetemplate_data_id !== null && d.data_relationships_sequencetemplatetemplate_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["sequencetemplatetemplate"] || typeof body["data"]["relationships"]["sequencetemplatetemplate"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequencetemplatetemplate"])) body["data"]["relationships"]["sequencetemplatetemplate"] = {};
      if (!body["data"]["relationships"]["sequencetemplatetemplate"]["data"] || typeof body["data"]["relationships"]["sequencetemplatetemplate"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequencetemplatetemplate"]["data"])) body["data"]["relationships"]["sequencetemplatetemplate"]["data"] = {};
      body["data"]["relationships"]["sequencetemplatetemplate"]["data"]["id"] = d.data_relationships_sequencetemplatetemplate_data_id;
    }
    if (d.data_relationships_sequencetemplatetemplate_data_type !== undefined && d.data_relationships_sequencetemplatetemplate_data_type !== null && d.data_relationships_sequencetemplatetemplate_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["sequencetemplatetemplate"] || typeof body["data"]["relationships"]["sequencetemplatetemplate"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequencetemplatetemplate"])) body["data"]["relationships"]["sequencetemplatetemplate"] = {};
      if (!body["data"]["relationships"]["sequencetemplatetemplate"]["data"] || typeof body["data"]["relationships"]["sequencetemplatetemplate"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequencetemplatetemplate"]["data"])) body["data"]["relationships"]["sequencetemplatetemplate"]["data"] = {};
      body["data"]["relationships"]["sequencetemplatetemplate"]["data"]["type"] = d.data_relationships_sequencetemplatetemplate_data_type;
    }
    if (d.data_relationships_sequencetemplatetemplate_links_related !== undefined && d.data_relationships_sequencetemplatetemplate_links_related !== null && d.data_relationships_sequencetemplatetemplate_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["sequencetemplatetemplate"] || typeof body["data"]["relationships"]["sequencetemplatetemplate"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequencetemplatetemplate"])) body["data"]["relationships"]["sequencetemplatetemplate"] = {};
      if (!body["data"]["relationships"]["sequencetemplatetemplate"]["links"] || typeof body["data"]["relationships"]["sequencetemplatetemplate"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequencetemplatetemplate"]["links"])) body["data"]["relationships"]["sequencetemplatetemplate"]["links"] = {};
      body["data"]["relationships"]["sequencetemplatetemplate"]["links"]["related"] = d.data_relationships_sequencetemplatetemplate_links_related;
    }
    if (d.data_relationships_subject_data_id !== undefined && d.data_relationships_subject_data_id !== null && d.data_relationships_subject_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["subject"] || typeof body["data"]["relationships"]["subject"] !== 'object' || Array.isArray(body["data"]["relationships"]["subject"])) body["data"]["relationships"]["subject"] = {};
      if (!body["data"]["relationships"]["subject"]["data"] || typeof body["data"]["relationships"]["subject"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["subject"]["data"])) body["data"]["relationships"]["subject"]["data"] = {};
      body["data"]["relationships"]["subject"]["data"]["id"] = d.data_relationships_subject_data_id;
    }
    if (d.data_relationships_subject_data_type !== undefined && d.data_relationships_subject_data_type !== null && d.data_relationships_subject_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["subject"] || typeof body["data"]["relationships"]["subject"] !== 'object' || Array.isArray(body["data"]["relationships"]["subject"])) body["data"]["relationships"]["subject"] = {};
      if (!body["data"]["relationships"]["subject"]["data"] || typeof body["data"]["relationships"]["subject"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["subject"]["data"])) body["data"]["relationships"]["subject"]["data"] = {};
      body["data"]["relationships"]["subject"]["data"]["type"] = d.data_relationships_subject_data_type;
    }
    if (d.data_relationships_subject_links_related !== undefined && d.data_relationships_subject_links_related !== null && d.data_relationships_subject_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["subject"] || typeof body["data"]["relationships"]["subject"] !== 'object' || Array.isArray(body["data"]["relationships"]["subject"])) body["data"]["relationships"]["subject"] = {};
      if (!body["data"]["relationships"]["subject"]["links"] || typeof body["data"]["relationships"]["subject"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["subject"]["links"])) body["data"]["relationships"]["subject"]["links"] = {};
      body["data"]["relationships"]["subject"]["links"]["related"] = d.data_relationships_subject_links_related;
    }
    if (d.data_relationships_taskdisposition_data_id !== undefined && d.data_relationships_taskdisposition_data_id !== null && d.data_relationships_taskdisposition_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["taskdisposition"] || typeof body["data"]["relationships"]["taskdisposition"] !== 'object' || Array.isArray(body["data"]["relationships"]["taskdisposition"])) body["data"]["relationships"]["taskdisposition"] = {};
      if (!body["data"]["relationships"]["taskdisposition"]["data"] || typeof body["data"]["relationships"]["taskdisposition"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["taskdisposition"]["data"])) body["data"]["relationships"]["taskdisposition"]["data"] = {};
      body["data"]["relationships"]["taskdisposition"]["data"]["id"] = d.data_relationships_taskdisposition_data_id;
    }
    if (d.data_relationships_taskdisposition_data_type !== undefined && d.data_relationships_taskdisposition_data_type !== null && d.data_relationships_taskdisposition_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["taskdisposition"] || typeof body["data"]["relationships"]["taskdisposition"] !== 'object' || Array.isArray(body["data"]["relationships"]["taskdisposition"])) body["data"]["relationships"]["taskdisposition"] = {};
      if (!body["data"]["relationships"]["taskdisposition"]["data"] || typeof body["data"]["relationships"]["taskdisposition"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["taskdisposition"]["data"])) body["data"]["relationships"]["taskdisposition"]["data"] = {};
      body["data"]["relationships"]["taskdisposition"]["data"]["type"] = d.data_relationships_taskdisposition_data_type;
    }
    if (d.data_relationships_taskdisposition_links_related !== undefined && d.data_relationships_taskdisposition_links_related !== null && d.data_relationships_taskdisposition_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["taskdisposition"] || typeof body["data"]["relationships"]["taskdisposition"] !== 'object' || Array.isArray(body["data"]["relationships"]["taskdisposition"])) body["data"]["relationships"]["taskdisposition"] = {};
      if (!body["data"]["relationships"]["taskdisposition"]["links"] || typeof body["data"]["relationships"]["taskdisposition"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["taskdisposition"]["links"])) body["data"]["relationships"]["taskdisposition"]["links"] = {};
      body["data"]["relationships"]["taskdisposition"]["links"]["related"] = d.data_relationships_taskdisposition_links_related;
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
    if (d.data_relationships_taskpurpose_data_id !== undefined && d.data_relationships_taskpurpose_data_id !== null && d.data_relationships_taskpurpose_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["taskpurpose"] || typeof body["data"]["relationships"]["taskpurpose"] !== 'object' || Array.isArray(body["data"]["relationships"]["taskpurpose"])) body["data"]["relationships"]["taskpurpose"] = {};
      if (!body["data"]["relationships"]["taskpurpose"]["data"] || typeof body["data"]["relationships"]["taskpurpose"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["taskpurpose"]["data"])) body["data"]["relationships"]["taskpurpose"]["data"] = {};
      body["data"]["relationships"]["taskpurpose"]["data"]["id"] = d.data_relationships_taskpurpose_data_id;
    }
    if (d.data_relationships_taskpurpose_data_type !== undefined && d.data_relationships_taskpurpose_data_type !== null && d.data_relationships_taskpurpose_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["taskpurpose"] || typeof body["data"]["relationships"]["taskpurpose"] !== 'object' || Array.isArray(body["data"]["relationships"]["taskpurpose"])) body["data"]["relationships"]["taskpurpose"] = {};
      if (!body["data"]["relationships"]["taskpurpose"]["data"] || typeof body["data"]["relationships"]["taskpurpose"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["taskpurpose"]["data"])) body["data"]["relationships"]["taskpurpose"]["data"] = {};
      body["data"]["relationships"]["taskpurpose"]["data"]["type"] = d.data_relationships_taskpurpose_data_type;
    }
    if (d.data_relationships_taskpurpose_links_related !== undefined && d.data_relationships_taskpurpose_links_related !== null && d.data_relationships_taskpurpose_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["taskpurpose"] || typeof body["data"]["relationships"]["taskpurpose"] !== 'object' || Array.isArray(body["data"]["relationships"]["taskpurpose"])) body["data"]["relationships"]["taskpurpose"] = {};
      if (!body["data"]["relationships"]["taskpurpose"]["links"] || typeof body["data"]["relationships"]["taskpurpose"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["taskpurpose"]["links"])) body["data"]["relationships"]["taskpurpose"]["links"] = {};
      body["data"]["relationships"]["taskpurpose"]["links"]["related"] = d.data_relationships_taskpurpose_links_related;
    }
    if (d.data_relationships_tasktheme_data_id !== undefined && d.data_relationships_tasktheme_data_id !== null && d.data_relationships_tasktheme_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["tasktheme"] || typeof body["data"]["relationships"]["tasktheme"] !== 'object' || Array.isArray(body["data"]["relationships"]["tasktheme"])) body["data"]["relationships"]["tasktheme"] = {};
      if (!body["data"]["relationships"]["tasktheme"]["data"] || typeof body["data"]["relationships"]["tasktheme"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["tasktheme"]["data"])) body["data"]["relationships"]["tasktheme"]["data"] = {};
      body["data"]["relationships"]["tasktheme"]["data"]["id"] = d.data_relationships_tasktheme_data_id;
    }
    if (d.data_relationships_tasktheme_data_type !== undefined && d.data_relationships_tasktheme_data_type !== null && d.data_relationships_tasktheme_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["tasktheme"] || typeof body["data"]["relationships"]["tasktheme"] !== 'object' || Array.isArray(body["data"]["relationships"]["tasktheme"])) body["data"]["relationships"]["tasktheme"] = {};
      if (!body["data"]["relationships"]["tasktheme"]["data"] || typeof body["data"]["relationships"]["tasktheme"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["tasktheme"]["data"])) body["data"]["relationships"]["tasktheme"]["data"] = {};
      body["data"]["relationships"]["tasktheme"]["data"]["type"] = d.data_relationships_tasktheme_data_type;
    }
    if (d.data_relationships_tasktheme_links_related !== undefined && d.data_relationships_tasktheme_links_related !== null && d.data_relationships_tasktheme_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["tasktheme"] || typeof body["data"]["relationships"]["tasktheme"] !== 'object' || Array.isArray(body["data"]["relationships"]["tasktheme"])) body["data"]["relationships"]["tasktheme"] = {};
      if (!body["data"]["relationships"]["tasktheme"]["links"] || typeof body["data"]["relationships"]["tasktheme"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["tasktheme"]["links"])) body["data"]["relationships"]["tasktheme"]["links"] = {};
      body["data"]["relationships"]["tasktheme"]["links"]["related"] = d.data_relationships_tasktheme_links_related;
    }
    if (d.data_relationships_team_data_id !== undefined && d.data_relationships_team_data_id !== null && d.data_relationships_team_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["team"] || typeof body["data"]["relationships"]["team"] !== 'object' || Array.isArray(body["data"]["relationships"]["team"])) body["data"]["relationships"]["team"] = {};
      if (!body["data"]["relationships"]["team"]["data"] || typeof body["data"]["relationships"]["team"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["team"]["data"])) body["data"]["relationships"]["team"]["data"] = {};
      body["data"]["relationships"]["team"]["data"]["id"] = d.data_relationships_team_data_id;
    }
    if (d.data_relationships_team_data_type !== undefined && d.data_relationships_team_data_type !== null && d.data_relationships_team_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["team"] || typeof body["data"]["relationships"]["team"] !== 'object' || Array.isArray(body["data"]["relationships"]["team"])) body["data"]["relationships"]["team"] = {};
      if (!body["data"]["relationships"]["team"]["data"] || typeof body["data"]["relationships"]["team"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["team"]["data"])) body["data"]["relationships"]["team"]["data"] = {};
      body["data"]["relationships"]["team"]["data"]["type"] = d.data_relationships_team_data_type;
    }
    if (d.data_relationships_team_links_related !== undefined && d.data_relationships_team_links_related !== null && d.data_relationships_team_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["team"] || typeof body["data"]["relationships"]["team"] !== 'object' || Array.isArray(body["data"]["relationships"]["team"])) body["data"]["relationships"]["team"] = {};
      if (!body["data"]["relationships"]["team"]["links"] || typeof body["data"]["relationships"]["team"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["team"]["links"])) body["data"]["relationships"]["team"]["links"] = {};
      body["data"]["relationships"]["team"]["links"]["related"] = d.data_relationships_team_links_related;
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

