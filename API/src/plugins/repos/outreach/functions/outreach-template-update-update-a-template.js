const { utils } = require('./utils');

module.exports = {
  async outreach_template_update_update_a_template(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/templates/{id}";
    const id = String(d.id || '').trim();
    if (!id) return { ok: false, error: 'id requis.' };
    reqPath = reqPath.replace('{id}', encodeURIComponent(id));

    const query = {};

    const headers = {};

    const body = {};
    if (d.data_attributes_archived !== undefined && d.data_attributes_archived !== null && d.data_attributes_archived !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["archived"] = d.data_attributes_archived;
    }
    if (d.data_attributes_archivedat !== undefined && d.data_attributes_archivedat !== null && d.data_attributes_archivedat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["archivedat"] = d.data_attributes_archivedat;
    }
    if (d.data_attributes_bccrecipients !== undefined && d.data_attributes_bccrecipients !== null && d.data_attributes_bccrecipients !== '') {
      body["data_attributes_bccrecipients"] = d.data_attributes_bccrecipients;
    }
    if (d.data_attributes_bodyhtml !== undefined && d.data_attributes_bodyhtml !== null && d.data_attributes_bodyhtml !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["bodyhtml"] = d.data_attributes_bodyhtml;
    }
    if (d.data_attributes_bodytext !== undefined && d.data_attributes_bodytext !== null && d.data_attributes_bodytext !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["bodytext"] = d.data_attributes_bodytext;
    }
    if (d.data_attributes_bouncecount !== undefined && d.data_attributes_bouncecount !== null && d.data_attributes_bouncecount !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["bouncecount"] = d.data_attributes_bouncecount;
    }
    if (d.data_attributes_ccrecipients !== undefined && d.data_attributes_ccrecipients !== null && d.data_attributes_ccrecipients !== '') {
      body["data_attributes_ccrecipients"] = d.data_attributes_ccrecipients;
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
    if (d.data_attributes_failurecount !== undefined && d.data_attributes_failurecount !== null && d.data_attributes_failurecount !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["failurecount"] = d.data_attributes_failurecount;
    }
    if (d.data_attributes_lastusedat !== undefined && d.data_attributes_lastusedat !== null && d.data_attributes_lastusedat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["lastusedat"] = d.data_attributes_lastusedat;
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
    if (d.data_attributes_sharetype !== undefined && d.data_attributes_sharetype !== null && d.data_attributes_sharetype !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["sharetype"] = d.data_attributes_sharetype;
    }
    if (d.data_attributes_subject !== undefined && d.data_attributes_subject !== null && d.data_attributes_subject !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["subject"] = d.data_attributes_subject;
    }
    if (d.data_attributes_tags !== undefined && d.data_attributes_tags !== null && d.data_attributes_tags !== '') {
      body["data_attributes_tags"] = d.data_attributes_tags;
    }
    if (d.data_attributes_torecipients !== undefined && d.data_attributes_torecipients !== null && d.data_attributes_torecipients !== '') {
      body["data_attributes_torecipients"] = d.data_attributes_torecipients;
    }
    if (d.data_attributes_tracklinks !== undefined && d.data_attributes_tracklinks !== null && d.data_attributes_tracklinks !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["tracklinks"] = d.data_attributes_tracklinks;
    }
    if (d.data_attributes_trackopens !== undefined && d.data_attributes_trackopens !== null && d.data_attributes_trackopens !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["trackopens"] = d.data_attributes_trackopens;
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
    if (d.data_relationships_attachments_data !== undefined && d.data_relationships_attachments_data !== null && d.data_relationships_attachments_data !== '') {
      body["data_relationships_attachments_data"] = d.data_relationships_attachments_data;
    }
    if (d.data_relationships_attachments_links_related !== undefined && d.data_relationships_attachments_links_related !== null && d.data_relationships_attachments_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["attachments"] || typeof body["data"]["relationships"]["attachments"] !== 'object' || Array.isArray(body["data"]["relationships"]["attachments"])) body["data"]["relationships"]["attachments"] = {};
      if (!body["data"]["relationships"]["attachments"]["links"] || typeof body["data"]["relationships"]["attachments"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["attachments"]["links"])) body["data"]["relationships"]["attachments"]["links"] = {};
      body["data"]["relationships"]["attachments"]["links"]["related"] = d.data_relationships_attachments_links_related;
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
    if (d.data_relationships_favorites_data !== undefined && d.data_relationships_favorites_data !== null && d.data_relationships_favorites_data !== '') {
      body["data_relationships_favorites_data"] = d.data_relationships_favorites_data;
    }
    if (d.data_relationships_favorites_links_related !== undefined && d.data_relationships_favorites_links_related !== null && d.data_relationships_favorites_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["favorites"] || typeof body["data"]["relationships"]["favorites"] !== 'object' || Array.isArray(body["data"]["relationships"]["favorites"])) body["data"]["relationships"]["favorites"] = {};
      if (!body["data"]["relationships"]["favorites"]["links"] || typeof body["data"]["relationships"]["favorites"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["favorites"]["links"])) body["data"]["relationships"]["favorites"]["links"] = {};
      body["data"]["relationships"]["favorites"]["links"]["related"] = d.data_relationships_favorites_links_related;
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
    if (d.data_relationships_recipients_data !== undefined && d.data_relationships_recipients_data !== null && d.data_relationships_recipients_data !== '') {
      body["data_relationships_recipients_data"] = d.data_relationships_recipients_data;
    }
    if (d.data_relationships_recipients_links_related !== undefined && d.data_relationships_recipients_links_related !== null && d.data_relationships_recipients_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["recipients"] || typeof body["data"]["relationships"]["recipients"] !== 'object' || Array.isArray(body["data"]["relationships"]["recipients"])) body["data"]["relationships"]["recipients"] = {};
      if (!body["data"]["relationships"]["recipients"]["links"] || typeof body["data"]["relationships"]["recipients"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["recipients"]["links"])) body["data"]["relationships"]["recipients"]["links"] = {};
      body["data"]["relationships"]["recipients"]["links"]["related"] = d.data_relationships_recipients_links_related;
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
    if (d.data_relationships_statstarget_data_id !== undefined && d.data_relationships_statstarget_data_id !== null && d.data_relationships_statstarget_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["statstarget"] || typeof body["data"]["relationships"]["statstarget"] !== 'object' || Array.isArray(body["data"]["relationships"]["statstarget"])) body["data"]["relationships"]["statstarget"] = {};
      if (!body["data"]["relationships"]["statstarget"]["data"] || typeof body["data"]["relationships"]["statstarget"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["statstarget"]["data"])) body["data"]["relationships"]["statstarget"]["data"] = {};
      body["data"]["relationships"]["statstarget"]["data"]["id"] = d.data_relationships_statstarget_data_id;
    }
    if (d.data_relationships_statstarget_data_type !== undefined && d.data_relationships_statstarget_data_type !== null && d.data_relationships_statstarget_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["statstarget"] || typeof body["data"]["relationships"]["statstarget"] !== 'object' || Array.isArray(body["data"]["relationships"]["statstarget"])) body["data"]["relationships"]["statstarget"] = {};
      if (!body["data"]["relationships"]["statstarget"]["data"] || typeof body["data"]["relationships"]["statstarget"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["statstarget"]["data"])) body["data"]["relationships"]["statstarget"]["data"] = {};
      body["data"]["relationships"]["statstarget"]["data"]["type"] = d.data_relationships_statstarget_data_type;
    }
    if (d.data_relationships_statstarget_links_related !== undefined && d.data_relationships_statstarget_links_related !== null && d.data_relationships_statstarget_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["statstarget"] || typeof body["data"]["relationships"]["statstarget"] !== 'object' || Array.isArray(body["data"]["relationships"]["statstarget"])) body["data"]["relationships"]["statstarget"] = {};
      if (!body["data"]["relationships"]["statstarget"]["links"] || typeof body["data"]["relationships"]["statstarget"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["statstarget"]["links"])) body["data"]["relationships"]["statstarget"]["links"] = {};
      body["data"]["relationships"]["statstarget"]["links"]["related"] = d.data_relationships_statstarget_links_related;
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

