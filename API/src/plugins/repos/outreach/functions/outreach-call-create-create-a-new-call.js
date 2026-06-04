const { utils } = require('./utils');

module.exports = {
  async outreach_call_create_create_a_new_call(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/calls";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.data_attributes_answeredat !== undefined && d.data_attributes_answeredat !== null && d.data_attributes_answeredat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["answeredat"] = d.data_attributes_answeredat;
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
    if (d.data_attributes_dialedat !== undefined && d.data_attributes_dialedat !== null && d.data_attributes_dialedat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["dialedat"] = d.data_attributes_dialedat;
    }
    if (d.data_attributes_direction !== undefined && d.data_attributes_direction !== null && d.data_attributes_direction !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["direction"] = d.data_attributes_direction;
    }
    if (d.data_attributes_externalvendor !== undefined && d.data_attributes_externalvendor !== null && d.data_attributes_externalvendor !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["externalvendor"] = d.data_attributes_externalvendor;
    }
    if (d.data_attributes_from !== undefined && d.data_attributes_from !== null && d.data_attributes_from !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["from"] = d.data_attributes_from;
    }
    if (d.data_attributes_note !== undefined && d.data_attributes_note !== null && d.data_attributes_note !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["note"] = d.data_attributes_note;
    }
    if (d.data_attributes_outcome !== undefined && d.data_attributes_outcome !== null && d.data_attributes_outcome !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["outcome"] = d.data_attributes_outcome;
    }
    if (d.data_attributes_recordingurl !== undefined && d.data_attributes_recordingurl !== null && d.data_attributes_recordingurl !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["recordingurl"] = d.data_attributes_recordingurl;
    }
    if (d.data_attributes_returnedat !== undefined && d.data_attributes_returnedat !== null && d.data_attributes_returnedat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["returnedat"] = d.data_attributes_returnedat;
    }
    if (d.data_attributes_sequenceaction !== undefined && d.data_attributes_sequenceaction !== null && d.data_attributes_sequenceaction !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["sequenceaction"] = d.data_attributes_sequenceaction;
    }
    if (d.data_attributes_shouldrecordcall !== undefined && d.data_attributes_shouldrecordcall !== null && d.data_attributes_shouldrecordcall !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["shouldrecordcall"] = d.data_attributes_shouldrecordcall;
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
    if (d.data_attributes_tags !== undefined && d.data_attributes_tags !== null && d.data_attributes_tags !== '') {
      body["data_attributes_tags"] = d.data_attributes_tags;
    }
    if (d.data_attributes_to !== undefined && d.data_attributes_to !== null && d.data_attributes_to !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["to"] = d.data_attributes_to;
    }
    if (d.data_attributes_uid !== undefined && d.data_attributes_uid !== null && d.data_attributes_uid !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["uid"] = d.data_attributes_uid;
    }
    if (d.data_attributes_updatedat !== undefined && d.data_attributes_updatedat !== null && d.data_attributes_updatedat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["updatedat"] = d.data_attributes_updatedat;
    }
    if (d.data_attributes_usercalltype !== undefined && d.data_attributes_usercalltype !== null && d.data_attributes_usercalltype !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["usercalltype"] = d.data_attributes_usercalltype;
    }
    if (d.data_attributes_vendorcallid !== undefined && d.data_attributes_vendorcallid !== null && d.data_attributes_vendorcallid !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["vendorcallid"] = d.data_attributes_vendorcallid;
    }
    if (d.data_attributes_voicemailrecordingurl !== undefined && d.data_attributes_voicemailrecordingurl !== null && d.data_attributes_voicemailrecordingurl !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["voicemailrecordingurl"] = d.data_attributes_voicemailrecordingurl;
    }
    if (d.data_relationships_associatedid_data_id !== undefined && d.data_relationships_associatedid_data_id !== null && d.data_relationships_associatedid_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["associatedid"] || typeof body["data"]["relationships"]["associatedid"] !== 'object' || Array.isArray(body["data"]["relationships"]["associatedid"])) body["data"]["relationships"]["associatedid"] = {};
      if (!body["data"]["relationships"]["associatedid"]["data"] || typeof body["data"]["relationships"]["associatedid"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["associatedid"]["data"])) body["data"]["relationships"]["associatedid"]["data"] = {};
      body["data"]["relationships"]["associatedid"]["data"]["id"] = d.data_relationships_associatedid_data_id;
    }
    if (d.data_relationships_associatedid_data_type !== undefined && d.data_relationships_associatedid_data_type !== null && d.data_relationships_associatedid_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["associatedid"] || typeof body["data"]["relationships"]["associatedid"] !== 'object' || Array.isArray(body["data"]["relationships"]["associatedid"])) body["data"]["relationships"]["associatedid"] = {};
      if (!body["data"]["relationships"]["associatedid"]["data"] || typeof body["data"]["relationships"]["associatedid"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["associatedid"]["data"])) body["data"]["relationships"]["associatedid"]["data"] = {};
      body["data"]["relationships"]["associatedid"]["data"]["type"] = d.data_relationships_associatedid_data_type;
    }
    if (d.data_relationships_associatedid_links_related !== undefined && d.data_relationships_associatedid_links_related !== null && d.data_relationships_associatedid_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["associatedid"] || typeof body["data"]["relationships"]["associatedid"] !== 'object' || Array.isArray(body["data"]["relationships"]["associatedid"])) body["data"]["relationships"]["associatedid"] = {};
      if (!body["data"]["relationships"]["associatedid"]["links"] || typeof body["data"]["relationships"]["associatedid"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["associatedid"]["links"])) body["data"]["relationships"]["associatedid"]["links"] = {};
      body["data"]["relationships"]["associatedid"]["links"]["related"] = d.data_relationships_associatedid_links_related;
    }
    if (d.data_relationships_batches_links_related !== undefined && d.data_relationships_batches_links_related !== null && d.data_relationships_batches_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["batches"] || typeof body["data"]["relationships"]["batches"] !== 'object' || Array.isArray(body["data"]["relationships"]["batches"])) body["data"]["relationships"]["batches"] = {};
      if (!body["data"]["relationships"]["batches"]["links"] || typeof body["data"]["relationships"]["batches"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["batches"]["links"])) body["data"]["relationships"]["batches"]["links"] = {};
      body["data"]["relationships"]["batches"]["links"]["related"] = d.data_relationships_batches_links_related;
    }
    if (d.data_relationships_calldisposition_data_id !== undefined && d.data_relationships_calldisposition_data_id !== null && d.data_relationships_calldisposition_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["calldisposition"] || typeof body["data"]["relationships"]["calldisposition"] !== 'object' || Array.isArray(body["data"]["relationships"]["calldisposition"])) body["data"]["relationships"]["calldisposition"] = {};
      if (!body["data"]["relationships"]["calldisposition"]["data"] || typeof body["data"]["relationships"]["calldisposition"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["calldisposition"]["data"])) body["data"]["relationships"]["calldisposition"]["data"] = {};
      body["data"]["relationships"]["calldisposition"]["data"]["id"] = d.data_relationships_calldisposition_data_id;
    }
    if (d.data_relationships_calldisposition_data_type !== undefined && d.data_relationships_calldisposition_data_type !== null && d.data_relationships_calldisposition_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["calldisposition"] || typeof body["data"]["relationships"]["calldisposition"] !== 'object' || Array.isArray(body["data"]["relationships"]["calldisposition"])) body["data"]["relationships"]["calldisposition"] = {};
      if (!body["data"]["relationships"]["calldisposition"]["data"] || typeof body["data"]["relationships"]["calldisposition"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["calldisposition"]["data"])) body["data"]["relationships"]["calldisposition"]["data"] = {};
      body["data"]["relationships"]["calldisposition"]["data"]["type"] = d.data_relationships_calldisposition_data_type;
    }
    if (d.data_relationships_calldisposition_links_related !== undefined && d.data_relationships_calldisposition_links_related !== null && d.data_relationships_calldisposition_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["calldisposition"] || typeof body["data"]["relationships"]["calldisposition"] !== 'object' || Array.isArray(body["data"]["relationships"]["calldisposition"])) body["data"]["relationships"]["calldisposition"] = {};
      if (!body["data"]["relationships"]["calldisposition"]["links"] || typeof body["data"]["relationships"]["calldisposition"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["calldisposition"]["links"])) body["data"]["relationships"]["calldisposition"]["links"] = {};
      body["data"]["relationships"]["calldisposition"]["links"]["related"] = d.data_relationships_calldisposition_links_related;
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
    if (d.data_relationships_kaiacrmrecording_data_id !== undefined && d.data_relationships_kaiacrmrecording_data_id !== null && d.data_relationships_kaiacrmrecording_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["kaiacrmrecording"] || typeof body["data"]["relationships"]["kaiacrmrecording"] !== 'object' || Array.isArray(body["data"]["relationships"]["kaiacrmrecording"])) body["data"]["relationships"]["kaiacrmrecording"] = {};
      if (!body["data"]["relationships"]["kaiacrmrecording"]["data"] || typeof body["data"]["relationships"]["kaiacrmrecording"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["kaiacrmrecording"]["data"])) body["data"]["relationships"]["kaiacrmrecording"]["data"] = {};
      body["data"]["relationships"]["kaiacrmrecording"]["data"]["id"] = d.data_relationships_kaiacrmrecording_data_id;
    }
    if (d.data_relationships_kaiacrmrecording_data_type !== undefined && d.data_relationships_kaiacrmrecording_data_type !== null && d.data_relationships_kaiacrmrecording_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["kaiacrmrecording"] || typeof body["data"]["relationships"]["kaiacrmrecording"] !== 'object' || Array.isArray(body["data"]["relationships"]["kaiacrmrecording"])) body["data"]["relationships"]["kaiacrmrecording"] = {};
      if (!body["data"]["relationships"]["kaiacrmrecording"]["data"] || typeof body["data"]["relationships"]["kaiacrmrecording"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["kaiacrmrecording"]["data"])) body["data"]["relationships"]["kaiacrmrecording"]["data"] = {};
      body["data"]["relationships"]["kaiacrmrecording"]["data"]["type"] = d.data_relationships_kaiacrmrecording_data_type;
    }
    if (d.data_relationships_kaiacrmrecording_links_related !== undefined && d.data_relationships_kaiacrmrecording_links_related !== null && d.data_relationships_kaiacrmrecording_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["kaiacrmrecording"] || typeof body["data"]["relationships"]["kaiacrmrecording"] !== 'object' || Array.isArray(body["data"]["relationships"]["kaiacrmrecording"])) body["data"]["relationships"]["kaiacrmrecording"] = {};
      if (!body["data"]["relationships"]["kaiacrmrecording"]["links"] || typeof body["data"]["relationships"]["kaiacrmrecording"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["kaiacrmrecording"]["links"])) body["data"]["relationships"]["kaiacrmrecording"]["links"] = {};
      body["data"]["relationships"]["kaiacrmrecording"]["links"]["related"] = d.data_relationships_kaiacrmrecording_links_related;
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
    if (d.data_relationships_outboundvoicemail_data_id !== undefined && d.data_relationships_outboundvoicemail_data_id !== null && d.data_relationships_outboundvoicemail_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["outboundvoicemail"] || typeof body["data"]["relationships"]["outboundvoicemail"] !== 'object' || Array.isArray(body["data"]["relationships"]["outboundvoicemail"])) body["data"]["relationships"]["outboundvoicemail"] = {};
      if (!body["data"]["relationships"]["outboundvoicemail"]["data"] || typeof body["data"]["relationships"]["outboundvoicemail"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["outboundvoicemail"]["data"])) body["data"]["relationships"]["outboundvoicemail"]["data"] = {};
      body["data"]["relationships"]["outboundvoicemail"]["data"]["id"] = d.data_relationships_outboundvoicemail_data_id;
    }
    if (d.data_relationships_outboundvoicemail_data_type !== undefined && d.data_relationships_outboundvoicemail_data_type !== null && d.data_relationships_outboundvoicemail_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["outboundvoicemail"] || typeof body["data"]["relationships"]["outboundvoicemail"] !== 'object' || Array.isArray(body["data"]["relationships"]["outboundvoicemail"])) body["data"]["relationships"]["outboundvoicemail"] = {};
      if (!body["data"]["relationships"]["outboundvoicemail"]["data"] || typeof body["data"]["relationships"]["outboundvoicemail"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["outboundvoicemail"]["data"])) body["data"]["relationships"]["outboundvoicemail"]["data"] = {};
      body["data"]["relationships"]["outboundvoicemail"]["data"]["type"] = d.data_relationships_outboundvoicemail_data_type;
    }
    if (d.data_relationships_outboundvoicemail_links_related !== undefined && d.data_relationships_outboundvoicemail_links_related !== null && d.data_relationships_outboundvoicemail_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["outboundvoicemail"] || typeof body["data"]["relationships"]["outboundvoicemail"] !== 'object' || Array.isArray(body["data"]["relationships"]["outboundvoicemail"])) body["data"]["relationships"]["outboundvoicemail"] = {};
      if (!body["data"]["relationships"]["outboundvoicemail"]["links"] || typeof body["data"]["relationships"]["outboundvoicemail"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["outboundvoicemail"]["links"])) body["data"]["relationships"]["outboundvoicemail"]["links"] = {};
      body["data"]["relationships"]["outboundvoicemail"]["links"]["related"] = d.data_relationships_outboundvoicemail_links_related;
    }
    if (d.data_relationships_phone_data_id !== undefined && d.data_relationships_phone_data_id !== null && d.data_relationships_phone_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["phone"] || typeof body["data"]["relationships"]["phone"] !== 'object' || Array.isArray(body["data"]["relationships"]["phone"])) body["data"]["relationships"]["phone"] = {};
      if (!body["data"]["relationships"]["phone"]["data"] || typeof body["data"]["relationships"]["phone"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["phone"]["data"])) body["data"]["relationships"]["phone"]["data"] = {};
      body["data"]["relationships"]["phone"]["data"]["id"] = d.data_relationships_phone_data_id;
    }
    if (d.data_relationships_phone_data_type !== undefined && d.data_relationships_phone_data_type !== null && d.data_relationships_phone_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["phone"] || typeof body["data"]["relationships"]["phone"] !== 'object' || Array.isArray(body["data"]["relationships"]["phone"])) body["data"]["relationships"]["phone"] = {};
      if (!body["data"]["relationships"]["phone"]["data"] || typeof body["data"]["relationships"]["phone"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["phone"]["data"])) body["data"]["relationships"]["phone"]["data"] = {};
      body["data"]["relationships"]["phone"]["data"]["type"] = d.data_relationships_phone_data_type;
    }
    if (d.data_relationships_phone_links_related !== undefined && d.data_relationships_phone_links_related !== null && d.data_relationships_phone_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["phone"] || typeof body["data"]["relationships"]["phone"] !== 'object' || Array.isArray(body["data"]["relationships"]["phone"])) body["data"]["relationships"]["phone"] = {};
      if (!body["data"]["relationships"]["phone"]["links"] || typeof body["data"]["relationships"]["phone"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["phone"]["links"])) body["data"]["relationships"]["phone"]["links"] = {};
      body["data"]["relationships"]["phone"]["links"]["related"] = d.data_relationships_phone_links_related;
    }
    if (d.data_relationships_phonenumber_data_id !== undefined && d.data_relationships_phonenumber_data_id !== null && d.data_relationships_phonenumber_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["phonenumber"] || typeof body["data"]["relationships"]["phonenumber"] !== 'object' || Array.isArray(body["data"]["relationships"]["phonenumber"])) body["data"]["relationships"]["phonenumber"] = {};
      if (!body["data"]["relationships"]["phonenumber"]["data"] || typeof body["data"]["relationships"]["phonenumber"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["phonenumber"]["data"])) body["data"]["relationships"]["phonenumber"]["data"] = {};
      body["data"]["relationships"]["phonenumber"]["data"]["id"] = d.data_relationships_phonenumber_data_id;
    }
    if (d.data_relationships_phonenumber_data_type !== undefined && d.data_relationships_phonenumber_data_type !== null && d.data_relationships_phonenumber_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["phonenumber"] || typeof body["data"]["relationships"]["phonenumber"] !== 'object' || Array.isArray(body["data"]["relationships"]["phonenumber"])) body["data"]["relationships"]["phonenumber"] = {};
      if (!body["data"]["relationships"]["phonenumber"]["data"] || typeof body["data"]["relationships"]["phonenumber"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["phonenumber"]["data"])) body["data"]["relationships"]["phonenumber"]["data"] = {};
      body["data"]["relationships"]["phonenumber"]["data"]["type"] = d.data_relationships_phonenumber_data_type;
    }
    if (d.data_relationships_phonenumber_links_related !== undefined && d.data_relationships_phonenumber_links_related !== null && d.data_relationships_phonenumber_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["phonenumber"] || typeof body["data"]["relationships"]["phonenumber"] !== 'object' || Array.isArray(body["data"]["relationships"]["phonenumber"])) body["data"]["relationships"]["phonenumber"] = {};
      if (!body["data"]["relationships"]["phonenumber"]["links"] || typeof body["data"]["relationships"]["phonenumber"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["phonenumber"]["links"])) body["data"]["relationships"]["phonenumber"]["links"] = {};
      body["data"]["relationships"]["phonenumber"]["links"]["related"] = d.data_relationships_phonenumber_links_related;
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
    if (d.data_relationships_task_data_id !== undefined && d.data_relationships_task_data_id !== null && d.data_relationships_task_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["task"] || typeof body["data"]["relationships"]["task"] !== 'object' || Array.isArray(body["data"]["relationships"]["task"])) body["data"]["relationships"]["task"] = {};
      if (!body["data"]["relationships"]["task"]["data"] || typeof body["data"]["relationships"]["task"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["task"]["data"])) body["data"]["relationships"]["task"]["data"] = {};
      body["data"]["relationships"]["task"]["data"]["id"] = d.data_relationships_task_data_id;
    }
    if (d.data_relationships_task_data_type !== undefined && d.data_relationships_task_data_type !== null && d.data_relationships_task_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["task"] || typeof body["data"]["relationships"]["task"] !== 'object' || Array.isArray(body["data"]["relationships"]["task"])) body["data"]["relationships"]["task"] = {};
      if (!body["data"]["relationships"]["task"]["data"] || typeof body["data"]["relationships"]["task"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["task"]["data"])) body["data"]["relationships"]["task"]["data"] = {};
      body["data"]["relationships"]["task"]["data"]["type"] = d.data_relationships_task_data_type;
    }
    if (d.data_relationships_task_links_related !== undefined && d.data_relationships_task_links_related !== null && d.data_relationships_task_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["task"] || typeof body["data"]["relationships"]["task"] !== 'object' || Array.isArray(body["data"]["relationships"]["task"])) body["data"]["relationships"]["task"] = {};
      if (!body["data"]["relationships"]["task"]["links"] || typeof body["data"]["relationships"]["task"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["task"]["links"])) body["data"]["relationships"]["task"]["links"] = {};
      body["data"]["relationships"]["task"]["links"]["related"] = d.data_relationships_task_links_related;
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

