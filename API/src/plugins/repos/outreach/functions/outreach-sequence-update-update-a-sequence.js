const { utils } = require('./utils');

module.exports = {
  async outreach_sequence_update_update_a_sequence(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/sequences/{id}";
    const id = String(d.id || '').trim();
    if (!id) return { ok: false, error: 'id requis.' };
    reqPath = reqPath.replace('{id}', encodeURIComponent(id));

    const query = {};

    const headers = {};

    const body = {};
    if (d.data_attributes_automationpercentage !== undefined && d.data_attributes_automationpercentage !== null && d.data_attributes_automationpercentage !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["automationpercentage"] = d.data_attributes_automationpercentage;
    }
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
    if (d.data_attributes_description !== undefined && d.data_attributes_description !== null && d.data_attributes_description !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["description"] = d.data_attributes_description;
    }
    if (d.data_attributes_durationindays !== undefined && d.data_attributes_durationindays !== null && d.data_attributes_durationindays !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["durationindays"] = d.data_attributes_durationindays;
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
    if (d.data_attributes_finishonreply !== undefined && d.data_attributes_finishonreply !== null && d.data_attributes_finishonreply !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["finishonreply"] = d.data_attributes_finishonreply;
    }
    if (d.data_attributes_lastusedat !== undefined && d.data_attributes_lastusedat !== null && d.data_attributes_lastusedat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["lastusedat"] = d.data_attributes_lastusedat;
    }
    if (d.data_attributes_locked !== undefined && d.data_attributes_locked !== null && d.data_attributes_locked !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["locked"] = d.data_attributes_locked;
    }
    if (d.data_attributes_lockedat !== undefined && d.data_attributes_lockedat !== null && d.data_attributes_lockedat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["lockedat"] = d.data_attributes_lockedat;
    }
    if (d.data_attributes_maxactivations !== undefined && d.data_attributes_maxactivations !== null && d.data_attributes_maxactivations !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["maxactivations"] = d.data_attributes_maxactivations;
    }
    if (d.data_attributes_name !== undefined && d.data_attributes_name !== null && d.data_attributes_name !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["name"] = d.data_attributes_name;
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
    if (d.data_attributes_numcontactedprospects !== undefined && d.data_attributes_numcontactedprospects !== null && d.data_attributes_numcontactedprospects !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["numcontactedprospects"] = d.data_attributes_numcontactedprospects;
    }
    if (d.data_attributes_numrepliedprospects !== undefined && d.data_attributes_numrepliedprospects !== null && d.data_attributes_numrepliedprospects !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["numrepliedprospects"] = d.data_attributes_numrepliedprospects;
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
    if (d.data_attributes_primaryreplyaction !== undefined && d.data_attributes_primaryreplyaction !== null && d.data_attributes_primaryreplyaction !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["primaryreplyaction"] = d.data_attributes_primaryreplyaction;
    }
    if (d.data_attributes_primaryreplypauseduration !== undefined && d.data_attributes_primaryreplypauseduration !== null && d.data_attributes_primaryreplypauseduration !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["primaryreplypauseduration"] = d.data_attributes_primaryreplypauseduration;
    }
    if (d.data_attributes_replycount !== undefined && d.data_attributes_replycount !== null && d.data_attributes_replycount !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["replycount"] = d.data_attributes_replycount;
    }
    if (d.data_attributes_salesmotion !== undefined && d.data_attributes_salesmotion !== null && d.data_attributes_salesmotion !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["salesmotion"] = d.data_attributes_salesmotion;
    }
    if (d.data_attributes_schedulecount !== undefined && d.data_attributes_schedulecount !== null && d.data_attributes_schedulecount !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["schedulecount"] = d.data_attributes_schedulecount;
    }
    if (d.data_attributes_scheduleintervaltype !== undefined && d.data_attributes_scheduleintervaltype !== null && d.data_attributes_scheduleintervaltype !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["scheduleintervaltype"] = d.data_attributes_scheduleintervaltype;
    }
    if (d.data_attributes_secondaryreplyaction !== undefined && d.data_attributes_secondaryreplyaction !== null && d.data_attributes_secondaryreplyaction !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["secondaryreplyaction"] = d.data_attributes_secondaryreplyaction;
    }
    if (d.data_attributes_secondaryreplypauseduration !== undefined && d.data_attributes_secondaryreplypauseduration !== null && d.data_attributes_secondaryreplypauseduration !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["secondaryreplypauseduration"] = d.data_attributes_secondaryreplypauseduration;
    }
    if (d.data_attributes_sequencestepcount !== undefined && d.data_attributes_sequencestepcount !== null && d.data_attributes_sequencestepcount !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["sequencestepcount"] = d.data_attributes_sequencestepcount;
    }
    if (d.data_attributes_sequencetype !== undefined && d.data_attributes_sequencetype !== null && d.data_attributes_sequencetype !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["sequencetype"] = d.data_attributes_sequencetype;
    }
    if (d.data_attributes_sharetype !== undefined && d.data_attributes_sharetype !== null && d.data_attributes_sharetype !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["sharetype"] = d.data_attributes_sharetype;
    }
    if (d.data_attributes_tags !== undefined && d.data_attributes_tags !== null && d.data_attributes_tags !== '') {
      body["data_attributes_tags"] = d.data_attributes_tags;
    }
    if (d.data_attributes_throttlecapacity !== undefined && d.data_attributes_throttlecapacity !== null && d.data_attributes_throttlecapacity !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["throttlecapacity"] = d.data_attributes_throttlecapacity;
    }
    if (d.data_attributes_throttlemaxaddsperday !== undefined && d.data_attributes_throttlemaxaddsperday !== null && d.data_attributes_throttlemaxaddsperday !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["throttlemaxaddsperday"] = d.data_attributes_throttlemaxaddsperday;
    }
    if (d.data_attributes_throttlepaused !== undefined && d.data_attributes_throttlepaused !== null && d.data_attributes_throttlepaused !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["throttlepaused"] = d.data_attributes_throttlepaused;
    }
    if (d.data_attributes_throttlepausedat !== undefined && d.data_attributes_throttlepausedat !== null && d.data_attributes_throttlepausedat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["throttlepausedat"] = d.data_attributes_throttlepausedat;
    }
    if (d.data_attributes_transactional !== undefined && d.data_attributes_transactional !== null && d.data_attributes_transactional !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["transactional"] = d.data_attributes_transactional;
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
    if (d.data_relationships_calls_links_related !== undefined && d.data_relationships_calls_links_related !== null && d.data_relationships_calls_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["calls"] || typeof body["data"]["relationships"]["calls"] !== 'object' || Array.isArray(body["data"]["relationships"]["calls"])) body["data"]["relationships"]["calls"] = {};
      if (!body["data"]["relationships"]["calls"]["links"] || typeof body["data"]["relationships"]["calls"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["calls"]["links"])) body["data"]["relationships"]["calls"]["links"] = {};
      body["data"]["relationships"]["calls"]["links"]["related"] = d.data_relationships_calls_links_related;
    }
    if (d.data_relationships_contentcategorymemberships_data !== undefined && d.data_relationships_contentcategorymemberships_data !== null && d.data_relationships_contentcategorymemberships_data !== '') {
      body["data_relationships_contentcategorymemberships_data"] = d.data_relationships_contentcategorymemberships_data;
    }
    if (d.data_relationships_contentcategorymemberships_links_related !== undefined && d.data_relationships_contentcategorymemberships_links_related !== null && d.data_relationships_contentcategorymemberships_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["contentcategorymemberships"] || typeof body["data"]["relationships"]["contentcategorymemberships"] !== 'object' || Array.isArray(body["data"]["relationships"]["contentcategorymemberships"])) body["data"]["relationships"]["contentcategorymemberships"] = {};
      if (!body["data"]["relationships"]["contentcategorymemberships"]["links"] || typeof body["data"]["relationships"]["contentcategorymemberships"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["contentcategorymemberships"]["links"])) body["data"]["relationships"]["contentcategorymemberships"]["links"] = {};
      body["data"]["relationships"]["contentcategorymemberships"]["links"]["related"] = d.data_relationships_contentcategorymemberships_links_related;
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
    if (d.data_relationships_ruleset_data_id !== undefined && d.data_relationships_ruleset_data_id !== null && d.data_relationships_ruleset_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["ruleset"] || typeof body["data"]["relationships"]["ruleset"] !== 'object' || Array.isArray(body["data"]["relationships"]["ruleset"])) body["data"]["relationships"]["ruleset"] = {};
      if (!body["data"]["relationships"]["ruleset"]["data"] || typeof body["data"]["relationships"]["ruleset"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["ruleset"]["data"])) body["data"]["relationships"]["ruleset"]["data"] = {};
      body["data"]["relationships"]["ruleset"]["data"]["id"] = d.data_relationships_ruleset_data_id;
    }
    if (d.data_relationships_ruleset_data_type !== undefined && d.data_relationships_ruleset_data_type !== null && d.data_relationships_ruleset_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["ruleset"] || typeof body["data"]["relationships"]["ruleset"] !== 'object' || Array.isArray(body["data"]["relationships"]["ruleset"])) body["data"]["relationships"]["ruleset"] = {};
      if (!body["data"]["relationships"]["ruleset"]["data"] || typeof body["data"]["relationships"]["ruleset"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["ruleset"]["data"])) body["data"]["relationships"]["ruleset"]["data"] = {};
      body["data"]["relationships"]["ruleset"]["data"]["type"] = d.data_relationships_ruleset_data_type;
    }
    if (d.data_relationships_ruleset_links_related !== undefined && d.data_relationships_ruleset_links_related !== null && d.data_relationships_ruleset_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["ruleset"] || typeof body["data"]["relationships"]["ruleset"] !== 'object' || Array.isArray(body["data"]["relationships"]["ruleset"])) body["data"]["relationships"]["ruleset"] = {};
      if (!body["data"]["relationships"]["ruleset"]["links"] || typeof body["data"]["relationships"]["ruleset"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["ruleset"]["links"])) body["data"]["relationships"]["ruleset"]["links"] = {};
      body["data"]["relationships"]["ruleset"]["links"]["related"] = d.data_relationships_ruleset_links_related;
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
    if (d.data_relationships_sequencestates_links_related !== undefined && d.data_relationships_sequencestates_links_related !== null && d.data_relationships_sequencestates_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["sequencestates"] || typeof body["data"]["relationships"]["sequencestates"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequencestates"])) body["data"]["relationships"]["sequencestates"] = {};
      if (!body["data"]["relationships"]["sequencestates"]["links"] || typeof body["data"]["relationships"]["sequencestates"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequencestates"]["links"])) body["data"]["relationships"]["sequencestates"]["links"] = {};
      body["data"]["relationships"]["sequencestates"]["links"]["related"] = d.data_relationships_sequencestates_links_related;
    }
    if (d.data_relationships_sequencesteps_data !== undefined && d.data_relationships_sequencesteps_data !== null && d.data_relationships_sequencesteps_data !== '') {
      body["data_relationships_sequencesteps_data"] = d.data_relationships_sequencesteps_data;
    }
    if (d.data_relationships_sequencesteps_links_related !== undefined && d.data_relationships_sequencesteps_links_related !== null && d.data_relationships_sequencesteps_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["sequencesteps"] || typeof body["data"]["relationships"]["sequencesteps"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequencesteps"])) body["data"]["relationships"]["sequencesteps"] = {};
      if (!body["data"]["relationships"]["sequencesteps"]["links"] || typeof body["data"]["relationships"]["sequencesteps"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequencesteps"]["links"])) body["data"]["relationships"]["sequencesteps"]["links"] = {};
      body["data"]["relationships"]["sequencesteps"]["links"]["related"] = d.data_relationships_sequencesteps_links_related;
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

