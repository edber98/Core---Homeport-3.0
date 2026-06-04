const { utils } = require('./utils');

module.exports = {
  async outreach_user_create_create_a_new_user(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/users";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.data_attributes_accountsviewid !== undefined && d.data_attributes_accountsviewid !== null && d.data_attributes_accountsviewid !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["accountsviewid"] = d.data_attributes_accountsviewid;
    }
    if (d.data_attributes_activitynotificationsdisabled !== undefined && d.data_attributes_activitynotificationsdisabled !== null && d.data_attributes_activitynotificationsdisabled !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["activitynotificationsdisabled"] = d.data_attributes_activitynotificationsdisabled;
    }
    if (d.data_attributes_bouncewarningemailenabled !== undefined && d.data_attributes_bouncewarningemailenabled !== null && d.data_attributes_bouncewarningemailenabled !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["bouncewarningemailenabled"] = d.data_attributes_bouncewarningemailenabled;
    }
    if (d.data_attributes_bridgephone !== undefined && d.data_attributes_bridgephone !== null && d.data_attributes_bridgephone !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["bridgephone"] = d.data_attributes_bridgephone;
    }
    if (d.data_attributes_bridgephoneextension !== undefined && d.data_attributes_bridgephoneextension !== null && d.data_attributes_bridgephoneextension !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["bridgephoneextension"] = d.data_attributes_bridgephoneextension;
    }
    if (d.data_attributes_callsviewid !== undefined && d.data_attributes_callsviewid !== null && d.data_attributes_callsviewid !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["callsviewid"] = d.data_attributes_callsviewid;
    }
    if (d.data_attributes_controlledtabdefault !== undefined && d.data_attributes_controlledtabdefault !== null && d.data_attributes_controlledtabdefault !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["controlledtabdefault"] = d.data_attributes_controlledtabdefault;
    }
    if (d.data_attributes_createdat !== undefined && d.data_attributes_createdat !== null && d.data_attributes_createdat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["createdat"] = d.data_attributes_createdat;
    }
    if (d.data_attributes_currentsigninat !== undefined && d.data_attributes_currentsigninat !== null && d.data_attributes_currentsigninat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["currentsigninat"] = d.data_attributes_currentsigninat;
    }
    if (d.data_attributes_custom1 !== undefined && d.data_attributes_custom1 !== null && d.data_attributes_custom1 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom1"] = d.data_attributes_custom1;
    }
    if (d.data_attributes_custom2 !== undefined && d.data_attributes_custom2 !== null && d.data_attributes_custom2 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom2"] = d.data_attributes_custom2;
    }
    if (d.data_attributes_custom3 !== undefined && d.data_attributes_custom3 !== null && d.data_attributes_custom3 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom3"] = d.data_attributes_custom3;
    }
    if (d.data_attributes_custom4 !== undefined && d.data_attributes_custom4 !== null && d.data_attributes_custom4 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom4"] = d.data_attributes_custom4;
    }
    if (d.data_attributes_custom5 !== undefined && d.data_attributes_custom5 !== null && d.data_attributes_custom5 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom5"] = d.data_attributes_custom5;
    }
    if (d.data_attributes_dailydigestemailenabled !== undefined && d.data_attributes_dailydigestemailenabled !== null && d.data_attributes_dailydigestemailenabled !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["dailydigestemailenabled"] = d.data_attributes_dailydigestemailenabled;
    }
    if (d.data_attributes_defaultrulesetid !== undefined && d.data_attributes_defaultrulesetid !== null && d.data_attributes_defaultrulesetid !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["defaultrulesetid"] = d.data_attributes_defaultrulesetid;
    }
    if (d.data_attributes_duties !== undefined && d.data_attributes_duties !== null && d.data_attributes_duties !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["duties"] = d.data_attributes_duties;
    }
    if (d.data_attributes_email !== undefined && d.data_attributes_email !== null && d.data_attributes_email !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["email"] = d.data_attributes_email;
    }
    if (d.data_attributes_enablevoicerecordings !== undefined && d.data_attributes_enablevoicerecordings !== null && d.data_attributes_enablevoicerecordings !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["enablevoicerecordings"] = d.data_attributes_enablevoicerecordings;
    }
    if (d.data_attributes_engagementemailsenabled !== undefined && d.data_attributes_engagementemailsenabled !== null && d.data_attributes_engagementemailsenabled !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["engagementemailsenabled"] = d.data_attributes_engagementemailsenabled;
    }
    if (d.data_attributes_firstname !== undefined && d.data_attributes_firstname !== null && d.data_attributes_firstname !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["firstname"] = d.data_attributes_firstname;
    }
    if (d.data_attributes_inboundbridgephone !== undefined && d.data_attributes_inboundbridgephone !== null && d.data_attributes_inboundbridgephone !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["inboundbridgephone"] = d.data_attributes_inboundbridgephone;
    }
    if (d.data_attributes_inboundbridgephoneextension !== undefined && d.data_attributes_inboundbridgephoneextension !== null && d.data_attributes_inboundbridgephoneextension !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["inboundbridgephoneextension"] = d.data_attributes_inboundbridgephoneextension;
    }
    if (d.data_attributes_inboundcallbehavior !== undefined && d.data_attributes_inboundcallbehavior !== null && d.data_attributes_inboundcallbehavior !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["inboundcallbehavior"] = d.data_attributes_inboundcallbehavior;
    }
    if (d.data_attributes_inboundphonetype !== undefined && d.data_attributes_inboundphonetype !== null && d.data_attributes_inboundphonetype !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["inboundphonetype"] = d.data_attributes_inboundphonetype;
    }
    if (d.data_attributes_inboundvoicemailcustommessagetext !== undefined && d.data_attributes_inboundvoicemailcustommessagetext !== null && d.data_attributes_inboundvoicemailcustommessagetext !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["inboundvoicemailcustommessagetext"] = d.data_attributes_inboundvoicemailcustommessagetext;
    }
    if (d.data_attributes_inboundvoicemailmessagetextvoice !== undefined && d.data_attributes_inboundvoicemailmessagetextvoice !== null && d.data_attributes_inboundvoicemailmessagetextvoice !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["inboundvoicemailmessagetextvoice"] = d.data_attributes_inboundvoicemailmessagetextvoice;
    }
    if (d.data_attributes_inboundvoicemailprompttype !== undefined && d.data_attributes_inboundvoicemailprompttype !== null && d.data_attributes_inboundvoicemailprompttype !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["inboundvoicemailprompttype"] = d.data_attributes_inboundvoicemailprompttype;
    }
    if (d.data_attributes_jobrolebyname !== undefined && d.data_attributes_jobrolebyname !== null && d.data_attributes_jobrolebyname !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["jobrolebyname"] = d.data_attributes_jobrolebyname;
    }
    if (d.data_attributes_kaiarecordingsviewid !== undefined && d.data_attributes_kaiarecordingsviewid !== null && d.data_attributes_kaiarecordingsviewid !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["kaiarecordingsviewid"] = d.data_attributes_kaiarecordingsviewid;
    }
    if (d.data_attributes_keepbridgephoneconnected !== undefined && d.data_attributes_keepbridgephoneconnected !== null && d.data_attributes_keepbridgephoneconnected !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["keepbridgephoneconnected"] = d.data_attributes_keepbridgephoneconnected;
    }
    if (d.data_attributes_lastname !== undefined && d.data_attributes_lastname !== null && d.data_attributes_lastname !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["lastname"] = d.data_attributes_lastname;
    }
    if (d.data_attributes_lastsigninat !== undefined && d.data_attributes_lastsigninat !== null && d.data_attributes_lastsigninat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["lastsigninat"] = d.data_attributes_lastsigninat;
    }
    if (d.data_attributes_locked !== undefined && d.data_attributes_locked !== null && d.data_attributes_locked !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["locked"] = d.data_attributes_locked;
    }
    if (d.data_attributes_mailboxerroremailenabled !== undefined && d.data_attributes_mailboxerroremailenabled !== null && d.data_attributes_mailboxerroremailenabled !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["mailboxerroremailenabled"] = d.data_attributes_mailboxerroremailenabled;
    }
    if (d.data_attributes_meetingengagementnotificationenabled !== undefined && d.data_attributes_meetingengagementnotificationenabled !== null && d.data_attributes_meetingengagementnotificationenabled !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["meetingengagementnotificationenabled"] = d.data_attributes_meetingengagementnotificationenabled;
    }
    if (d.data_attributes_name !== undefined && d.data_attributes_name !== null && d.data_attributes_name !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["name"] = d.data_attributes_name;
    }
    if (d.data_attributes_notificationsenabled !== undefined && d.data_attributes_notificationsenabled !== null && d.data_attributes_notificationsenabled !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["notificationsenabled"] = d.data_attributes_notificationsenabled;
    }
    if (d.data_attributes_oceclicktodialeverywhere !== undefined && d.data_attributes_oceclicktodialeverywhere !== null && d.data_attributes_oceclicktodialeverywhere !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["oceclicktodialeverywhere"] = d.data_attributes_oceclicktodialeverywhere;
    }
    if (d.data_attributes_ocegmailtoolbar !== undefined && d.data_attributes_ocegmailtoolbar !== null && d.data_attributes_ocegmailtoolbar !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["ocegmailtoolbar"] = d.data_attributes_ocegmailtoolbar;
    }
    if (d.data_attributes_ocegmailtrackingstate !== undefined && d.data_attributes_ocegmailtrackingstate !== null && d.data_attributes_ocegmailtrackingstate !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["ocegmailtrackingstate"] = d.data_attributes_ocegmailtrackingstate;
    }
    if (d.data_attributes_ocesalesforceemaildecorating !== undefined && d.data_attributes_ocesalesforceemaildecorating !== null && d.data_attributes_ocesalesforceemaildecorating !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["ocesalesforceemaildecorating"] = d.data_attributes_ocesalesforceemaildecorating;
    }
    if (d.data_attributes_ocesalesforcephonedecorating !== undefined && d.data_attributes_ocesalesforcephonedecorating !== null && d.data_attributes_ocesalesforcephonedecorating !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["ocesalesforcephonedecorating"] = d.data_attributes_ocesalesforcephonedecorating;
    }
    if (d.data_attributes_oceuniversaltaskflow !== undefined && d.data_attributes_oceuniversaltaskflow !== null && d.data_attributes_oceuniversaltaskflow !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["oceuniversaltaskflow"] = d.data_attributes_oceuniversaltaskflow;
    }
    if (d.data_attributes_ocewindowmode !== undefined && d.data_attributes_ocewindowmode !== null && d.data_attributes_ocewindowmode !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["ocewindowmode"] = d.data_attributes_ocewindowmode;
    }
    if (d.data_attributes_opportunitiesviewid !== undefined && d.data_attributes_opportunitiesviewid !== null && d.data_attributes_opportunitiesviewid !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["opportunitiesviewid"] = d.data_attributes_opportunitiesviewid;
    }
    if (d.data_attributes_passwordexpiresat !== undefined && d.data_attributes_passwordexpiresat !== null && d.data_attributes_passwordexpiresat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["passwordexpiresat"] = d.data_attributes_passwordexpiresat;
    }
    if (d.data_attributes_phonecountrycode !== undefined && d.data_attributes_phonecountrycode !== null && d.data_attributes_phonecountrycode !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["phonecountrycode"] = d.data_attributes_phonecountrycode;
    }
    if (d.data_attributes_phonenumber !== undefined && d.data_attributes_phonenumber !== null && d.data_attributes_phonenumber !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["phonenumber"] = d.data_attributes_phonenumber;
    }
    if (d.data_attributes_phonetype !== undefined && d.data_attributes_phonetype !== null && d.data_attributes_phonetype !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["phonetype"] = d.data_attributes_phonetype;
    }
    if (d.data_attributes_pluginalertnotificationenabled !== undefined && d.data_attributes_pluginalertnotificationenabled !== null && d.data_attributes_pluginalertnotificationenabled !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["pluginalertnotificationenabled"] = d.data_attributes_pluginalertnotificationenabled;
    }
    if (d.data_attributes_preferredvoiceregion !== undefined && d.data_attributes_preferredvoiceregion !== null && d.data_attributes_preferredvoiceregion !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["preferredvoiceregion"] = d.data_attributes_preferredvoiceregion;
    }
    if (d.data_attributes_preferslocalpresence !== undefined && d.data_attributes_preferslocalpresence !== null && d.data_attributes_preferslocalpresence !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["preferslocalpresence"] = d.data_attributes_preferslocalpresence;
    }
    if (d.data_attributes_prospectsviewid !== undefined && d.data_attributes_prospectsviewid !== null && d.data_attributes_prospectsviewid !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["prospectsviewid"] = d.data_attributes_prospectsviewid;
    }
    if (d.data_attributes_reportsteamperfviewid !== undefined && d.data_attributes_reportsteamperfviewid !== null && d.data_attributes_reportsteamperfviewid !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["reportsteamperfviewid"] = d.data_attributes_reportsteamperfviewid;
    }
    if (d.data_attributes_reportsviewid !== undefined && d.data_attributes_reportsviewid !== null && d.data_attributes_reportsviewid !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["reportsviewid"] = d.data_attributes_reportsviewid;
    }
    if (d.data_attributes_scimexternalid !== undefined && d.data_attributes_scimexternalid !== null && d.data_attributes_scimexternalid !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["scimexternalid"] = d.data_attributes_scimexternalid;
    }
    if (d.data_attributes_scimsource !== undefined && d.data_attributes_scimsource !== null && d.data_attributes_scimsource !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["scimsource"] = d.data_attributes_scimsource;
    }
    if (d.data_attributes_sendernotificationsexcluded !== undefined && d.data_attributes_sendernotificationsexcluded !== null && d.data_attributes_sendernotificationsexcluded !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["sendernotificationsexcluded"] = d.data_attributes_sendernotificationsexcluded;
    }
    if (d.data_attributes_tasksviewid !== undefined && d.data_attributes_tasksviewid !== null && d.data_attributes_tasksviewid !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["tasksviewid"] = d.data_attributes_tasksviewid;
    }
    if (d.data_attributes_teamsviewid !== undefined && d.data_attributes_teamsviewid !== null && d.data_attributes_teamsviewid !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["teamsviewid"] = d.data_attributes_teamsviewid;
    }
    if (d.data_attributes_textingemailnotifications !== undefined && d.data_attributes_textingemailnotifications !== null && d.data_attributes_textingemailnotifications !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["textingemailnotifications"] = d.data_attributes_textingemailnotifications;
    }
    if (d.data_attributes_title !== undefined && d.data_attributes_title !== null && d.data_attributes_title !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["title"] = d.data_attributes_title;
    }
    if (d.data_attributes_unknownreplyemailenabled !== undefined && d.data_attributes_unknownreplyemailenabled !== null && d.data_attributes_unknownreplyemailenabled !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["unknownreplyemailenabled"] = d.data_attributes_unknownreplyemailenabled;
    }
    if (d.data_attributes_updatedat !== undefined && d.data_attributes_updatedat !== null && d.data_attributes_updatedat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["updatedat"] = d.data_attributes_updatedat;
    }
    if (d.data_attributes_userguid !== undefined && d.data_attributes_userguid !== null && d.data_attributes_userguid !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["userguid"] = d.data_attributes_userguid;
    }
    if (d.data_attributes_username !== undefined && d.data_attributes_username !== null && d.data_attributes_username !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["username"] = d.data_attributes_username;
    }
    if (d.data_attributes_usersviewid !== undefined && d.data_attributes_usersviewid !== null && d.data_attributes_usersviewid !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["usersviewid"] = d.data_attributes_usersviewid;
    }
    if (d.data_attributes_voicemailnotificationenabled !== undefined && d.data_attributes_voicemailnotificationenabled !== null && d.data_attributes_voicemailnotificationenabled !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["voicemailnotificationenabled"] = d.data_attributes_voicemailnotificationenabled;
    }
    if (d.data_attributes_weeklydigestemailenabled !== undefined && d.data_attributes_weeklydigestemailenabled !== null && d.data_attributes_weeklydigestemailenabled !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["weeklydigestemailenabled"] = d.data_attributes_weeklydigestemailenabled;
    }
    if (d.data_relationships_batches_links_related !== undefined && d.data_relationships_batches_links_related !== null && d.data_relationships_batches_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["batches"] || typeof body["data"]["relationships"]["batches"] !== 'object' || Array.isArray(body["data"]["relationships"]["batches"])) body["data"]["relationships"]["batches"] = {};
      if (!body["data"]["relationships"]["batches"]["links"] || typeof body["data"]["relationships"]["batches"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["batches"]["links"])) body["data"]["relationships"]["batches"]["links"] = {};
      body["data"]["relationships"]["batches"]["links"]["related"] = d.data_relationships_batches_links_related;
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
    if (d.data_relationships_contentcategories_data !== undefined && d.data_relationships_contentcategories_data !== null && d.data_relationships_contentcategories_data !== '') {
      body["data_relationships_contentcategories_data"] = d.data_relationships_contentcategories_data;
    }
    if (d.data_relationships_contentcategories_links_related !== undefined && d.data_relationships_contentcategories_links_related !== null && d.data_relationships_contentcategories_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["contentcategories"] || typeof body["data"]["relationships"]["contentcategories"] !== 'object' || Array.isArray(body["data"]["relationships"]["contentcategories"])) body["data"]["relationships"]["contentcategories"] = {};
      if (!body["data"]["relationships"]["contentcategories"]["links"] || typeof body["data"]["relationships"]["contentcategories"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["contentcategories"]["links"])) body["data"]["relationships"]["contentcategories"]["links"] = {};
      body["data"]["relationships"]["contentcategories"]["links"]["related"] = d.data_relationships_contentcategories_links_related;
    }
    if (d.data_relationships_contentcategoryownerships_data !== undefined && d.data_relationships_contentcategoryownerships_data !== null && d.data_relationships_contentcategoryownerships_data !== '') {
      body["data_relationships_contentcategoryownerships_data"] = d.data_relationships_contentcategoryownerships_data;
    }
    if (d.data_relationships_contentcategoryownerships_links_related !== undefined && d.data_relationships_contentcategoryownerships_links_related !== null && d.data_relationships_contentcategoryownerships_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["contentcategoryownerships"] || typeof body["data"]["relationships"]["contentcategoryownerships"] !== 'object' || Array.isArray(body["data"]["relationships"]["contentcategoryownerships"])) body["data"]["relationships"]["contentcategoryownerships"] = {};
      if (!body["data"]["relationships"]["contentcategoryownerships"]["links"] || typeof body["data"]["relationships"]["contentcategoryownerships"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["contentcategoryownerships"]["links"])) body["data"]["relationships"]["contentcategoryownerships"]["links"] = {};
      body["data"]["relationships"]["contentcategoryownerships"]["links"]["related"] = d.data_relationships_contentcategoryownerships_links_related;
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
    if (d.data_relationships_directassignedteams_data !== undefined && d.data_relationships_directassignedteams_data !== null && d.data_relationships_directassignedteams_data !== '') {
      body["data_relationships_directassignedteams_data"] = d.data_relationships_directassignedteams_data;
    }
    if (d.data_relationships_directassignedteams_links_related !== undefined && d.data_relationships_directassignedteams_links_related !== null && d.data_relationships_directassignedteams_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["directassignedteams"] || typeof body["data"]["relationships"]["directassignedteams"] !== 'object' || Array.isArray(body["data"]["relationships"]["directassignedteams"])) body["data"]["relationships"]["directassignedteams"] = {};
      if (!body["data"]["relationships"]["directassignedteams"]["links"] || typeof body["data"]["relationships"]["directassignedteams"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["directassignedteams"]["links"])) body["data"]["relationships"]["directassignedteams"]["links"] = {};
      body["data"]["relationships"]["directassignedteams"]["links"]["related"] = d.data_relationships_directassignedteams_links_related;
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
    if (d.data_relationships_jobrole_data_id !== undefined && d.data_relationships_jobrole_data_id !== null && d.data_relationships_jobrole_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["jobrole"] || typeof body["data"]["relationships"]["jobrole"] !== 'object' || Array.isArray(body["data"]["relationships"]["jobrole"])) body["data"]["relationships"]["jobrole"] = {};
      if (!body["data"]["relationships"]["jobrole"]["data"] || typeof body["data"]["relationships"]["jobrole"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["jobrole"]["data"])) body["data"]["relationships"]["jobrole"]["data"] = {};
      body["data"]["relationships"]["jobrole"]["data"]["id"] = d.data_relationships_jobrole_data_id;
    }
    if (d.data_relationships_jobrole_data_type !== undefined && d.data_relationships_jobrole_data_type !== null && d.data_relationships_jobrole_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["jobrole"] || typeof body["data"]["relationships"]["jobrole"] !== 'object' || Array.isArray(body["data"]["relationships"]["jobrole"])) body["data"]["relationships"]["jobrole"] = {};
      if (!body["data"]["relationships"]["jobrole"]["data"] || typeof body["data"]["relationships"]["jobrole"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["jobrole"]["data"])) body["data"]["relationships"]["jobrole"]["data"] = {};
      body["data"]["relationships"]["jobrole"]["data"]["type"] = d.data_relationships_jobrole_data_type;
    }
    if (d.data_relationships_jobrole_links_related !== undefined && d.data_relationships_jobrole_links_related !== null && d.data_relationships_jobrole_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["jobrole"] || typeof body["data"]["relationships"]["jobrole"] !== 'object' || Array.isArray(body["data"]["relationships"]["jobrole"])) body["data"]["relationships"]["jobrole"] = {};
      if (!body["data"]["relationships"]["jobrole"]["links"] || typeof body["data"]["relationships"]["jobrole"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["jobrole"]["links"])) body["data"]["relationships"]["jobrole"]["links"] = {};
      body["data"]["relationships"]["jobrole"]["links"]["related"] = d.data_relationships_jobrole_links_related;
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
    if (d.data_relationships_mailboxes_data !== undefined && d.data_relationships_mailboxes_data !== null && d.data_relationships_mailboxes_data !== '') {
      body["data_relationships_mailboxes_data"] = d.data_relationships_mailboxes_data;
    }
    if (d.data_relationships_mailboxes_links_related !== undefined && d.data_relationships_mailboxes_links_related !== null && d.data_relationships_mailboxes_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["mailboxes"] || typeof body["data"]["relationships"]["mailboxes"] !== 'object' || Array.isArray(body["data"]["relationships"]["mailboxes"])) body["data"]["relationships"]["mailboxes"] = {};
      if (!body["data"]["relationships"]["mailboxes"]["links"] || typeof body["data"]["relationships"]["mailboxes"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["mailboxes"]["links"])) body["data"]["relationships"]["mailboxes"]["links"] = {};
      body["data"]["relationships"]["mailboxes"]["links"]["related"] = d.data_relationships_mailboxes_links_related;
    }
    if (d.data_relationships_outboundvoicemails_data !== undefined && d.data_relationships_outboundvoicemails_data !== null && d.data_relationships_outboundvoicemails_data !== '') {
      body["data_relationships_outboundvoicemails_data"] = d.data_relationships_outboundvoicemails_data;
    }
    if (d.data_relationships_outboundvoicemails_links_related !== undefined && d.data_relationships_outboundvoicemails_links_related !== null && d.data_relationships_outboundvoicemails_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["outboundvoicemails"] || typeof body["data"]["relationships"]["outboundvoicemails"] !== 'object' || Array.isArray(body["data"]["relationships"]["outboundvoicemails"])) body["data"]["relationships"]["outboundvoicemails"] = {};
      if (!body["data"]["relationships"]["outboundvoicemails"]["links"] || typeof body["data"]["relationships"]["outboundvoicemails"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["outboundvoicemails"]["links"])) body["data"]["relationships"]["outboundvoicemails"]["links"] = {};
      body["data"]["relationships"]["outboundvoicemails"]["links"]["related"] = d.data_relationships_outboundvoicemails_links_related;
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
    if (d.data_relationships_phones_data !== undefined && d.data_relationships_phones_data !== null && d.data_relationships_phones_data !== '') {
      body["data_relationships_phones_data"] = d.data_relationships_phones_data;
    }
    if (d.data_relationships_phones_links_related !== undefined && d.data_relationships_phones_links_related !== null && d.data_relationships_phones_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["phones"] || typeof body["data"]["relationships"]["phones"] !== 'object' || Array.isArray(body["data"]["relationships"]["phones"])) body["data"]["relationships"]["phones"] = {};
      if (!body["data"]["relationships"]["phones"]["links"] || typeof body["data"]["relationships"]["phones"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["phones"]["links"])) body["data"]["relationships"]["phones"]["links"] = {};
      body["data"]["relationships"]["phones"]["links"]["related"] = d.data_relationships_phones_links_related;
    }
    if (d.data_relationships_profile_data_id !== undefined && d.data_relationships_profile_data_id !== null && d.data_relationships_profile_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["profile"] || typeof body["data"]["relationships"]["profile"] !== 'object' || Array.isArray(body["data"]["relationships"]["profile"])) body["data"]["relationships"]["profile"] = {};
      if (!body["data"]["relationships"]["profile"]["data"] || typeof body["data"]["relationships"]["profile"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["profile"]["data"])) body["data"]["relationships"]["profile"]["data"] = {};
      body["data"]["relationships"]["profile"]["data"]["id"] = d.data_relationships_profile_data_id;
    }
    if (d.data_relationships_profile_data_type !== undefined && d.data_relationships_profile_data_type !== null && d.data_relationships_profile_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["profile"] || typeof body["data"]["relationships"]["profile"] !== 'object' || Array.isArray(body["data"]["relationships"]["profile"])) body["data"]["relationships"]["profile"] = {};
      if (!body["data"]["relationships"]["profile"]["data"] || typeof body["data"]["relationships"]["profile"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["profile"]["data"])) body["data"]["relationships"]["profile"]["data"] = {};
      body["data"]["relationships"]["profile"]["data"]["type"] = d.data_relationships_profile_data_type;
    }
    if (d.data_relationships_profile_links_related !== undefined && d.data_relationships_profile_links_related !== null && d.data_relationships_profile_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["profile"] || typeof body["data"]["relationships"]["profile"] !== 'object' || Array.isArray(body["data"]["relationships"]["profile"])) body["data"]["relationships"]["profile"] = {};
      if (!body["data"]["relationships"]["profile"]["links"] || typeof body["data"]["relationships"]["profile"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["profile"]["links"])) body["data"]["relationships"]["profile"]["links"] = {};
      body["data"]["relationships"]["profile"]["links"]["related"] = d.data_relationships_profile_links_related;
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
    if (d.data_relationships_role_data_id !== undefined && d.data_relationships_role_data_id !== null && d.data_relationships_role_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["role"] || typeof body["data"]["relationships"]["role"] !== 'object' || Array.isArray(body["data"]["relationships"]["role"])) body["data"]["relationships"]["role"] = {};
      if (!body["data"]["relationships"]["role"]["data"] || typeof body["data"]["relationships"]["role"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["role"]["data"])) body["data"]["relationships"]["role"]["data"] = {};
      body["data"]["relationships"]["role"]["data"]["id"] = d.data_relationships_role_data_id;
    }
    if (d.data_relationships_role_data_type !== undefined && d.data_relationships_role_data_type !== null && d.data_relationships_role_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["role"] || typeof body["data"]["relationships"]["role"] !== 'object' || Array.isArray(body["data"]["relationships"]["role"])) body["data"]["relationships"]["role"] = {};
      if (!body["data"]["relationships"]["role"]["data"] || typeof body["data"]["relationships"]["role"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["role"]["data"])) body["data"]["relationships"]["role"]["data"] = {};
      body["data"]["relationships"]["role"]["data"]["type"] = d.data_relationships_role_data_type;
    }
    if (d.data_relationships_role_links_related !== undefined && d.data_relationships_role_links_related !== null && d.data_relationships_role_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["role"] || typeof body["data"]["relationships"]["role"] !== 'object' || Array.isArray(body["data"]["relationships"]["role"])) body["data"]["relationships"]["role"] = {};
      if (!body["data"]["relationships"]["role"]["links"] || typeof body["data"]["relationships"]["role"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["role"]["links"])) body["data"]["relationships"]["role"]["links"] = {};
      body["data"]["relationships"]["role"]["links"]["related"] = d.data_relationships_role_links_related;
    }
    if (d.data_relationships_roleassignedteams_data !== undefined && d.data_relationships_roleassignedteams_data !== null && d.data_relationships_roleassignedteams_data !== '') {
      body["data_relationships_roleassignedteams_data"] = d.data_relationships_roleassignedteams_data;
    }
    if (d.data_relationships_roleassignedteams_links_related !== undefined && d.data_relationships_roleassignedteams_links_related !== null && d.data_relationships_roleassignedteams_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["roleassignedteams"] || typeof body["data"]["relationships"]["roleassignedteams"] !== 'object' || Array.isArray(body["data"]["relationships"]["roleassignedteams"])) body["data"]["relationships"]["roleassignedteams"] = {};
      if (!body["data"]["relationships"]["roleassignedteams"]["links"] || typeof body["data"]["relationships"]["roleassignedteams"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["roleassignedteams"]["links"])) body["data"]["relationships"]["roleassignedteams"]["links"] = {};
      body["data"]["relationships"]["roleassignedteams"]["links"]["related"] = d.data_relationships_roleassignedteams_links_related;
    }
    if (d.data_relationships_smsphone_data_id !== undefined && d.data_relationships_smsphone_data_id !== null && d.data_relationships_smsphone_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["smsphone"] || typeof body["data"]["relationships"]["smsphone"] !== 'object' || Array.isArray(body["data"]["relationships"]["smsphone"])) body["data"]["relationships"]["smsphone"] = {};
      if (!body["data"]["relationships"]["smsphone"]["data"] || typeof body["data"]["relationships"]["smsphone"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["smsphone"]["data"])) body["data"]["relationships"]["smsphone"]["data"] = {};
      body["data"]["relationships"]["smsphone"]["data"]["id"] = d.data_relationships_smsphone_data_id;
    }
    if (d.data_relationships_smsphone_data_type !== undefined && d.data_relationships_smsphone_data_type !== null && d.data_relationships_smsphone_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["smsphone"] || typeof body["data"]["relationships"]["smsphone"] !== 'object' || Array.isArray(body["data"]["relationships"]["smsphone"])) body["data"]["relationships"]["smsphone"] = {};
      if (!body["data"]["relationships"]["smsphone"]["data"] || typeof body["data"]["relationships"]["smsphone"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["smsphone"]["data"])) body["data"]["relationships"]["smsphone"]["data"] = {};
      body["data"]["relationships"]["smsphone"]["data"]["type"] = d.data_relationships_smsphone_data_type;
    }
    if (d.data_relationships_smsphone_links_related !== undefined && d.data_relationships_smsphone_links_related !== null && d.data_relationships_smsphone_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["smsphone"] || typeof body["data"]["relationships"]["smsphone"] !== 'object' || Array.isArray(body["data"]["relationships"]["smsphone"])) body["data"]["relationships"]["smsphone"] = {};
      if (!body["data"]["relationships"]["smsphone"]["links"] || typeof body["data"]["relationships"]["smsphone"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["smsphone"]["links"])) body["data"]["relationships"]["smsphone"]["links"] = {};
      body["data"]["relationships"]["smsphone"]["links"]["related"] = d.data_relationships_smsphone_links_related;
    }
    if (d.data_relationships_teams_data !== undefined && d.data_relationships_teams_data !== null && d.data_relationships_teams_data !== '') {
      body["data_relationships_teams_data"] = d.data_relationships_teams_data;
    }
    if (d.data_relationships_teams_links_related !== undefined && d.data_relationships_teams_links_related !== null && d.data_relationships_teams_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["teams"] || typeof body["data"]["relationships"]["teams"] !== 'object' || Array.isArray(body["data"]["relationships"]["teams"])) body["data"]["relationships"]["teams"] = {};
      if (!body["data"]["relationships"]["teams"]["links"] || typeof body["data"]["relationships"]["teams"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["teams"]["links"])) body["data"]["relationships"]["teams"]["links"] = {};
      body["data"]["relationships"]["teams"]["links"]["related"] = d.data_relationships_teams_links_related;
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
    if (d.data_relationships_voicemailprompts_data !== undefined && d.data_relationships_voicemailprompts_data !== null && d.data_relationships_voicemailprompts_data !== '') {
      body["data_relationships_voicemailprompts_data"] = d.data_relationships_voicemailprompts_data;
    }
    if (d.data_relationships_voicemailprompts_links_related !== undefined && d.data_relationships_voicemailprompts_links_related !== null && d.data_relationships_voicemailprompts_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["voicemailprompts"] || typeof body["data"]["relationships"]["voicemailprompts"] !== 'object' || Array.isArray(body["data"]["relationships"]["voicemailprompts"])) body["data"]["relationships"]["voicemailprompts"] = {};
      if (!body["data"]["relationships"]["voicemailprompts"]["links"] || typeof body["data"]["relationships"]["voicemailprompts"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["voicemailprompts"]["links"])) body["data"]["relationships"]["voicemailprompts"]["links"] = {};
      body["data"]["relationships"]["voicemailprompts"]["links"]["related"] = d.data_relationships_voicemailprompts_links_related;
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

