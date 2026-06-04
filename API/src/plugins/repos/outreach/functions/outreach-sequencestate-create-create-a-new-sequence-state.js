const { utils } = require('./utils');

module.exports = {
  async outreach_sequencestate_create_create_a_new_sequence_state(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/sequenceStates";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.data_attributes_activeat !== undefined && d.data_attributes_activeat !== null && d.data_attributes_activeat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["activeat"] = d.data_attributes_activeat;
    }
    if (d.data_attributes_bouncecount !== undefined && d.data_attributes_bouncecount !== null && d.data_attributes_bouncecount !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["bouncecount"] = d.data_attributes_bouncecount;
    }
    if (d.data_attributes_callcompletedat !== undefined && d.data_attributes_callcompletedat !== null && d.data_attributes_callcompletedat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["callcompletedat"] = d.data_attributes_callcompletedat;
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
    if (d.data_attributes_errorreason !== undefined && d.data_attributes_errorreason !== null && d.data_attributes_errorreason !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["errorreason"] = d.data_attributes_errorreason;
    }
    if (d.data_attributes_failurecount !== undefined && d.data_attributes_failurecount !== null && d.data_attributes_failurecount !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["failurecount"] = d.data_attributes_failurecount;
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
    if (d.data_attributes_pausereason !== undefined && d.data_attributes_pausereason !== null && d.data_attributes_pausereason !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["pausereason"] = d.data_attributes_pausereason;
    }
    if (d.data_attributes_positivereplycount !== undefined && d.data_attributes_positivereplycount !== null && d.data_attributes_positivereplycount !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["positivereplycount"] = d.data_attributes_positivereplycount;
    }
    if (d.data_attributes_repliedat !== undefined && d.data_attributes_repliedat !== null && d.data_attributes_repliedat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["repliedat"] = d.data_attributes_repliedat;
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
    if (d.data_relationships_activestepmailings_data !== undefined && d.data_relationships_activestepmailings_data !== null && d.data_relationships_activestepmailings_data !== '') {
      body["data_relationships_activestepmailings_data"] = d.data_relationships_activestepmailings_data;
    }
    if (d.data_relationships_activestepmailings_links_related !== undefined && d.data_relationships_activestepmailings_links_related !== null && d.data_relationships_activestepmailings_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["activestepmailings"] || typeof body["data"]["relationships"]["activestepmailings"] !== 'object' || Array.isArray(body["data"]["relationships"]["activestepmailings"])) body["data"]["relationships"]["activestepmailings"] = {};
      if (!body["data"]["relationships"]["activestepmailings"]["links"] || typeof body["data"]["relationships"]["activestepmailings"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["activestepmailings"]["links"])) body["data"]["relationships"]["activestepmailings"]["links"] = {};
      body["data"]["relationships"]["activestepmailings"]["links"]["related"] = d.data_relationships_activestepmailings_links_related;
    }
    if (d.data_relationships_activesteptasks_data !== undefined && d.data_relationships_activesteptasks_data !== null && d.data_relationships_activesteptasks_data !== '') {
      body["data_relationships_activesteptasks_data"] = d.data_relationships_activesteptasks_data;
    }
    if (d.data_relationships_activesteptasks_links_related !== undefined && d.data_relationships_activesteptasks_links_related !== null && d.data_relationships_activesteptasks_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["activesteptasks"] || typeof body["data"]["relationships"]["activesteptasks"] !== 'object' || Array.isArray(body["data"]["relationships"]["activesteptasks"])) body["data"]["relationships"]["activesteptasks"] = {};
      if (!body["data"]["relationships"]["activesteptasks"]["links"] || typeof body["data"]["relationships"]["activesteptasks"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["activesteptasks"]["links"])) body["data"]["relationships"]["activesteptasks"]["links"] = {};
      body["data"]["relationships"]["activesteptasks"]["links"]["related"] = d.data_relationships_activesteptasks_links_related;
    }
    if (d.data_relationships_batchitemcreator_data_id !== undefined && d.data_relationships_batchitemcreator_data_id !== null && d.data_relationships_batchitemcreator_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["batchitemcreator"] || typeof body["data"]["relationships"]["batchitemcreator"] !== 'object' || Array.isArray(body["data"]["relationships"]["batchitemcreator"])) body["data"]["relationships"]["batchitemcreator"] = {};
      if (!body["data"]["relationships"]["batchitemcreator"]["data"] || typeof body["data"]["relationships"]["batchitemcreator"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["batchitemcreator"]["data"])) body["data"]["relationships"]["batchitemcreator"]["data"] = {};
      body["data"]["relationships"]["batchitemcreator"]["data"]["id"] = d.data_relationships_batchitemcreator_data_id;
    }
    if (d.data_relationships_batchitemcreator_data_type !== undefined && d.data_relationships_batchitemcreator_data_type !== null && d.data_relationships_batchitemcreator_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["batchitemcreator"] || typeof body["data"]["relationships"]["batchitemcreator"] !== 'object' || Array.isArray(body["data"]["relationships"]["batchitemcreator"])) body["data"]["relationships"]["batchitemcreator"] = {};
      if (!body["data"]["relationships"]["batchitemcreator"]["data"] || typeof body["data"]["relationships"]["batchitemcreator"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["batchitemcreator"]["data"])) body["data"]["relationships"]["batchitemcreator"]["data"] = {};
      body["data"]["relationships"]["batchitemcreator"]["data"]["type"] = d.data_relationships_batchitemcreator_data_type;
    }
    if (d.data_relationships_batchitemcreator_links_related !== undefined && d.data_relationships_batchitemcreator_links_related !== null && d.data_relationships_batchitemcreator_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["batchitemcreator"] || typeof body["data"]["relationships"]["batchitemcreator"] !== 'object' || Array.isArray(body["data"]["relationships"]["batchitemcreator"])) body["data"]["relationships"]["batchitemcreator"] = {};
      if (!body["data"]["relationships"]["batchitemcreator"]["links"] || typeof body["data"]["relationships"]["batchitemcreator"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["batchitemcreator"]["links"])) body["data"]["relationships"]["batchitemcreator"]["links"] = {};
      body["data"]["relationships"]["batchitemcreator"]["links"]["related"] = d.data_relationships_batchitemcreator_links_related;
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
    if (d.data_relationships_mailbox_data_id !== undefined && d.data_relationships_mailbox_data_id !== null && d.data_relationships_mailbox_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["mailbox"] || typeof body["data"]["relationships"]["mailbox"] !== 'object' || Array.isArray(body["data"]["relationships"]["mailbox"])) body["data"]["relationships"]["mailbox"] = {};
      if (!body["data"]["relationships"]["mailbox"]["data"] || typeof body["data"]["relationships"]["mailbox"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["mailbox"]["data"])) body["data"]["relationships"]["mailbox"]["data"] = {};
      body["data"]["relationships"]["mailbox"]["data"]["id"] = d.data_relationships_mailbox_data_id;
    }
    if (d.data_relationships_mailbox_data_type !== undefined && d.data_relationships_mailbox_data_type !== null && d.data_relationships_mailbox_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["mailbox"] || typeof body["data"]["relationships"]["mailbox"] !== 'object' || Array.isArray(body["data"]["relationships"]["mailbox"])) body["data"]["relationships"]["mailbox"] = {};
      if (!body["data"]["relationships"]["mailbox"]["data"] || typeof body["data"]["relationships"]["mailbox"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["mailbox"]["data"])) body["data"]["relationships"]["mailbox"]["data"] = {};
      body["data"]["relationships"]["mailbox"]["data"]["type"] = d.data_relationships_mailbox_data_type;
    }
    if (d.data_relationships_mailbox_links_related !== undefined && d.data_relationships_mailbox_links_related !== null && d.data_relationships_mailbox_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["mailbox"] || typeof body["data"]["relationships"]["mailbox"] !== 'object' || Array.isArray(body["data"]["relationships"]["mailbox"])) body["data"]["relationships"]["mailbox"] = {};
      if (!body["data"]["relationships"]["mailbox"]["links"] || typeof body["data"]["relationships"]["mailbox"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["mailbox"]["links"])) body["data"]["relationships"]["mailbox"]["links"] = {};
      body["data"]["relationships"]["mailbox"]["links"]["related"] = d.data_relationships_mailbox_links_related;
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
    if (d.data_relationships_sequencestaterecipients_data !== undefined && d.data_relationships_sequencestaterecipients_data !== null && d.data_relationships_sequencestaterecipients_data !== '') {
      body["data_relationships_sequencestaterecipients_data"] = d.data_relationships_sequencestaterecipients_data;
    }
    if (d.data_relationships_sequencestaterecipients_links_related !== undefined && d.data_relationships_sequencestaterecipients_links_related !== null && d.data_relationships_sequencestaterecipients_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["sequencestaterecipients"] || typeof body["data"]["relationships"]["sequencestaterecipients"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequencestaterecipients"])) body["data"]["relationships"]["sequencestaterecipients"] = {};
      if (!body["data"]["relationships"]["sequencestaterecipients"]["links"] || typeof body["data"]["relationships"]["sequencestaterecipients"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequencestaterecipients"]["links"])) body["data"]["relationships"]["sequencestaterecipients"]["links"] = {};
      body["data"]["relationships"]["sequencestaterecipients"]["links"]["related"] = d.data_relationships_sequencestaterecipients_links_related;
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
    if (d.data_relationships_tasks_links_related !== undefined && d.data_relationships_tasks_links_related !== null && d.data_relationships_tasks_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["tasks"] || typeof body["data"]["relationships"]["tasks"] !== 'object' || Array.isArray(body["data"]["relationships"]["tasks"])) body["data"]["relationships"]["tasks"] = {};
      if (!body["data"]["relationships"]["tasks"]["links"] || typeof body["data"]["relationships"]["tasks"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["tasks"]["links"])) body["data"]["relationships"]["tasks"]["links"] = {};
      body["data"]["relationships"]["tasks"]["links"]["related"] = d.data_relationships_tasks_links_related;
    }
    if (d.data_relationships_user_data_id !== undefined && d.data_relationships_user_data_id !== null && d.data_relationships_user_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["user"] || typeof body["data"]["relationships"]["user"] !== 'object' || Array.isArray(body["data"]["relationships"]["user"])) body["data"]["relationships"]["user"] = {};
      if (!body["data"]["relationships"]["user"]["data"] || typeof body["data"]["relationships"]["user"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["user"]["data"])) body["data"]["relationships"]["user"]["data"] = {};
      body["data"]["relationships"]["user"]["data"]["id"] = d.data_relationships_user_data_id;
    }
    if (d.data_relationships_user_data_type !== undefined && d.data_relationships_user_data_type !== null && d.data_relationships_user_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["user"] || typeof body["data"]["relationships"]["user"] !== 'object' || Array.isArray(body["data"]["relationships"]["user"])) body["data"]["relationships"]["user"] = {};
      if (!body["data"]["relationships"]["user"]["data"] || typeof body["data"]["relationships"]["user"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["user"]["data"])) body["data"]["relationships"]["user"]["data"] = {};
      body["data"]["relationships"]["user"]["data"]["type"] = d.data_relationships_user_data_type;
    }
    if (d.data_relationships_user_links_related !== undefined && d.data_relationships_user_links_related !== null && d.data_relationships_user_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["user"] || typeof body["data"]["relationships"]["user"] !== 'object' || Array.isArray(body["data"]["relationships"]["user"])) body["data"]["relationships"]["user"] = {};
      if (!body["data"]["relationships"]["user"]["links"] || typeof body["data"]["relationships"]["user"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["user"]["links"])) body["data"]["relationships"]["user"]["links"] = {};
      body["data"]["relationships"]["user"]["links"]["related"] = d.data_relationships_user_links_related;
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

