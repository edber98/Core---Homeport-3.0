const { utils } = require('./utils');

module.exports = {
  async outreach_mailing_create_create_a_new_mailing(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/mailings";
    

    const query = {};

    const headers = {};

    const body = {};
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
    if (d.data_attributes_bouncedat !== undefined && d.data_attributes_bouncedat !== null && d.data_attributes_bouncedat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["bouncedat"] = d.data_attributes_bouncedat;
    }
    if (d.data_attributes_clickcount !== undefined && d.data_attributes_clickcount !== null && d.data_attributes_clickcount !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["clickcount"] = d.data_attributes_clickcount;
    }
    if (d.data_attributes_clickedat !== undefined && d.data_attributes_clickedat !== null && d.data_attributes_clickedat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["clickedat"] = d.data_attributes_clickedat;
    }
    if (d.data_attributes_createdat !== undefined && d.data_attributes_createdat !== null && d.data_attributes_createdat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["createdat"] = d.data_attributes_createdat;
    }
    if (d.data_attributes_deliveredat !== undefined && d.data_attributes_deliveredat !== null && d.data_attributes_deliveredat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["deliveredat"] = d.data_attributes_deliveredat;
    }
    if (d.data_attributes_errorbacktrace !== undefined && d.data_attributes_errorbacktrace !== null && d.data_attributes_errorbacktrace !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["errorbacktrace"] = d.data_attributes_errorbacktrace;
    }
    if (d.data_attributes_errorreason !== undefined && d.data_attributes_errorreason !== null && d.data_attributes_errorreason !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["errorreason"] = d.data_attributes_errorreason;
    }
    if (d.data_attributes_followuptaskscheduledat !== undefined && d.data_attributes_followuptaskscheduledat !== null && d.data_attributes_followuptaskscheduledat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["followuptaskscheduledat"] = d.data_attributes_followuptaskscheduledat;
    }
    if (d.data_attributes_followuptasktype !== undefined && d.data_attributes_followuptasktype !== null && d.data_attributes_followuptasktype !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["followuptasktype"] = d.data_attributes_followuptasktype;
    }
    if (d.data_attributes_mailboxaddress !== undefined && d.data_attributes_mailboxaddress !== null && d.data_attributes_mailboxaddress !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["mailboxaddress"] = d.data_attributes_mailboxaddress;
    }
    if (d.data_attributes_mailingtype !== undefined && d.data_attributes_mailingtype !== null && d.data_attributes_mailingtype !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["mailingtype"] = d.data_attributes_mailingtype;
    }
    if (d.data_attributes_markedasspamat !== undefined && d.data_attributes_markedasspamat !== null && d.data_attributes_markedasspamat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["markedasspamat"] = d.data_attributes_markedasspamat;
    }
    if (d.data_attributes_messageid !== undefined && d.data_attributes_messageid !== null && d.data_attributes_messageid !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["messageid"] = d.data_attributes_messageid;
    }
    if (d.data_attributes_notifythreadcondition !== undefined && d.data_attributes_notifythreadcondition !== null && d.data_attributes_notifythreadcondition !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["notifythreadcondition"] = d.data_attributes_notifythreadcondition;
    }
    if (d.data_attributes_notifythreadscheduledat !== undefined && d.data_attributes_notifythreadscheduledat !== null && d.data_attributes_notifythreadscheduledat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["notifythreadscheduledat"] = d.data_attributes_notifythreadscheduledat;
    }
    if (d.data_attributes_notifythreadstatus !== undefined && d.data_attributes_notifythreadstatus !== null && d.data_attributes_notifythreadstatus !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["notifythreadstatus"] = d.data_attributes_notifythreadstatus;
    }
    if (d.data_attributes_opencount !== undefined && d.data_attributes_opencount !== null && d.data_attributes_opencount !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["opencount"] = d.data_attributes_opencount;
    }
    if (d.data_attributes_openedat !== undefined && d.data_attributes_openedat !== null && d.data_attributes_openedat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["openedat"] = d.data_attributes_openedat;
    }
    if (d.data_attributes_overridesafetysettings !== undefined && d.data_attributes_overridesafetysettings !== null && d.data_attributes_overridesafetysettings !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["overridesafetysettings"] = d.data_attributes_overridesafetysettings;
    }
    if (d.data_attributes_references !== undefined && d.data_attributes_references !== null && d.data_attributes_references !== '') {
      body["data_attributes_references"] = d.data_attributes_references;
    }
    if (d.data_attributes_repliedat !== undefined && d.data_attributes_repliedat !== null && d.data_attributes_repliedat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["repliedat"] = d.data_attributes_repliedat;
    }
    if (d.data_attributes_retryat !== undefined && d.data_attributes_retryat !== null && d.data_attributes_retryat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["retryat"] = d.data_attributes_retryat;
    }
    if (d.data_attributes_retrycount !== undefined && d.data_attributes_retrycount !== null && d.data_attributes_retrycount !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["retrycount"] = d.data_attributes_retrycount;
    }
    if (d.data_attributes_retryinterval !== undefined && d.data_attributes_retryinterval !== null && d.data_attributes_retryinterval !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["retryinterval"] = d.data_attributes_retryinterval;
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
    if (d.data_attributes_subject !== undefined && d.data_attributes_subject !== null && d.data_attributes_subject !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["subject"] = d.data_attributes_subject;
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
    if (d.data_attributes_unsubscribedat !== undefined && d.data_attributes_unsubscribedat !== null && d.data_attributes_unsubscribedat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["unsubscribedat"] = d.data_attributes_unsubscribedat;
    }
    if (d.data_attributes_updatedat !== undefined && d.data_attributes_updatedat !== null && d.data_attributes_updatedat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["updatedat"] = d.data_attributes_updatedat;
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
    if (d.data_relationships_bccentitiesid !== undefined && d.data_relationships_bccentitiesid !== null && d.data_relationships_bccentitiesid !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      body["data"]["relationships"]["bccentitiesid"] = d.data_relationships_bccentitiesid;
    }
    if (d.data_relationships_calendar_data_id !== undefined && d.data_relationships_calendar_data_id !== null && d.data_relationships_calendar_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["calendar"] || typeof body["data"]["relationships"]["calendar"] !== 'object' || Array.isArray(body["data"]["relationships"]["calendar"])) body["data"]["relationships"]["calendar"] = {};
      if (!body["data"]["relationships"]["calendar"]["data"] || typeof body["data"]["relationships"]["calendar"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["calendar"]["data"])) body["data"]["relationships"]["calendar"]["data"] = {};
      body["data"]["relationships"]["calendar"]["data"]["id"] = d.data_relationships_calendar_data_id;
    }
    if (d.data_relationships_calendar_data_type !== undefined && d.data_relationships_calendar_data_type !== null && d.data_relationships_calendar_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["calendar"] || typeof body["data"]["relationships"]["calendar"] !== 'object' || Array.isArray(body["data"]["relationships"]["calendar"])) body["data"]["relationships"]["calendar"] = {};
      if (!body["data"]["relationships"]["calendar"]["data"] || typeof body["data"]["relationships"]["calendar"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["calendar"]["data"])) body["data"]["relationships"]["calendar"]["data"] = {};
      body["data"]["relationships"]["calendar"]["data"]["type"] = d.data_relationships_calendar_data_type;
    }
    if (d.data_relationships_calendar_links_related !== undefined && d.data_relationships_calendar_links_related !== null && d.data_relationships_calendar_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["calendar"] || typeof body["data"]["relationships"]["calendar"] !== 'object' || Array.isArray(body["data"]["relationships"]["calendar"])) body["data"]["relationships"]["calendar"] = {};
      if (!body["data"]["relationships"]["calendar"]["links"] || typeof body["data"]["relationships"]["calendar"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["calendar"]["links"])) body["data"]["relationships"]["calendar"]["links"] = {};
      body["data"]["relationships"]["calendar"]["links"]["related"] = d.data_relationships_calendar_links_related;
    }
    if (d.data_relationships_ccentitiesid !== undefined && d.data_relationships_ccentitiesid !== null && d.data_relationships_ccentitiesid !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      body["data"]["relationships"]["ccentitiesid"] = d.data_relationships_ccentitiesid;
    }
    if (d.data_relationships_followupsequence_data_id !== undefined && d.data_relationships_followupsequence_data_id !== null && d.data_relationships_followupsequence_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["followupsequence"] || typeof body["data"]["relationships"]["followupsequence"] !== 'object' || Array.isArray(body["data"]["relationships"]["followupsequence"])) body["data"]["relationships"]["followupsequence"] = {};
      if (!body["data"]["relationships"]["followupsequence"]["data"] || typeof body["data"]["relationships"]["followupsequence"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["followupsequence"]["data"])) body["data"]["relationships"]["followupsequence"]["data"] = {};
      body["data"]["relationships"]["followupsequence"]["data"]["id"] = d.data_relationships_followupsequence_data_id;
    }
    if (d.data_relationships_followupsequence_data_type !== undefined && d.data_relationships_followupsequence_data_type !== null && d.data_relationships_followupsequence_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["followupsequence"] || typeof body["data"]["relationships"]["followupsequence"] !== 'object' || Array.isArray(body["data"]["relationships"]["followupsequence"])) body["data"]["relationships"]["followupsequence"] = {};
      if (!body["data"]["relationships"]["followupsequence"]["data"] || typeof body["data"]["relationships"]["followupsequence"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["followupsequence"]["data"])) body["data"]["relationships"]["followupsequence"]["data"] = {};
      body["data"]["relationships"]["followupsequence"]["data"]["type"] = d.data_relationships_followupsequence_data_type;
    }
    if (d.data_relationships_followupsequence_links_related !== undefined && d.data_relationships_followupsequence_links_related !== null && d.data_relationships_followupsequence_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["followupsequence"] || typeof body["data"]["relationships"]["followupsequence"] !== 'object' || Array.isArray(body["data"]["relationships"]["followupsequence"])) body["data"]["relationships"]["followupsequence"] = {};
      if (!body["data"]["relationships"]["followupsequence"]["links"] || typeof body["data"]["relationships"]["followupsequence"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["followupsequence"]["links"])) body["data"]["relationships"]["followupsequence"]["links"] = {};
      body["data"]["relationships"]["followupsequence"]["links"]["related"] = d.data_relationships_followupsequence_links_related;
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
    if (d.data_relationships_prospectsids !== undefined && d.data_relationships_prospectsids !== null && d.data_relationships_prospectsids !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      body["data"]["relationships"]["prospectsids"] = d.data_relationships_prospectsids;
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
    if (d.data_relationships_tasks_data !== undefined && d.data_relationships_tasks_data !== null && d.data_relationships_tasks_data !== '') {
      body["data_relationships_tasks_data"] = d.data_relationships_tasks_data;
    }
    if (d.data_relationships_tasks_links_related !== undefined && d.data_relationships_tasks_links_related !== null && d.data_relationships_tasks_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["tasks"] || typeof body["data"]["relationships"]["tasks"] !== 'object' || Array.isArray(body["data"]["relationships"]["tasks"])) body["data"]["relationships"]["tasks"] = {};
      if (!body["data"]["relationships"]["tasks"]["links"] || typeof body["data"]["relationships"]["tasks"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["tasks"]["links"])) body["data"]["relationships"]["tasks"]["links"] = {};
      body["data"]["relationships"]["tasks"]["links"]["related"] = d.data_relationships_tasks_links_related;
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
    if (d.data_relationships_toentitiesid !== undefined && d.data_relationships_toentitiesid !== null && d.data_relationships_toentitiesid !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      body["data"]["relationships"]["toentitiesid"] = d.data_relationships_toentitiesid;
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

