const { utils } = require('./utils');

module.exports = {
  async outreach_ruleset_update_update_a_ruleset(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/rulesets/{id}";
    const id = String(d.id || '').trim();
    if (!id) return { ok: false, error: 'id requis.' };
    reqPath = reqPath.replace('{id}', encodeURIComponent(id));

    const query = {};

    const headers = {};

    const body = {};
    if (d.data_attributes_applycompletedstagein !== undefined && d.data_attributes_applycompletedstagein !== null && d.data_attributes_applycompletedstagein !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["applycompletedstagein"] = d.data_attributes_applycompletedstagein;
    }
    if (d.data_attributes_autoresumeootoprospects !== undefined && d.data_attributes_autoresumeootoprospects !== null && d.data_attributes_autoresumeootoprospects !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["autoresumeootoprospects"] = d.data_attributes_autoresumeootoprospects;
    }
    if (d.data_attributes_autoresumeootoprospectsexpiresin !== undefined && d.data_attributes_autoresumeootoprospectsexpiresin !== null && d.data_attributes_autoresumeootoprospectsexpiresin !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["autoresumeootoprospectsexpiresin"] = d.data_attributes_autoresumeootoprospectsexpiresin;
    }
    if (d.data_attributes_autoresumeootoprospectsin !== undefined && d.data_attributes_autoresumeootoprospectsin !== null && d.data_attributes_autoresumeootoprospectsin !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["autoresumeootoprospectsin"] = d.data_attributes_autoresumeootoprospectsin;
    }
    if (d.data_attributes_calloptoutaction !== undefined && d.data_attributes_calloptoutaction !== null && d.data_attributes_calloptoutaction !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["calloptoutaction"] = d.data_attributes_calloptoutaction;
    }
    if (d.data_attributes_clicksneededbeforecalltaskcreated !== undefined && d.data_attributes_clicksneededbeforecalltaskcreated !== null && d.data_attributes_clicksneededbeforecalltaskcreated !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["clicksneededbeforecalltaskcreated"] = d.data_attributes_clicksneededbeforecalltaskcreated;
    }
    if (d.data_attributes_createdat !== undefined && d.data_attributes_createdat !== null && d.data_attributes_createdat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["createdat"] = d.data_attributes_createdat;
    }
    if (d.data_attributes_emailoptoutaction !== undefined && d.data_attributes_emailoptoutaction !== null && d.data_attributes_emailoptoutaction !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["emailoptoutaction"] = d.data_attributes_emailoptoutaction;
    }
    if (d.data_attributes_includeunsubscribelinks !== undefined && d.data_attributes_includeunsubscribelinks !== null && d.data_attributes_includeunsubscribelinks !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["includeunsubscribelinks"] = d.data_attributes_includeunsubscribelinks;
    }
    if (d.data_attributes_meetingbookedaction !== undefined && d.data_attributes_meetingbookedaction !== null && d.data_attributes_meetingbookedaction !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["meetingbookedaction"] = d.data_attributes_meetingbookedaction;
    }
    if (d.data_attributes_minimumprospecttouchedinterval !== undefined && d.data_attributes_minimumprospecttouchedinterval !== null && d.data_attributes_minimumprospecttouchedinterval !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["minimumprospecttouchedinterval"] = d.data_attributes_minimumprospecttouchedinterval;
    }
    if (d.data_attributes_name !== undefined && d.data_attributes_name !== null && d.data_attributes_name !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["name"] = d.data_attributes_name;
    }
    if (d.data_attributes_ootoautoextractionenabled !== undefined && d.data_attributes_ootoautoextractionenabled !== null && d.data_attributes_ootoautoextractionenabled !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["ootoautoextractionenabled"] = d.data_attributes_ootoautoextractionenabled;
    }
    if (d.data_attributes_opensneededbeforecalltaskcreated !== undefined && d.data_attributes_opensneededbeforecalltaskcreated !== null && d.data_attributes_opensneededbeforecalltaskcreated !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["opensneededbeforecalltaskcreated"] = d.data_attributes_opensneededbeforecalltaskcreated;
    }
    if (d.data_attributes_permitduplicateprospects !== undefined && d.data_attributes_permitduplicateprospects !== null && d.data_attributes_permitduplicateprospects !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["permitduplicateprospects"] = d.data_attributes_permitduplicateprospects;
    }
    if (d.data_attributes_sequenceexclusivity !== undefined && d.data_attributes_sequenceexclusivity !== null && d.data_attributes_sequenceexclusivity !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["sequenceexclusivity"] = d.data_attributes_sequenceexclusivity;
    }
    if (d.data_attributes_smsoptoutaction !== undefined && d.data_attributes_smsoptoutaction !== null && d.data_attributes_smsoptoutaction !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["smsoptoutaction"] = d.data_attributes_smsoptoutaction;
    }
    if (d.data_attributes_smsreceivedaction !== undefined && d.data_attributes_smsreceivedaction !== null && d.data_attributes_smsreceivedaction !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["smsreceivedaction"] = d.data_attributes_smsreceivedaction;
    }
    if (d.data_attributes_stepoverridesenabled !== undefined && d.data_attributes_stepoverridesenabled !== null && d.data_attributes_stepoverridesenabled !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["stepoverridesenabled"] = d.data_attributes_stepoverridesenabled;
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
    if (d.data_relationships_bouncedstage_data_id !== undefined && d.data_relationships_bouncedstage_data_id !== null && d.data_relationships_bouncedstage_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["bouncedstage"] || typeof body["data"]["relationships"]["bouncedstage"] !== 'object' || Array.isArray(body["data"]["relationships"]["bouncedstage"])) body["data"]["relationships"]["bouncedstage"] = {};
      if (!body["data"]["relationships"]["bouncedstage"]["data"] || typeof body["data"]["relationships"]["bouncedstage"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["bouncedstage"]["data"])) body["data"]["relationships"]["bouncedstage"]["data"] = {};
      body["data"]["relationships"]["bouncedstage"]["data"]["id"] = d.data_relationships_bouncedstage_data_id;
    }
    if (d.data_relationships_bouncedstage_data_type !== undefined && d.data_relationships_bouncedstage_data_type !== null && d.data_relationships_bouncedstage_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["bouncedstage"] || typeof body["data"]["relationships"]["bouncedstage"] !== 'object' || Array.isArray(body["data"]["relationships"]["bouncedstage"])) body["data"]["relationships"]["bouncedstage"] = {};
      if (!body["data"]["relationships"]["bouncedstage"]["data"] || typeof body["data"]["relationships"]["bouncedstage"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["bouncedstage"]["data"])) body["data"]["relationships"]["bouncedstage"]["data"] = {};
      body["data"]["relationships"]["bouncedstage"]["data"]["type"] = d.data_relationships_bouncedstage_data_type;
    }
    if (d.data_relationships_bouncedstage_links_related !== undefined && d.data_relationships_bouncedstage_links_related !== null && d.data_relationships_bouncedstage_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["bouncedstage"] || typeof body["data"]["relationships"]["bouncedstage"] !== 'object' || Array.isArray(body["data"]["relationships"]["bouncedstage"])) body["data"]["relationships"]["bouncedstage"] = {};
      if (!body["data"]["relationships"]["bouncedstage"]["links"] || typeof body["data"]["relationships"]["bouncedstage"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["bouncedstage"]["links"])) body["data"]["relationships"]["bouncedstage"]["links"] = {};
      body["data"]["relationships"]["bouncedstage"]["links"]["related"] = d.data_relationships_bouncedstage_links_related;
    }
    if (d.data_relationships_calltaskpriority_data_id !== undefined && d.data_relationships_calltaskpriority_data_id !== null && d.data_relationships_calltaskpriority_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["calltaskpriority"] || typeof body["data"]["relationships"]["calltaskpriority"] !== 'object' || Array.isArray(body["data"]["relationships"]["calltaskpriority"])) body["data"]["relationships"]["calltaskpriority"] = {};
      if (!body["data"]["relationships"]["calltaskpriority"]["data"] || typeof body["data"]["relationships"]["calltaskpriority"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["calltaskpriority"]["data"])) body["data"]["relationships"]["calltaskpriority"]["data"] = {};
      body["data"]["relationships"]["calltaskpriority"]["data"]["id"] = d.data_relationships_calltaskpriority_data_id;
    }
    if (d.data_relationships_calltaskpriority_data_type !== undefined && d.data_relationships_calltaskpriority_data_type !== null && d.data_relationships_calltaskpriority_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["calltaskpriority"] || typeof body["data"]["relationships"]["calltaskpriority"] !== 'object' || Array.isArray(body["data"]["relationships"]["calltaskpriority"])) body["data"]["relationships"]["calltaskpriority"] = {};
      if (!body["data"]["relationships"]["calltaskpriority"]["data"] || typeof body["data"]["relationships"]["calltaskpriority"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["calltaskpriority"]["data"])) body["data"]["relationships"]["calltaskpriority"]["data"] = {};
      body["data"]["relationships"]["calltaskpriority"]["data"]["type"] = d.data_relationships_calltaskpriority_data_type;
    }
    if (d.data_relationships_calltaskpriority_links_related !== undefined && d.data_relationships_calltaskpriority_links_related !== null && d.data_relationships_calltaskpriority_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["calltaskpriority"] || typeof body["data"]["relationships"]["calltaskpriority"] !== 'object' || Array.isArray(body["data"]["relationships"]["calltaskpriority"])) body["data"]["relationships"]["calltaskpriority"] = {};
      if (!body["data"]["relationships"]["calltaskpriority"]["links"] || typeof body["data"]["relationships"]["calltaskpriority"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["calltaskpriority"]["links"])) body["data"]["relationships"]["calltaskpriority"]["links"] = {};
      body["data"]["relationships"]["calltaskpriority"]["links"]["related"] = d.data_relationships_calltaskpriority_links_related;
    }
    if (d.data_relationships_calltaskpriorityfromclicks_data_id !== undefined && d.data_relationships_calltaskpriorityfromclicks_data_id !== null && d.data_relationships_calltaskpriorityfromclicks_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["calltaskpriorityfromclicks"] || typeof body["data"]["relationships"]["calltaskpriorityfromclicks"] !== 'object' || Array.isArray(body["data"]["relationships"]["calltaskpriorityfromclicks"])) body["data"]["relationships"]["calltaskpriorityfromclicks"] = {};
      if (!body["data"]["relationships"]["calltaskpriorityfromclicks"]["data"] || typeof body["data"]["relationships"]["calltaskpriorityfromclicks"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["calltaskpriorityfromclicks"]["data"])) body["data"]["relationships"]["calltaskpriorityfromclicks"]["data"] = {};
      body["data"]["relationships"]["calltaskpriorityfromclicks"]["data"]["id"] = d.data_relationships_calltaskpriorityfromclicks_data_id;
    }
    if (d.data_relationships_calltaskpriorityfromclicks_data_type !== undefined && d.data_relationships_calltaskpriorityfromclicks_data_type !== null && d.data_relationships_calltaskpriorityfromclicks_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["calltaskpriorityfromclicks"] || typeof body["data"]["relationships"]["calltaskpriorityfromclicks"] !== 'object' || Array.isArray(body["data"]["relationships"]["calltaskpriorityfromclicks"])) body["data"]["relationships"]["calltaskpriorityfromclicks"] = {};
      if (!body["data"]["relationships"]["calltaskpriorityfromclicks"]["data"] || typeof body["data"]["relationships"]["calltaskpriorityfromclicks"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["calltaskpriorityfromclicks"]["data"])) body["data"]["relationships"]["calltaskpriorityfromclicks"]["data"] = {};
      body["data"]["relationships"]["calltaskpriorityfromclicks"]["data"]["type"] = d.data_relationships_calltaskpriorityfromclicks_data_type;
    }
    if (d.data_relationships_calltaskpriorityfromclicks_links_related !== undefined && d.data_relationships_calltaskpriorityfromclicks_links_related !== null && d.data_relationships_calltaskpriorityfromclicks_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["calltaskpriorityfromclicks"] || typeof body["data"]["relationships"]["calltaskpriorityfromclicks"] !== 'object' || Array.isArray(body["data"]["relationships"]["calltaskpriorityfromclicks"])) body["data"]["relationships"]["calltaskpriorityfromclicks"] = {};
      if (!body["data"]["relationships"]["calltaskpriorityfromclicks"]["links"] || typeof body["data"]["relationships"]["calltaskpriorityfromclicks"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["calltaskpriorityfromclicks"]["links"])) body["data"]["relationships"]["calltaskpriorityfromclicks"]["links"] = {};
      body["data"]["relationships"]["calltaskpriorityfromclicks"]["links"]["related"] = d.data_relationships_calltaskpriorityfromclicks_links_related;
    }
    if (d.data_relationships_calltaskpriorityfromopens_data_id !== undefined && d.data_relationships_calltaskpriorityfromopens_data_id !== null && d.data_relationships_calltaskpriorityfromopens_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["calltaskpriorityfromopens"] || typeof body["data"]["relationships"]["calltaskpriorityfromopens"] !== 'object' || Array.isArray(body["data"]["relationships"]["calltaskpriorityfromopens"])) body["data"]["relationships"]["calltaskpriorityfromopens"] = {};
      if (!body["data"]["relationships"]["calltaskpriorityfromopens"]["data"] || typeof body["data"]["relationships"]["calltaskpriorityfromopens"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["calltaskpriorityfromopens"]["data"])) body["data"]["relationships"]["calltaskpriorityfromopens"]["data"] = {};
      body["data"]["relationships"]["calltaskpriorityfromopens"]["data"]["id"] = d.data_relationships_calltaskpriorityfromopens_data_id;
    }
    if (d.data_relationships_calltaskpriorityfromopens_data_type !== undefined && d.data_relationships_calltaskpriorityfromopens_data_type !== null && d.data_relationships_calltaskpriorityfromopens_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["calltaskpriorityfromopens"] || typeof body["data"]["relationships"]["calltaskpriorityfromopens"] !== 'object' || Array.isArray(body["data"]["relationships"]["calltaskpriorityfromopens"])) body["data"]["relationships"]["calltaskpriorityfromopens"] = {};
      if (!body["data"]["relationships"]["calltaskpriorityfromopens"]["data"] || typeof body["data"]["relationships"]["calltaskpriorityfromopens"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["calltaskpriorityfromopens"]["data"])) body["data"]["relationships"]["calltaskpriorityfromopens"]["data"] = {};
      body["data"]["relationships"]["calltaskpriorityfromopens"]["data"]["type"] = d.data_relationships_calltaskpriorityfromopens_data_type;
    }
    if (d.data_relationships_calltaskpriorityfromopens_links_related !== undefined && d.data_relationships_calltaskpriorityfromopens_links_related !== null && d.data_relationships_calltaskpriorityfromopens_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["calltaskpriorityfromopens"] || typeof body["data"]["relationships"]["calltaskpriorityfromopens"] !== 'object' || Array.isArray(body["data"]["relationships"]["calltaskpriorityfromopens"])) body["data"]["relationships"]["calltaskpriorityfromopens"] = {};
      if (!body["data"]["relationships"]["calltaskpriorityfromopens"]["links"] || typeof body["data"]["relationships"]["calltaskpriorityfromopens"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["calltaskpriorityfromopens"]["links"])) body["data"]["relationships"]["calltaskpriorityfromopens"]["links"] = {};
      body["data"]["relationships"]["calltaskpriorityfromopens"]["links"]["related"] = d.data_relationships_calltaskpriorityfromopens_links_related;
    }
    if (d.data_relationships_completedstage_data_id !== undefined && d.data_relationships_completedstage_data_id !== null && d.data_relationships_completedstage_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["completedstage"] || typeof body["data"]["relationships"]["completedstage"] !== 'object' || Array.isArray(body["data"]["relationships"]["completedstage"])) body["data"]["relationships"]["completedstage"] = {};
      if (!body["data"]["relationships"]["completedstage"]["data"] || typeof body["data"]["relationships"]["completedstage"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["completedstage"]["data"])) body["data"]["relationships"]["completedstage"]["data"] = {};
      body["data"]["relationships"]["completedstage"]["data"]["id"] = d.data_relationships_completedstage_data_id;
    }
    if (d.data_relationships_completedstage_data_type !== undefined && d.data_relationships_completedstage_data_type !== null && d.data_relationships_completedstage_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["completedstage"] || typeof body["data"]["relationships"]["completedstage"] !== 'object' || Array.isArray(body["data"]["relationships"]["completedstage"])) body["data"]["relationships"]["completedstage"] = {};
      if (!body["data"]["relationships"]["completedstage"]["data"] || typeof body["data"]["relationships"]["completedstage"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["completedstage"]["data"])) body["data"]["relationships"]["completedstage"]["data"] = {};
      body["data"]["relationships"]["completedstage"]["data"]["type"] = d.data_relationships_completedstage_data_type;
    }
    if (d.data_relationships_completedstage_links_related !== undefined && d.data_relationships_completedstage_links_related !== null && d.data_relationships_completedstage_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["completedstage"] || typeof body["data"]["relationships"]["completedstage"] !== 'object' || Array.isArray(body["data"]["relationships"]["completedstage"])) body["data"]["relationships"]["completedstage"] = {};
      if (!body["data"]["relationships"]["completedstage"]["links"] || typeof body["data"]["relationships"]["completedstage"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["completedstage"]["links"])) body["data"]["relationships"]["completedstage"]["links"] = {};
      body["data"]["relationships"]["completedstage"]["links"]["related"] = d.data_relationships_completedstage_links_related;
    }
    if (d.data_relationships_deliveredstage_data_id !== undefined && d.data_relationships_deliveredstage_data_id !== null && d.data_relationships_deliveredstage_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["deliveredstage"] || typeof body["data"]["relationships"]["deliveredstage"] !== 'object' || Array.isArray(body["data"]["relationships"]["deliveredstage"])) body["data"]["relationships"]["deliveredstage"] = {};
      if (!body["data"]["relationships"]["deliveredstage"]["data"] || typeof body["data"]["relationships"]["deliveredstage"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["deliveredstage"]["data"])) body["data"]["relationships"]["deliveredstage"]["data"] = {};
      body["data"]["relationships"]["deliveredstage"]["data"]["id"] = d.data_relationships_deliveredstage_data_id;
    }
    if (d.data_relationships_deliveredstage_data_type !== undefined && d.data_relationships_deliveredstage_data_type !== null && d.data_relationships_deliveredstage_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["deliveredstage"] || typeof body["data"]["relationships"]["deliveredstage"] !== 'object' || Array.isArray(body["data"]["relationships"]["deliveredstage"])) body["data"]["relationships"]["deliveredstage"] = {};
      if (!body["data"]["relationships"]["deliveredstage"]["data"] || typeof body["data"]["relationships"]["deliveredstage"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["deliveredstage"]["data"])) body["data"]["relationships"]["deliveredstage"]["data"] = {};
      body["data"]["relationships"]["deliveredstage"]["data"]["type"] = d.data_relationships_deliveredstage_data_type;
    }
    if (d.data_relationships_deliveredstage_links_related !== undefined && d.data_relationships_deliveredstage_links_related !== null && d.data_relationships_deliveredstage_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["deliveredstage"] || typeof body["data"]["relationships"]["deliveredstage"] !== 'object' || Array.isArray(body["data"]["relationships"]["deliveredstage"])) body["data"]["relationships"]["deliveredstage"] = {};
      if (!body["data"]["relationships"]["deliveredstage"]["links"] || typeof body["data"]["relationships"]["deliveredstage"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["deliveredstage"]["links"])) body["data"]["relationships"]["deliveredstage"]["links"] = {};
      body["data"]["relationships"]["deliveredstage"]["links"]["related"] = d.data_relationships_deliveredstage_links_related;
    }
    if (d.data_relationships_finishedstage_data_id !== undefined && d.data_relationships_finishedstage_data_id !== null && d.data_relationships_finishedstage_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["finishedstage"] || typeof body["data"]["relationships"]["finishedstage"] !== 'object' || Array.isArray(body["data"]["relationships"]["finishedstage"])) body["data"]["relationships"]["finishedstage"] = {};
      if (!body["data"]["relationships"]["finishedstage"]["data"] || typeof body["data"]["relationships"]["finishedstage"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["finishedstage"]["data"])) body["data"]["relationships"]["finishedstage"]["data"] = {};
      body["data"]["relationships"]["finishedstage"]["data"]["id"] = d.data_relationships_finishedstage_data_id;
    }
    if (d.data_relationships_finishedstage_data_type !== undefined && d.data_relationships_finishedstage_data_type !== null && d.data_relationships_finishedstage_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["finishedstage"] || typeof body["data"]["relationships"]["finishedstage"] !== 'object' || Array.isArray(body["data"]["relationships"]["finishedstage"])) body["data"]["relationships"]["finishedstage"] = {};
      if (!body["data"]["relationships"]["finishedstage"]["data"] || typeof body["data"]["relationships"]["finishedstage"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["finishedstage"]["data"])) body["data"]["relationships"]["finishedstage"]["data"] = {};
      body["data"]["relationships"]["finishedstage"]["data"]["type"] = d.data_relationships_finishedstage_data_type;
    }
    if (d.data_relationships_finishedstage_links_related !== undefined && d.data_relationships_finishedstage_links_related !== null && d.data_relationships_finishedstage_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["finishedstage"] || typeof body["data"]["relationships"]["finishedstage"] !== 'object' || Array.isArray(body["data"]["relationships"]["finishedstage"])) body["data"]["relationships"]["finishedstage"] = {};
      if (!body["data"]["relationships"]["finishedstage"]["links"] || typeof body["data"]["relationships"]["finishedstage"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["finishedstage"]["links"])) body["data"]["relationships"]["finishedstage"]["links"] = {};
      body["data"]["relationships"]["finishedstage"]["links"]["related"] = d.data_relationships_finishedstage_links_related;
    }
    if (d.data_relationships_optedoutstage_data_id !== undefined && d.data_relationships_optedoutstage_data_id !== null && d.data_relationships_optedoutstage_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["optedoutstage"] || typeof body["data"]["relationships"]["optedoutstage"] !== 'object' || Array.isArray(body["data"]["relationships"]["optedoutstage"])) body["data"]["relationships"]["optedoutstage"] = {};
      if (!body["data"]["relationships"]["optedoutstage"]["data"] || typeof body["data"]["relationships"]["optedoutstage"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["optedoutstage"]["data"])) body["data"]["relationships"]["optedoutstage"]["data"] = {};
      body["data"]["relationships"]["optedoutstage"]["data"]["id"] = d.data_relationships_optedoutstage_data_id;
    }
    if (d.data_relationships_optedoutstage_data_type !== undefined && d.data_relationships_optedoutstage_data_type !== null && d.data_relationships_optedoutstage_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["optedoutstage"] || typeof body["data"]["relationships"]["optedoutstage"] !== 'object' || Array.isArray(body["data"]["relationships"]["optedoutstage"])) body["data"]["relationships"]["optedoutstage"] = {};
      if (!body["data"]["relationships"]["optedoutstage"]["data"] || typeof body["data"]["relationships"]["optedoutstage"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["optedoutstage"]["data"])) body["data"]["relationships"]["optedoutstage"]["data"] = {};
      body["data"]["relationships"]["optedoutstage"]["data"]["type"] = d.data_relationships_optedoutstage_data_type;
    }
    if (d.data_relationships_optedoutstage_links_related !== undefined && d.data_relationships_optedoutstage_links_related !== null && d.data_relationships_optedoutstage_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["optedoutstage"] || typeof body["data"]["relationships"]["optedoutstage"] !== 'object' || Array.isArray(body["data"]["relationships"]["optedoutstage"])) body["data"]["relationships"]["optedoutstage"] = {};
      if (!body["data"]["relationships"]["optedoutstage"]["links"] || typeof body["data"]["relationships"]["optedoutstage"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["optedoutstage"]["links"])) body["data"]["relationships"]["optedoutstage"]["links"] = {};
      body["data"]["relationships"]["optedoutstage"]["links"]["related"] = d.data_relationships_optedoutstage_links_related;
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
    if (d.data_relationships_repliedstage_data_id !== undefined && d.data_relationships_repliedstage_data_id !== null && d.data_relationships_repliedstage_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["repliedstage"] || typeof body["data"]["relationships"]["repliedstage"] !== 'object' || Array.isArray(body["data"]["relationships"]["repliedstage"])) body["data"]["relationships"]["repliedstage"] = {};
      if (!body["data"]["relationships"]["repliedstage"]["data"] || typeof body["data"]["relationships"]["repliedstage"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["repliedstage"]["data"])) body["data"]["relationships"]["repliedstage"]["data"] = {};
      body["data"]["relationships"]["repliedstage"]["data"]["id"] = d.data_relationships_repliedstage_data_id;
    }
    if (d.data_relationships_repliedstage_data_type !== undefined && d.data_relationships_repliedstage_data_type !== null && d.data_relationships_repliedstage_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["repliedstage"] || typeof body["data"]["relationships"]["repliedstage"] !== 'object' || Array.isArray(body["data"]["relationships"]["repliedstage"])) body["data"]["relationships"]["repliedstage"] = {};
      if (!body["data"]["relationships"]["repliedstage"]["data"] || typeof body["data"]["relationships"]["repliedstage"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["repliedstage"]["data"])) body["data"]["relationships"]["repliedstage"]["data"] = {};
      body["data"]["relationships"]["repliedstage"]["data"]["type"] = d.data_relationships_repliedstage_data_type;
    }
    if (d.data_relationships_repliedstage_links_related !== undefined && d.data_relationships_repliedstage_links_related !== null && d.data_relationships_repliedstage_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["repliedstage"] || typeof body["data"]["relationships"]["repliedstage"] !== 'object' || Array.isArray(body["data"]["relationships"]["repliedstage"])) body["data"]["relationships"]["repliedstage"] = {};
      if (!body["data"]["relationships"]["repliedstage"]["links"] || typeof body["data"]["relationships"]["repliedstage"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["repliedstage"]["links"])) body["data"]["relationships"]["repliedstage"]["links"] = {};
      body["data"]["relationships"]["repliedstage"]["links"]["related"] = d.data_relationships_repliedstage_links_related;
    }
    if (d.data_relationships_sequences_links_related !== undefined && d.data_relationships_sequences_links_related !== null && d.data_relationships_sequences_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["sequences"] || typeof body["data"]["relationships"]["sequences"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequences"])) body["data"]["relationships"]["sequences"] = {};
      if (!body["data"]["relationships"]["sequences"]["links"] || typeof body["data"]["relationships"]["sequences"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequences"]["links"])) body["data"]["relationships"]["sequences"]["links"] = {};
      body["data"]["relationships"]["sequences"]["links"]["related"] = d.data_relationships_sequences_links_related;
    }
    if (d.data_relationships_startedstage_data_id !== undefined && d.data_relationships_startedstage_data_id !== null && d.data_relationships_startedstage_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["startedstage"] || typeof body["data"]["relationships"]["startedstage"] !== 'object' || Array.isArray(body["data"]["relationships"]["startedstage"])) body["data"]["relationships"]["startedstage"] = {};
      if (!body["data"]["relationships"]["startedstage"]["data"] || typeof body["data"]["relationships"]["startedstage"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["startedstage"]["data"])) body["data"]["relationships"]["startedstage"]["data"] = {};
      body["data"]["relationships"]["startedstage"]["data"]["id"] = d.data_relationships_startedstage_data_id;
    }
    if (d.data_relationships_startedstage_data_type !== undefined && d.data_relationships_startedstage_data_type !== null && d.data_relationships_startedstage_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["startedstage"] || typeof body["data"]["relationships"]["startedstage"] !== 'object' || Array.isArray(body["data"]["relationships"]["startedstage"])) body["data"]["relationships"]["startedstage"] = {};
      if (!body["data"]["relationships"]["startedstage"]["data"] || typeof body["data"]["relationships"]["startedstage"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["startedstage"]["data"])) body["data"]["relationships"]["startedstage"]["data"] = {};
      body["data"]["relationships"]["startedstage"]["data"]["type"] = d.data_relationships_startedstage_data_type;
    }
    if (d.data_relationships_startedstage_links_related !== undefined && d.data_relationships_startedstage_links_related !== null && d.data_relationships_startedstage_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["startedstage"] || typeof body["data"]["relationships"]["startedstage"] !== 'object' || Array.isArray(body["data"]["relationships"]["startedstage"])) body["data"]["relationships"]["startedstage"] = {};
      if (!body["data"]["relationships"]["startedstage"]["links"] || typeof body["data"]["relationships"]["startedstage"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["startedstage"]["links"])) body["data"]["relationships"]["startedstage"]["links"] = {};
      body["data"]["relationships"]["startedstage"]["links"]["related"] = d.data_relationships_startedstage_links_related;
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

