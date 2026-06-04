const { utils } = require('./utils');

module.exports = {
  async outreach_prospect_create_create_a_new_prospect(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/prospects";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.data_attributes_addedat !== undefined && d.data_attributes_addedat !== null && d.data_attributes_addedat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["addedat"] = d.data_attributes_addedat;
    }
    if (d.data_attributes_addresscity !== undefined && d.data_attributes_addresscity !== null && d.data_attributes_addresscity !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["addresscity"] = d.data_attributes_addresscity;
    }
    if (d.data_attributes_addresscountry !== undefined && d.data_attributes_addresscountry !== null && d.data_attributes_addresscountry !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["addresscountry"] = d.data_attributes_addresscountry;
    }
    if (d.data_attributes_addressstate !== undefined && d.data_attributes_addressstate !== null && d.data_attributes_addressstate !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["addressstate"] = d.data_attributes_addressstate;
    }
    if (d.data_attributes_addressstreet !== undefined && d.data_attributes_addressstreet !== null && d.data_attributes_addressstreet !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["addressstreet"] = d.data_attributes_addressstreet;
    }
    if (d.data_attributes_addressstreet2 !== undefined && d.data_attributes_addressstreet2 !== null && d.data_attributes_addressstreet2 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["addressstreet2"] = d.data_attributes_addressstreet2;
    }
    if (d.data_attributes_addresszip !== undefined && d.data_attributes_addresszip !== null && d.data_attributes_addresszip !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["addresszip"] = d.data_attributes_addresszip;
    }
    if (d.data_attributes_angellisturl !== undefined && d.data_attributes_angellisturl !== null && d.data_attributes_angellisturl !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["angellisturl"] = d.data_attributes_angellisturl;
    }
    if (d.data_attributes_availableat !== undefined && d.data_attributes_availableat !== null && d.data_attributes_availableat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["availableat"] = d.data_attributes_availableat;
    }
    if (d.data_attributes_calloptedout !== undefined && d.data_attributes_calloptedout !== null && d.data_attributes_calloptedout !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["calloptedout"] = d.data_attributes_calloptedout;
    }
    if (d.data_attributes_callsoptstatus !== undefined && d.data_attributes_callsoptstatus !== null && d.data_attributes_callsoptstatus !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["callsoptstatus"] = d.data_attributes_callsoptstatus;
    }
    if (d.data_attributes_callsoptedat !== undefined && d.data_attributes_callsoptedat !== null && d.data_attributes_callsoptedat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["callsoptedat"] = d.data_attributes_callsoptedat;
    }
    if (d.data_attributes_campaignname !== undefined && d.data_attributes_campaignname !== null && d.data_attributes_campaignname !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["campaignname"] = d.data_attributes_campaignname;
    }
    if (d.data_attributes_clickcount !== undefined && d.data_attributes_clickcount !== null && d.data_attributes_clickcount !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["clickcount"] = d.data_attributes_clickcount;
    }
    if (d.data_attributes_company !== undefined && d.data_attributes_company !== null && d.data_attributes_company !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["company"] = d.data_attributes_company;
    }
    if (d.data_attributes_contacthistogram !== undefined && d.data_attributes_contacthistogram !== null && d.data_attributes_contacthistogram !== '') {
      body["data_attributes_contacthistogram"] = d.data_attributes_contacthistogram;
    }
    if (d.data_attributes_createdat !== undefined && d.data_attributes_createdat !== null && d.data_attributes_createdat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["createdat"] = d.data_attributes_createdat;
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
    if (d.data_attributes_custom6 !== undefined && d.data_attributes_custom6 !== null && d.data_attributes_custom6 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom6"] = d.data_attributes_custom6;
    }
    if (d.data_attributes_custom7 !== undefined && d.data_attributes_custom7 !== null && d.data_attributes_custom7 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom7"] = d.data_attributes_custom7;
    }
    if (d.data_attributes_custom8 !== undefined && d.data_attributes_custom8 !== null && d.data_attributes_custom8 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom8"] = d.data_attributes_custom8;
    }
    if (d.data_attributes_custom9 !== undefined && d.data_attributes_custom9 !== null && d.data_attributes_custom9 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom9"] = d.data_attributes_custom9;
    }
    if (d.data_attributes_custom10 !== undefined && d.data_attributes_custom10 !== null && d.data_attributes_custom10 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom10"] = d.data_attributes_custom10;
    }
    if (d.data_attributes_custom11 !== undefined && d.data_attributes_custom11 !== null && d.data_attributes_custom11 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom11"] = d.data_attributes_custom11;
    }
    if (d.data_attributes_custom12 !== undefined && d.data_attributes_custom12 !== null && d.data_attributes_custom12 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom12"] = d.data_attributes_custom12;
    }
    if (d.data_attributes_custom13 !== undefined && d.data_attributes_custom13 !== null && d.data_attributes_custom13 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom13"] = d.data_attributes_custom13;
    }
    if (d.data_attributes_custom14 !== undefined && d.data_attributes_custom14 !== null && d.data_attributes_custom14 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom14"] = d.data_attributes_custom14;
    }
    if (d.data_attributes_custom15 !== undefined && d.data_attributes_custom15 !== null && d.data_attributes_custom15 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom15"] = d.data_attributes_custom15;
    }
    if (d.data_attributes_custom16 !== undefined && d.data_attributes_custom16 !== null && d.data_attributes_custom16 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom16"] = d.data_attributes_custom16;
    }
    if (d.data_attributes_custom17 !== undefined && d.data_attributes_custom17 !== null && d.data_attributes_custom17 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom17"] = d.data_attributes_custom17;
    }
    if (d.data_attributes_custom18 !== undefined && d.data_attributes_custom18 !== null && d.data_attributes_custom18 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom18"] = d.data_attributes_custom18;
    }
    if (d.data_attributes_custom19 !== undefined && d.data_attributes_custom19 !== null && d.data_attributes_custom19 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom19"] = d.data_attributes_custom19;
    }
    if (d.data_attributes_custom20 !== undefined && d.data_attributes_custom20 !== null && d.data_attributes_custom20 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom20"] = d.data_attributes_custom20;
    }
    if (d.data_attributes_custom21 !== undefined && d.data_attributes_custom21 !== null && d.data_attributes_custom21 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom21"] = d.data_attributes_custom21;
    }
    if (d.data_attributes_custom22 !== undefined && d.data_attributes_custom22 !== null && d.data_attributes_custom22 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom22"] = d.data_attributes_custom22;
    }
    if (d.data_attributes_custom23 !== undefined && d.data_attributes_custom23 !== null && d.data_attributes_custom23 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom23"] = d.data_attributes_custom23;
    }
    if (d.data_attributes_custom24 !== undefined && d.data_attributes_custom24 !== null && d.data_attributes_custom24 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom24"] = d.data_attributes_custom24;
    }
    if (d.data_attributes_custom25 !== undefined && d.data_attributes_custom25 !== null && d.data_attributes_custom25 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom25"] = d.data_attributes_custom25;
    }
    if (d.data_attributes_custom26 !== undefined && d.data_attributes_custom26 !== null && d.data_attributes_custom26 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom26"] = d.data_attributes_custom26;
    }
    if (d.data_attributes_custom27 !== undefined && d.data_attributes_custom27 !== null && d.data_attributes_custom27 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom27"] = d.data_attributes_custom27;
    }
    if (d.data_attributes_custom28 !== undefined && d.data_attributes_custom28 !== null && d.data_attributes_custom28 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom28"] = d.data_attributes_custom28;
    }
    if (d.data_attributes_custom29 !== undefined && d.data_attributes_custom29 !== null && d.data_attributes_custom29 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom29"] = d.data_attributes_custom29;
    }
    if (d.data_attributes_custom30 !== undefined && d.data_attributes_custom30 !== null && d.data_attributes_custom30 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom30"] = d.data_attributes_custom30;
    }
    if (d.data_attributes_custom31 !== undefined && d.data_attributes_custom31 !== null && d.data_attributes_custom31 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom31"] = d.data_attributes_custom31;
    }
    if (d.data_attributes_custom32 !== undefined && d.data_attributes_custom32 !== null && d.data_attributes_custom32 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom32"] = d.data_attributes_custom32;
    }
    if (d.data_attributes_custom33 !== undefined && d.data_attributes_custom33 !== null && d.data_attributes_custom33 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom33"] = d.data_attributes_custom33;
    }
    if (d.data_attributes_custom34 !== undefined && d.data_attributes_custom34 !== null && d.data_attributes_custom34 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom34"] = d.data_attributes_custom34;
    }
    if (d.data_attributes_custom35 !== undefined && d.data_attributes_custom35 !== null && d.data_attributes_custom35 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom35"] = d.data_attributes_custom35;
    }
    if (d.data_attributes_custom36 !== undefined && d.data_attributes_custom36 !== null && d.data_attributes_custom36 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom36"] = d.data_attributes_custom36;
    }
    if (d.data_attributes_custom37 !== undefined && d.data_attributes_custom37 !== null && d.data_attributes_custom37 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom37"] = d.data_attributes_custom37;
    }
    if (d.data_attributes_custom38 !== undefined && d.data_attributes_custom38 !== null && d.data_attributes_custom38 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom38"] = d.data_attributes_custom38;
    }
    if (d.data_attributes_custom39 !== undefined && d.data_attributes_custom39 !== null && d.data_attributes_custom39 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom39"] = d.data_attributes_custom39;
    }
    if (d.data_attributes_custom40 !== undefined && d.data_attributes_custom40 !== null && d.data_attributes_custom40 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom40"] = d.data_attributes_custom40;
    }
    if (d.data_attributes_custom41 !== undefined && d.data_attributes_custom41 !== null && d.data_attributes_custom41 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom41"] = d.data_attributes_custom41;
    }
    if (d.data_attributes_custom42 !== undefined && d.data_attributes_custom42 !== null && d.data_attributes_custom42 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom42"] = d.data_attributes_custom42;
    }
    if (d.data_attributes_custom43 !== undefined && d.data_attributes_custom43 !== null && d.data_attributes_custom43 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom43"] = d.data_attributes_custom43;
    }
    if (d.data_attributes_custom44 !== undefined && d.data_attributes_custom44 !== null && d.data_attributes_custom44 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom44"] = d.data_attributes_custom44;
    }
    if (d.data_attributes_custom45 !== undefined && d.data_attributes_custom45 !== null && d.data_attributes_custom45 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom45"] = d.data_attributes_custom45;
    }
    if (d.data_attributes_custom46 !== undefined && d.data_attributes_custom46 !== null && d.data_attributes_custom46 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom46"] = d.data_attributes_custom46;
    }
    if (d.data_attributes_custom47 !== undefined && d.data_attributes_custom47 !== null && d.data_attributes_custom47 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom47"] = d.data_attributes_custom47;
    }
    if (d.data_attributes_custom48 !== undefined && d.data_attributes_custom48 !== null && d.data_attributes_custom48 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom48"] = d.data_attributes_custom48;
    }
    if (d.data_attributes_custom49 !== undefined && d.data_attributes_custom49 !== null && d.data_attributes_custom49 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom49"] = d.data_attributes_custom49;
    }
    if (d.data_attributes_custom50 !== undefined && d.data_attributes_custom50 !== null && d.data_attributes_custom50 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom50"] = d.data_attributes_custom50;
    }
    if (d.data_attributes_custom51 !== undefined && d.data_attributes_custom51 !== null && d.data_attributes_custom51 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom51"] = d.data_attributes_custom51;
    }
    if (d.data_attributes_custom52 !== undefined && d.data_attributes_custom52 !== null && d.data_attributes_custom52 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom52"] = d.data_attributes_custom52;
    }
    if (d.data_attributes_custom53 !== undefined && d.data_attributes_custom53 !== null && d.data_attributes_custom53 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom53"] = d.data_attributes_custom53;
    }
    if (d.data_attributes_custom54 !== undefined && d.data_attributes_custom54 !== null && d.data_attributes_custom54 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom54"] = d.data_attributes_custom54;
    }
    if (d.data_attributes_custom55 !== undefined && d.data_attributes_custom55 !== null && d.data_attributes_custom55 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom55"] = d.data_attributes_custom55;
    }
    if (d.data_attributes_custom56 !== undefined && d.data_attributes_custom56 !== null && d.data_attributes_custom56 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom56"] = d.data_attributes_custom56;
    }
    if (d.data_attributes_custom57 !== undefined && d.data_attributes_custom57 !== null && d.data_attributes_custom57 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom57"] = d.data_attributes_custom57;
    }
    if (d.data_attributes_custom58 !== undefined && d.data_attributes_custom58 !== null && d.data_attributes_custom58 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom58"] = d.data_attributes_custom58;
    }
    if (d.data_attributes_custom59 !== undefined && d.data_attributes_custom59 !== null && d.data_attributes_custom59 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom59"] = d.data_attributes_custom59;
    }
    if (d.data_attributes_custom60 !== undefined && d.data_attributes_custom60 !== null && d.data_attributes_custom60 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom60"] = d.data_attributes_custom60;
    }
    if (d.data_attributes_custom61 !== undefined && d.data_attributes_custom61 !== null && d.data_attributes_custom61 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom61"] = d.data_attributes_custom61;
    }
    if (d.data_attributes_custom62 !== undefined && d.data_attributes_custom62 !== null && d.data_attributes_custom62 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom62"] = d.data_attributes_custom62;
    }
    if (d.data_attributes_custom63 !== undefined && d.data_attributes_custom63 !== null && d.data_attributes_custom63 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom63"] = d.data_attributes_custom63;
    }
    if (d.data_attributes_custom64 !== undefined && d.data_attributes_custom64 !== null && d.data_attributes_custom64 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom64"] = d.data_attributes_custom64;
    }
    if (d.data_attributes_custom65 !== undefined && d.data_attributes_custom65 !== null && d.data_attributes_custom65 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom65"] = d.data_attributes_custom65;
    }
    if (d.data_attributes_custom66 !== undefined && d.data_attributes_custom66 !== null && d.data_attributes_custom66 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom66"] = d.data_attributes_custom66;
    }
    if (d.data_attributes_custom67 !== undefined && d.data_attributes_custom67 !== null && d.data_attributes_custom67 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom67"] = d.data_attributes_custom67;
    }
    if (d.data_attributes_custom68 !== undefined && d.data_attributes_custom68 !== null && d.data_attributes_custom68 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom68"] = d.data_attributes_custom68;
    }
    if (d.data_attributes_custom69 !== undefined && d.data_attributes_custom69 !== null && d.data_attributes_custom69 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom69"] = d.data_attributes_custom69;
    }
    if (d.data_attributes_custom70 !== undefined && d.data_attributes_custom70 !== null && d.data_attributes_custom70 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom70"] = d.data_attributes_custom70;
    }
    if (d.data_attributes_custom71 !== undefined && d.data_attributes_custom71 !== null && d.data_attributes_custom71 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom71"] = d.data_attributes_custom71;
    }
    if (d.data_attributes_custom72 !== undefined && d.data_attributes_custom72 !== null && d.data_attributes_custom72 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom72"] = d.data_attributes_custom72;
    }
    if (d.data_attributes_custom73 !== undefined && d.data_attributes_custom73 !== null && d.data_attributes_custom73 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom73"] = d.data_attributes_custom73;
    }
    if (d.data_attributes_custom74 !== undefined && d.data_attributes_custom74 !== null && d.data_attributes_custom74 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom74"] = d.data_attributes_custom74;
    }
    if (d.data_attributes_custom75 !== undefined && d.data_attributes_custom75 !== null && d.data_attributes_custom75 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom75"] = d.data_attributes_custom75;
    }
    if (d.data_attributes_custom76 !== undefined && d.data_attributes_custom76 !== null && d.data_attributes_custom76 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom76"] = d.data_attributes_custom76;
    }
    if (d.data_attributes_custom77 !== undefined && d.data_attributes_custom77 !== null && d.data_attributes_custom77 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom77"] = d.data_attributes_custom77;
    }
    if (d.data_attributes_custom78 !== undefined && d.data_attributes_custom78 !== null && d.data_attributes_custom78 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom78"] = d.data_attributes_custom78;
    }
    if (d.data_attributes_custom79 !== undefined && d.data_attributes_custom79 !== null && d.data_attributes_custom79 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom79"] = d.data_attributes_custom79;
    }
    if (d.data_attributes_custom80 !== undefined && d.data_attributes_custom80 !== null && d.data_attributes_custom80 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom80"] = d.data_attributes_custom80;
    }
    if (d.data_attributes_custom81 !== undefined && d.data_attributes_custom81 !== null && d.data_attributes_custom81 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom81"] = d.data_attributes_custom81;
    }
    if (d.data_attributes_custom82 !== undefined && d.data_attributes_custom82 !== null && d.data_attributes_custom82 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom82"] = d.data_attributes_custom82;
    }
    if (d.data_attributes_custom83 !== undefined && d.data_attributes_custom83 !== null && d.data_attributes_custom83 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom83"] = d.data_attributes_custom83;
    }
    if (d.data_attributes_custom84 !== undefined && d.data_attributes_custom84 !== null && d.data_attributes_custom84 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom84"] = d.data_attributes_custom84;
    }
    if (d.data_attributes_custom85 !== undefined && d.data_attributes_custom85 !== null && d.data_attributes_custom85 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom85"] = d.data_attributes_custom85;
    }
    if (d.data_attributes_custom86 !== undefined && d.data_attributes_custom86 !== null && d.data_attributes_custom86 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom86"] = d.data_attributes_custom86;
    }
    if (d.data_attributes_custom87 !== undefined && d.data_attributes_custom87 !== null && d.data_attributes_custom87 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom87"] = d.data_attributes_custom87;
    }
    if (d.data_attributes_custom88 !== undefined && d.data_attributes_custom88 !== null && d.data_attributes_custom88 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom88"] = d.data_attributes_custom88;
    }
    if (d.data_attributes_custom89 !== undefined && d.data_attributes_custom89 !== null && d.data_attributes_custom89 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom89"] = d.data_attributes_custom89;
    }
    if (d.data_attributes_custom90 !== undefined && d.data_attributes_custom90 !== null && d.data_attributes_custom90 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom90"] = d.data_attributes_custom90;
    }
    if (d.data_attributes_custom91 !== undefined && d.data_attributes_custom91 !== null && d.data_attributes_custom91 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom91"] = d.data_attributes_custom91;
    }
    if (d.data_attributes_custom92 !== undefined && d.data_attributes_custom92 !== null && d.data_attributes_custom92 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom92"] = d.data_attributes_custom92;
    }
    if (d.data_attributes_custom93 !== undefined && d.data_attributes_custom93 !== null && d.data_attributes_custom93 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom93"] = d.data_attributes_custom93;
    }
    if (d.data_attributes_custom94 !== undefined && d.data_attributes_custom94 !== null && d.data_attributes_custom94 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom94"] = d.data_attributes_custom94;
    }
    if (d.data_attributes_custom95 !== undefined && d.data_attributes_custom95 !== null && d.data_attributes_custom95 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom95"] = d.data_attributes_custom95;
    }
    if (d.data_attributes_custom96 !== undefined && d.data_attributes_custom96 !== null && d.data_attributes_custom96 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom96"] = d.data_attributes_custom96;
    }
    if (d.data_attributes_custom97 !== undefined && d.data_attributes_custom97 !== null && d.data_attributes_custom97 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom97"] = d.data_attributes_custom97;
    }
    if (d.data_attributes_custom98 !== undefined && d.data_attributes_custom98 !== null && d.data_attributes_custom98 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom98"] = d.data_attributes_custom98;
    }
    if (d.data_attributes_custom99 !== undefined && d.data_attributes_custom99 !== null && d.data_attributes_custom99 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom99"] = d.data_attributes_custom99;
    }
    if (d.data_attributes_custom100 !== undefined && d.data_attributes_custom100 !== null && d.data_attributes_custom100 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom100"] = d.data_attributes_custom100;
    }
    if (d.data_attributes_custom101 !== undefined && d.data_attributes_custom101 !== null && d.data_attributes_custom101 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom101"] = d.data_attributes_custom101;
    }
    if (d.data_attributes_custom102 !== undefined && d.data_attributes_custom102 !== null && d.data_attributes_custom102 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom102"] = d.data_attributes_custom102;
    }
    if (d.data_attributes_custom103 !== undefined && d.data_attributes_custom103 !== null && d.data_attributes_custom103 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom103"] = d.data_attributes_custom103;
    }
    if (d.data_attributes_custom104 !== undefined && d.data_attributes_custom104 !== null && d.data_attributes_custom104 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom104"] = d.data_attributes_custom104;
    }
    if (d.data_attributes_custom105 !== undefined && d.data_attributes_custom105 !== null && d.data_attributes_custom105 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom105"] = d.data_attributes_custom105;
    }
    if (d.data_attributes_custom106 !== undefined && d.data_attributes_custom106 !== null && d.data_attributes_custom106 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom106"] = d.data_attributes_custom106;
    }
    if (d.data_attributes_custom107 !== undefined && d.data_attributes_custom107 !== null && d.data_attributes_custom107 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom107"] = d.data_attributes_custom107;
    }
    if (d.data_attributes_custom108 !== undefined && d.data_attributes_custom108 !== null && d.data_attributes_custom108 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom108"] = d.data_attributes_custom108;
    }
    if (d.data_attributes_custom109 !== undefined && d.data_attributes_custom109 !== null && d.data_attributes_custom109 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom109"] = d.data_attributes_custom109;
    }
    if (d.data_attributes_custom110 !== undefined && d.data_attributes_custom110 !== null && d.data_attributes_custom110 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom110"] = d.data_attributes_custom110;
    }
    if (d.data_attributes_custom111 !== undefined && d.data_attributes_custom111 !== null && d.data_attributes_custom111 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom111"] = d.data_attributes_custom111;
    }
    if (d.data_attributes_custom112 !== undefined && d.data_attributes_custom112 !== null && d.data_attributes_custom112 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom112"] = d.data_attributes_custom112;
    }
    if (d.data_attributes_custom113 !== undefined && d.data_attributes_custom113 !== null && d.data_attributes_custom113 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom113"] = d.data_attributes_custom113;
    }
    if (d.data_attributes_custom114 !== undefined && d.data_attributes_custom114 !== null && d.data_attributes_custom114 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom114"] = d.data_attributes_custom114;
    }
    if (d.data_attributes_custom115 !== undefined && d.data_attributes_custom115 !== null && d.data_attributes_custom115 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom115"] = d.data_attributes_custom115;
    }
    if (d.data_attributes_custom116 !== undefined && d.data_attributes_custom116 !== null && d.data_attributes_custom116 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom116"] = d.data_attributes_custom116;
    }
    if (d.data_attributes_custom117 !== undefined && d.data_attributes_custom117 !== null && d.data_attributes_custom117 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom117"] = d.data_attributes_custom117;
    }
    if (d.data_attributes_custom118 !== undefined && d.data_attributes_custom118 !== null && d.data_attributes_custom118 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom118"] = d.data_attributes_custom118;
    }
    if (d.data_attributes_custom119 !== undefined && d.data_attributes_custom119 !== null && d.data_attributes_custom119 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom119"] = d.data_attributes_custom119;
    }
    if (d.data_attributes_custom120 !== undefined && d.data_attributes_custom120 !== null && d.data_attributes_custom120 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom120"] = d.data_attributes_custom120;
    }
    if (d.data_attributes_custom121 !== undefined && d.data_attributes_custom121 !== null && d.data_attributes_custom121 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom121"] = d.data_attributes_custom121;
    }
    if (d.data_attributes_custom122 !== undefined && d.data_attributes_custom122 !== null && d.data_attributes_custom122 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom122"] = d.data_attributes_custom122;
    }
    if (d.data_attributes_custom123 !== undefined && d.data_attributes_custom123 !== null && d.data_attributes_custom123 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom123"] = d.data_attributes_custom123;
    }
    if (d.data_attributes_custom124 !== undefined && d.data_attributes_custom124 !== null && d.data_attributes_custom124 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom124"] = d.data_attributes_custom124;
    }
    if (d.data_attributes_custom125 !== undefined && d.data_attributes_custom125 !== null && d.data_attributes_custom125 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom125"] = d.data_attributes_custom125;
    }
    if (d.data_attributes_custom126 !== undefined && d.data_attributes_custom126 !== null && d.data_attributes_custom126 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom126"] = d.data_attributes_custom126;
    }
    if (d.data_attributes_custom127 !== undefined && d.data_attributes_custom127 !== null && d.data_attributes_custom127 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom127"] = d.data_attributes_custom127;
    }
    if (d.data_attributes_custom128 !== undefined && d.data_attributes_custom128 !== null && d.data_attributes_custom128 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom128"] = d.data_attributes_custom128;
    }
    if (d.data_attributes_custom129 !== undefined && d.data_attributes_custom129 !== null && d.data_attributes_custom129 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom129"] = d.data_attributes_custom129;
    }
    if (d.data_attributes_custom130 !== undefined && d.data_attributes_custom130 !== null && d.data_attributes_custom130 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom130"] = d.data_attributes_custom130;
    }
    if (d.data_attributes_custom131 !== undefined && d.data_attributes_custom131 !== null && d.data_attributes_custom131 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom131"] = d.data_attributes_custom131;
    }
    if (d.data_attributes_custom132 !== undefined && d.data_attributes_custom132 !== null && d.data_attributes_custom132 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom132"] = d.data_attributes_custom132;
    }
    if (d.data_attributes_custom133 !== undefined && d.data_attributes_custom133 !== null && d.data_attributes_custom133 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom133"] = d.data_attributes_custom133;
    }
    if (d.data_attributes_custom134 !== undefined && d.data_attributes_custom134 !== null && d.data_attributes_custom134 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom134"] = d.data_attributes_custom134;
    }
    if (d.data_attributes_custom135 !== undefined && d.data_attributes_custom135 !== null && d.data_attributes_custom135 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom135"] = d.data_attributes_custom135;
    }
    if (d.data_attributes_custom136 !== undefined && d.data_attributes_custom136 !== null && d.data_attributes_custom136 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom136"] = d.data_attributes_custom136;
    }
    if (d.data_attributes_custom137 !== undefined && d.data_attributes_custom137 !== null && d.data_attributes_custom137 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom137"] = d.data_attributes_custom137;
    }
    if (d.data_attributes_custom138 !== undefined && d.data_attributes_custom138 !== null && d.data_attributes_custom138 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom138"] = d.data_attributes_custom138;
    }
    if (d.data_attributes_custom139 !== undefined && d.data_attributes_custom139 !== null && d.data_attributes_custom139 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom139"] = d.data_attributes_custom139;
    }
    if (d.data_attributes_custom140 !== undefined && d.data_attributes_custom140 !== null && d.data_attributes_custom140 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom140"] = d.data_attributes_custom140;
    }
    if (d.data_attributes_custom141 !== undefined && d.data_attributes_custom141 !== null && d.data_attributes_custom141 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom141"] = d.data_attributes_custom141;
    }
    if (d.data_attributes_custom142 !== undefined && d.data_attributes_custom142 !== null && d.data_attributes_custom142 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom142"] = d.data_attributes_custom142;
    }
    if (d.data_attributes_custom143 !== undefined && d.data_attributes_custom143 !== null && d.data_attributes_custom143 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom143"] = d.data_attributes_custom143;
    }
    if (d.data_attributes_custom144 !== undefined && d.data_attributes_custom144 !== null && d.data_attributes_custom144 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom144"] = d.data_attributes_custom144;
    }
    if (d.data_attributes_custom145 !== undefined && d.data_attributes_custom145 !== null && d.data_attributes_custom145 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom145"] = d.data_attributes_custom145;
    }
    if (d.data_attributes_custom146 !== undefined && d.data_attributes_custom146 !== null && d.data_attributes_custom146 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom146"] = d.data_attributes_custom146;
    }
    if (d.data_attributes_custom147 !== undefined && d.data_attributes_custom147 !== null && d.data_attributes_custom147 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom147"] = d.data_attributes_custom147;
    }
    if (d.data_attributes_custom148 !== undefined && d.data_attributes_custom148 !== null && d.data_attributes_custom148 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom148"] = d.data_attributes_custom148;
    }
    if (d.data_attributes_custom149 !== undefined && d.data_attributes_custom149 !== null && d.data_attributes_custom149 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom149"] = d.data_attributes_custom149;
    }
    if (d.data_attributes_custom150 !== undefined && d.data_attributes_custom150 !== null && d.data_attributes_custom150 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["custom150"] = d.data_attributes_custom150;
    }
    if (d.data_attributes_dateofbirth !== undefined && d.data_attributes_dateofbirth !== null && d.data_attributes_dateofbirth !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["dateofbirth"] = d.data_attributes_dateofbirth;
    }
    if (d.data_attributes_degree !== undefined && d.data_attributes_degree !== null && d.data_attributes_degree !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["degree"] = d.data_attributes_degree;
    }
    if (d.data_attributes_emailoptedout !== undefined && d.data_attributes_emailoptedout !== null && d.data_attributes_emailoptedout !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["emailoptedout"] = d.data_attributes_emailoptedout;
    }
    if (d.data_attributes_emails !== undefined && d.data_attributes_emails !== null && d.data_attributes_emails !== '') {
      body["data_attributes_emails"] = d.data_attributes_emails;
    }
    if (d.data_attributes_emailsoptstatus !== undefined && d.data_attributes_emailsoptstatus !== null && d.data_attributes_emailsoptstatus !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["emailsoptstatus"] = d.data_attributes_emailsoptstatus;
    }
    if (d.data_attributes_emailsoptedat !== undefined && d.data_attributes_emailsoptedat !== null && d.data_attributes_emailsoptedat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["emailsoptedat"] = d.data_attributes_emailsoptedat;
    }
    if (d.data_attributes_engagedat !== undefined && d.data_attributes_engagedat !== null && d.data_attributes_engagedat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["engagedat"] = d.data_attributes_engagedat;
    }
    if (d.data_attributes_engagedscore !== undefined && d.data_attributes_engagedscore !== null && d.data_attributes_engagedscore !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["engagedscore"] = d.data_attributes_engagedscore;
    }
    if (d.data_attributes_eventname !== undefined && d.data_attributes_eventname !== null && d.data_attributes_eventname !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["eventname"] = d.data_attributes_eventname;
    }
    if (d.data_attributes_externalid !== undefined && d.data_attributes_externalid !== null && d.data_attributes_externalid !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["externalid"] = d.data_attributes_externalid;
    }
    if (d.data_attributes_externalowner !== undefined && d.data_attributes_externalowner !== null && d.data_attributes_externalowner !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["externalowner"] = d.data_attributes_externalowner;
    }
    if (d.data_attributes_externalsource !== undefined && d.data_attributes_externalsource !== null && d.data_attributes_externalsource !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["externalsource"] = d.data_attributes_externalsource;
    }
    if (d.data_attributes_facebookurl !== undefined && d.data_attributes_facebookurl !== null && d.data_attributes_facebookurl !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["facebookurl"] = d.data_attributes_facebookurl;
    }
    if (d.data_attributes_firstname !== undefined && d.data_attributes_firstname !== null && d.data_attributes_firstname !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["firstname"] = d.data_attributes_firstname;
    }
    if (d.data_attributes_gender !== undefined && d.data_attributes_gender !== null && d.data_attributes_gender !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["gender"] = d.data_attributes_gender;
    }
    if (d.data_attributes_githuburl !== undefined && d.data_attributes_githuburl !== null && d.data_attributes_githuburl !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["githuburl"] = d.data_attributes_githuburl;
    }
    if (d.data_attributes_githubusername !== undefined && d.data_attributes_githubusername !== null && d.data_attributes_githubusername !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["githubusername"] = d.data_attributes_githubusername;
    }
    if (d.data_attributes_googleplusurl !== undefined && d.data_attributes_googleplusurl !== null && d.data_attributes_googleplusurl !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["googleplusurl"] = d.data_attributes_googleplusurl;
    }
    if (d.data_attributes_graduationdate !== undefined && d.data_attributes_graduationdate !== null && d.data_attributes_graduationdate !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["graduationdate"] = d.data_attributes_graduationdate;
    }
    if (d.data_attributes_homephones !== undefined && d.data_attributes_homephones !== null && d.data_attributes_homephones !== '') {
      body["data_attributes_homephones"] = d.data_attributes_homephones;
    }
    if (d.data_attributes_jobstartdate !== undefined && d.data_attributes_jobstartdate !== null && d.data_attributes_jobstartdate !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["jobstartdate"] = d.data_attributes_jobstartdate;
    }
    if (d.data_attributes_lastname !== undefined && d.data_attributes_lastname !== null && d.data_attributes_lastname !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["lastname"] = d.data_attributes_lastname;
    }
    if (d.data_attributes_linkedinconnections !== undefined && d.data_attributes_linkedinconnections !== null && d.data_attributes_linkedinconnections !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["linkedinconnections"] = d.data_attributes_linkedinconnections;
    }
    if (d.data_attributes_linkedinid !== undefined && d.data_attributes_linkedinid !== null && d.data_attributes_linkedinid !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["linkedinid"] = d.data_attributes_linkedinid;
    }
    if (d.data_attributes_linkedinslug !== undefined && d.data_attributes_linkedinslug !== null && d.data_attributes_linkedinslug !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["linkedinslug"] = d.data_attributes_linkedinslug;
    }
    if (d.data_attributes_linkedinurl !== undefined && d.data_attributes_linkedinurl !== null && d.data_attributes_linkedinurl !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["linkedinurl"] = d.data_attributes_linkedinurl;
    }
    if (d.data_attributes_middlename !== undefined && d.data_attributes_middlename !== null && d.data_attributes_middlename !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["middlename"] = d.data_attributes_middlename;
    }
    if (d.data_attributes_mobilephones !== undefined && d.data_attributes_mobilephones !== null && d.data_attributes_mobilephones !== '') {
      body["data_attributes_mobilephones"] = d.data_attributes_mobilephones;
    }
    if (d.data_attributes_name !== undefined && d.data_attributes_name !== null && d.data_attributes_name !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["name"] = d.data_attributes_name;
    }
    if (d.data_attributes_nickname !== undefined && d.data_attributes_nickname !== null && d.data_attributes_nickname !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["nickname"] = d.data_attributes_nickname;
    }
    if (d.data_attributes_occupation !== undefined && d.data_attributes_occupation !== null && d.data_attributes_occupation !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["occupation"] = d.data_attributes_occupation;
    }
    if (d.data_attributes_opencount !== undefined && d.data_attributes_opencount !== null && d.data_attributes_opencount !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["opencount"] = d.data_attributes_opencount;
    }
    if (d.data_attributes_optedout !== undefined && d.data_attributes_optedout !== null && d.data_attributes_optedout !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["optedout"] = d.data_attributes_optedout;
    }
    if (d.data_attributes_optedoutat !== undefined && d.data_attributes_optedoutat !== null && d.data_attributes_optedoutat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["optedoutat"] = d.data_attributes_optedoutat;
    }
    if (d.data_attributes_otherphones !== undefined && d.data_attributes_otherphones !== null && d.data_attributes_otherphones !== '') {
      body["data_attributes_otherphones"] = d.data_attributes_otherphones;
    }
    if (d.data_attributes_personalnote1 !== undefined && d.data_attributes_personalnote1 !== null && d.data_attributes_personalnote1 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["personalnote1"] = d.data_attributes_personalnote1;
    }
    if (d.data_attributes_personalnote2 !== undefined && d.data_attributes_personalnote2 !== null && d.data_attributes_personalnote2 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["personalnote2"] = d.data_attributes_personalnote2;
    }
    if (d.data_attributes_preferredcontact !== undefined && d.data_attributes_preferredcontact !== null && d.data_attributes_preferredcontact !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["preferredcontact"] = d.data_attributes_preferredcontact;
    }
    if (d.data_attributes_quoraurl !== undefined && d.data_attributes_quoraurl !== null && d.data_attributes_quoraurl !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["quoraurl"] = d.data_attributes_quoraurl;
    }
    if (d.data_attributes_region !== undefined && d.data_attributes_region !== null && d.data_attributes_region !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["region"] = d.data_attributes_region;
    }
    if (d.data_attributes_replycount !== undefined && d.data_attributes_replycount !== null && d.data_attributes_replycount !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["replycount"] = d.data_attributes_replycount;
    }
    if (d.data_attributes_school !== undefined && d.data_attributes_school !== null && d.data_attributes_school !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["school"] = d.data_attributes_school;
    }
    if (d.data_attributes_score !== undefined && d.data_attributes_score !== null && d.data_attributes_score !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["score"] = d.data_attributes_score;
    }
    if (d.data_attributes_sharingteamid !== undefined && d.data_attributes_sharingteamid !== null && d.data_attributes_sharingteamid !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["sharingteamid"] = d.data_attributes_sharingteamid;
    }
    if (d.data_attributes_source !== undefined && d.data_attributes_source !== null && d.data_attributes_source !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["source"] = d.data_attributes_source;
    }
    if (d.data_attributes_specialties !== undefined && d.data_attributes_specialties !== null && d.data_attributes_specialties !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["specialties"] = d.data_attributes_specialties;
    }
    if (d.data_attributes_stackoverflowid !== undefined && d.data_attributes_stackoverflowid !== null && d.data_attributes_stackoverflowid !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["stackoverflowid"] = d.data_attributes_stackoverflowid;
    }
    if (d.data_attributes_stackoverflowurl !== undefined && d.data_attributes_stackoverflowurl !== null && d.data_attributes_stackoverflowurl !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["stackoverflowurl"] = d.data_attributes_stackoverflowurl;
    }
    if (d.data_attributes_tags !== undefined && d.data_attributes_tags !== null && d.data_attributes_tags !== '') {
      body["data_attributes_tags"] = d.data_attributes_tags;
    }
    if (d.data_attributes_timezone !== undefined && d.data_attributes_timezone !== null && d.data_attributes_timezone !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["timezone"] = d.data_attributes_timezone;
    }
    if (d.data_attributes_timezoneiana !== undefined && d.data_attributes_timezoneiana !== null && d.data_attributes_timezoneiana !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["timezoneiana"] = d.data_attributes_timezoneiana;
    }
    if (d.data_attributes_timezoneinferred !== undefined && d.data_attributes_timezoneinferred !== null && d.data_attributes_timezoneinferred !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["timezoneinferred"] = d.data_attributes_timezoneinferred;
    }
    if (d.data_attributes_title !== undefined && d.data_attributes_title !== null && d.data_attributes_title !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["title"] = d.data_attributes_title;
    }
    if (d.data_attributes_touchedat !== undefined && d.data_attributes_touchedat !== null && d.data_attributes_touchedat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["touchedat"] = d.data_attributes_touchedat;
    }
    if (d.data_attributes_trashedat !== undefined && d.data_attributes_trashedat !== null && d.data_attributes_trashedat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["trashedat"] = d.data_attributes_trashedat;
    }
    if (d.data_attributes_twitterurl !== undefined && d.data_attributes_twitterurl !== null && d.data_attributes_twitterurl !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["twitterurl"] = d.data_attributes_twitterurl;
    }
    if (d.data_attributes_twitterusername !== undefined && d.data_attributes_twitterusername !== null && d.data_attributes_twitterusername !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["twitterusername"] = d.data_attributes_twitterusername;
    }
    if (d.data_attributes_updatedat !== undefined && d.data_attributes_updatedat !== null && d.data_attributes_updatedat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["updatedat"] = d.data_attributes_updatedat;
    }
    if (d.data_attributes_voipphones !== undefined && d.data_attributes_voipphones !== null && d.data_attributes_voipphones !== '') {
      body["data_attributes_voipphones"] = d.data_attributes_voipphones;
    }
    if (d.data_attributes_websiteurl1 !== undefined && d.data_attributes_websiteurl1 !== null && d.data_attributes_websiteurl1 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["websiteurl1"] = d.data_attributes_websiteurl1;
    }
    if (d.data_attributes_websiteurl2 !== undefined && d.data_attributes_websiteurl2 !== null && d.data_attributes_websiteurl2 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["websiteurl2"] = d.data_attributes_websiteurl2;
    }
    if (d.data_attributes_websiteurl3 !== undefined && d.data_attributes_websiteurl3 !== null && d.data_attributes_websiteurl3 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["websiteurl3"] = d.data_attributes_websiteurl3;
    }
    if (d.data_attributes_workphones !== undefined && d.data_attributes_workphones !== null && d.data_attributes_workphones !== '') {
      body["data_attributes_workphones"] = d.data_attributes_workphones;
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
    if (d.data_relationships_activesequencestates_data !== undefined && d.data_relationships_activesequencestates_data !== null && d.data_relationships_activesequencestates_data !== '') {
      body["data_relationships_activesequencestates_data"] = d.data_relationships_activesequencestates_data;
    }
    if (d.data_relationships_activesequencestates_links_related !== undefined && d.data_relationships_activesequencestates_links_related !== null && d.data_relationships_activesequencestates_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["activesequencestates"] || typeof body["data"]["relationships"]["activesequencestates"] !== 'object' || Array.isArray(body["data"]["relationships"]["activesequencestates"])) body["data"]["relationships"]["activesequencestates"] = {};
      if (!body["data"]["relationships"]["activesequencestates"]["links"] || typeof body["data"]["relationships"]["activesequencestates"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["activesequencestates"]["links"])) body["data"]["relationships"]["activesequencestates"]["links"] = {};
      body["data"]["relationships"]["activesequencestates"]["links"]["related"] = d.data_relationships_activesequencestates_links_related;
    }
    if (d.data_relationships_assignedteams_data !== undefined && d.data_relationships_assignedteams_data !== null && d.data_relationships_assignedteams_data !== '') {
      body["data_relationships_assignedteams_data"] = d.data_relationships_assignedteams_data;
    }
    if (d.data_relationships_assignedteams_links_related !== undefined && d.data_relationships_assignedteams_links_related !== null && d.data_relationships_assignedteams_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["assignedteams"] || typeof body["data"]["relationships"]["assignedteams"] !== 'object' || Array.isArray(body["data"]["relationships"]["assignedteams"])) body["data"]["relationships"]["assignedteams"] = {};
      if (!body["data"]["relationships"]["assignedteams"]["links"] || typeof body["data"]["relationships"]["assignedteams"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["assignedteams"]["links"])) body["data"]["relationships"]["assignedteams"]["links"] = {};
      body["data"]["relationships"]["assignedteams"]["links"]["related"] = d.data_relationships_assignedteams_links_related;
    }
    if (d.data_relationships_assignedusers_data !== undefined && d.data_relationships_assignedusers_data !== null && d.data_relationships_assignedusers_data !== '') {
      body["data_relationships_assignedusers_data"] = d.data_relationships_assignedusers_data;
    }
    if (d.data_relationships_assignedusers_links_related !== undefined && d.data_relationships_assignedusers_links_related !== null && d.data_relationships_assignedusers_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["assignedusers"] || typeof body["data"]["relationships"]["assignedusers"] !== 'object' || Array.isArray(body["data"]["relationships"]["assignedusers"])) body["data"]["relationships"]["assignedusers"] = {};
      if (!body["data"]["relationships"]["assignedusers"]["links"] || typeof body["data"]["relationships"]["assignedusers"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["assignedusers"]["links"])) body["data"]["relationships"]["assignedusers"]["links"] = {};
      body["data"]["relationships"]["assignedusers"]["links"]["related"] = d.data_relationships_assignedusers_links_related;
    }
    if (d.data_relationships_batches_links_related !== undefined && d.data_relationships_batches_links_related !== null && d.data_relationships_batches_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["batches"] || typeof body["data"]["relationships"]["batches"] !== 'object' || Array.isArray(body["data"]["relationships"]["batches"])) body["data"]["relationships"]["batches"] = {};
      if (!body["data"]["relationships"]["batches"]["links"] || typeof body["data"]["relationships"]["batches"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["batches"]["links"])) body["data"]["relationships"]["batches"]["links"] = {};
      body["data"]["relationships"]["batches"]["links"]["related"] = d.data_relationships_batches_links_related;
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
    if (d.data_relationships_emailaddresses_data !== undefined && d.data_relationships_emailaddresses_data !== null && d.data_relationships_emailaddresses_data !== '') {
      body["data_relationships_emailaddresses_data"] = d.data_relationships_emailaddresses_data;
    }
    if (d.data_relationships_emailaddresses_links_related !== undefined && d.data_relationships_emailaddresses_links_related !== null && d.data_relationships_emailaddresses_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["emailaddresses"] || typeof body["data"]["relationships"]["emailaddresses"] !== 'object' || Array.isArray(body["data"]["relationships"]["emailaddresses"])) body["data"]["relationships"]["emailaddresses"] = {};
      if (!body["data"]["relationships"]["emailaddresses"]["links"] || typeof body["data"]["relationships"]["emailaddresses"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["emailaddresses"]["links"])) body["data"]["relationships"]["emailaddresses"]["links"] = {};
      body["data"]["relationships"]["emailaddresses"]["links"]["related"] = d.data_relationships_emailaddresses_links_related;
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
    if (d.data_relationships_mailings_links_related !== undefined && d.data_relationships_mailings_links_related !== null && d.data_relationships_mailings_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["mailings"] || typeof body["data"]["relationships"]["mailings"] !== 'object' || Array.isArray(body["data"]["relationships"]["mailings"])) body["data"]["relationships"]["mailings"] = {};
      if (!body["data"]["relationships"]["mailings"]["links"] || typeof body["data"]["relationships"]["mailings"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["mailings"]["links"])) body["data"]["relationships"]["mailings"]["links"] = {};
      body["data"]["relationships"]["mailings"]["links"]["related"] = d.data_relationships_mailings_links_related;
    }
    if (d.data_relationships_opportunities_data !== undefined && d.data_relationships_opportunities_data !== null && d.data_relationships_opportunities_data !== '') {
      body["data_relationships_opportunities_data"] = d.data_relationships_opportunities_data;
    }
    if (d.data_relationships_opportunities_links_related !== undefined && d.data_relationships_opportunities_links_related !== null && d.data_relationships_opportunities_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["opportunities"] || typeof body["data"]["relationships"]["opportunities"] !== 'object' || Array.isArray(body["data"]["relationships"]["opportunities"])) body["data"]["relationships"]["opportunities"] = {};
      if (!body["data"]["relationships"]["opportunities"]["links"] || typeof body["data"]["relationships"]["opportunities"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["opportunities"]["links"])) body["data"]["relationships"]["opportunities"]["links"] = {};
      body["data"]["relationships"]["opportunities"]["links"]["related"] = d.data_relationships_opportunities_links_related;
    }
    if (d.data_relationships_opportunityprospectroles_data !== undefined && d.data_relationships_opportunityprospectroles_data !== null && d.data_relationships_opportunityprospectroles_data !== '') {
      body["data_relationships_opportunityprospectroles_data"] = d.data_relationships_opportunityprospectroles_data;
    }
    if (d.data_relationships_opportunityprospectroles_links_related !== undefined && d.data_relationships_opportunityprospectroles_links_related !== null && d.data_relationships_opportunityprospectroles_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["opportunityprospectroles"] || typeof body["data"]["relationships"]["opportunityprospectroles"] !== 'object' || Array.isArray(body["data"]["relationships"]["opportunityprospectroles"])) body["data"]["relationships"]["opportunityprospectroles"] = {};
      if (!body["data"]["relationships"]["opportunityprospectroles"]["links"] || typeof body["data"]["relationships"]["opportunityprospectroles"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["opportunityprospectroles"]["links"])) body["data"]["relationships"]["opportunityprospectroles"]["links"] = {};
      body["data"]["relationships"]["opportunityprospectroles"]["links"]["related"] = d.data_relationships_opportunityprospectroles_links_related;
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
    if (d.data_relationships_persona_data_id !== undefined && d.data_relationships_persona_data_id !== null && d.data_relationships_persona_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["persona"] || typeof body["data"]["relationships"]["persona"] !== 'object' || Array.isArray(body["data"]["relationships"]["persona"])) body["data"]["relationships"]["persona"] = {};
      if (!body["data"]["relationships"]["persona"]["data"] || typeof body["data"]["relationships"]["persona"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["persona"]["data"])) body["data"]["relationships"]["persona"]["data"] = {};
      body["data"]["relationships"]["persona"]["data"]["id"] = d.data_relationships_persona_data_id;
    }
    if (d.data_relationships_persona_data_type !== undefined && d.data_relationships_persona_data_type !== null && d.data_relationships_persona_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["persona"] || typeof body["data"]["relationships"]["persona"] !== 'object' || Array.isArray(body["data"]["relationships"]["persona"])) body["data"]["relationships"]["persona"] = {};
      if (!body["data"]["relationships"]["persona"]["data"] || typeof body["data"]["relationships"]["persona"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["persona"]["data"])) body["data"]["relationships"]["persona"]["data"] = {};
      body["data"]["relationships"]["persona"]["data"]["type"] = d.data_relationships_persona_data_type;
    }
    if (d.data_relationships_persona_links_related !== undefined && d.data_relationships_persona_links_related !== null && d.data_relationships_persona_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["persona"] || typeof body["data"]["relationships"]["persona"] !== 'object' || Array.isArray(body["data"]["relationships"]["persona"])) body["data"]["relationships"]["persona"] = {};
      if (!body["data"]["relationships"]["persona"]["links"] || typeof body["data"]["relationships"]["persona"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["persona"]["links"])) body["data"]["relationships"]["persona"]["links"] = {};
      body["data"]["relationships"]["persona"]["links"]["related"] = d.data_relationships_persona_links_related;
    }
    if (d.data_relationships_phonenumbers_data !== undefined && d.data_relationships_phonenumbers_data !== null && d.data_relationships_phonenumbers_data !== '') {
      body["data_relationships_phonenumbers_data"] = d.data_relationships_phonenumbers_data;
    }
    if (d.data_relationships_phonenumbers_links_related !== undefined && d.data_relationships_phonenumbers_links_related !== null && d.data_relationships_phonenumbers_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["phonenumbers"] || typeof body["data"]["relationships"]["phonenumbers"] !== 'object' || Array.isArray(body["data"]["relationships"]["phonenumbers"])) body["data"]["relationships"]["phonenumbers"] = {};
      if (!body["data"]["relationships"]["phonenumbers"]["links"] || typeof body["data"]["relationships"]["phonenumbers"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["phonenumbers"]["links"])) body["data"]["relationships"]["phonenumbers"]["links"] = {};
      body["data"]["relationships"]["phonenumbers"]["links"]["related"] = d.data_relationships_phonenumbers_links_related;
    }
    if (d.data_relationships_sequencestates_links_related !== undefined && d.data_relationships_sequencestates_links_related !== null && d.data_relationships_sequencestates_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["sequencestates"] || typeof body["data"]["relationships"]["sequencestates"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequencestates"])) body["data"]["relationships"]["sequencestates"] = {};
      if (!body["data"]["relationships"]["sequencestates"]["links"] || typeof body["data"]["relationships"]["sequencestates"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["sequencestates"]["links"])) body["data"]["relationships"]["sequencestates"]["links"] = {};
      body["data"]["relationships"]["sequencestates"]["links"]["related"] = d.data_relationships_sequencestates_links_related;
    }
    if (d.data_relationships_stage_data_id !== undefined && d.data_relationships_stage_data_id !== null && d.data_relationships_stage_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["stage"] || typeof body["data"]["relationships"]["stage"] !== 'object' || Array.isArray(body["data"]["relationships"]["stage"])) body["data"]["relationships"]["stage"] = {};
      if (!body["data"]["relationships"]["stage"]["data"] || typeof body["data"]["relationships"]["stage"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["stage"]["data"])) body["data"]["relationships"]["stage"]["data"] = {};
      body["data"]["relationships"]["stage"]["data"]["id"] = d.data_relationships_stage_data_id;
    }
    if (d.data_relationships_stage_data_type !== undefined && d.data_relationships_stage_data_type !== null && d.data_relationships_stage_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["stage"] || typeof body["data"]["relationships"]["stage"] !== 'object' || Array.isArray(body["data"]["relationships"]["stage"])) body["data"]["relationships"]["stage"] = {};
      if (!body["data"]["relationships"]["stage"]["data"] || typeof body["data"]["relationships"]["stage"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["stage"]["data"])) body["data"]["relationships"]["stage"]["data"] = {};
      body["data"]["relationships"]["stage"]["data"]["type"] = d.data_relationships_stage_data_type;
    }
    if (d.data_relationships_stage_links_related !== undefined && d.data_relationships_stage_links_related !== null && d.data_relationships_stage_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["stage"] || typeof body["data"]["relationships"]["stage"] !== 'object' || Array.isArray(body["data"]["relationships"]["stage"])) body["data"]["relationships"]["stage"] = {};
      if (!body["data"]["relationships"]["stage"]["links"] || typeof body["data"]["relationships"]["stage"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["stage"]["links"])) body["data"]["relationships"]["stage"]["links"] = {};
      body["data"]["relationships"]["stage"]["links"]["related"] = d.data_relationships_stage_links_related;
    }
    if (d.data_relationships_tasks_links_related !== undefined && d.data_relationships_tasks_links_related !== null && d.data_relationships_tasks_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["tasks"] || typeof body["data"]["relationships"]["tasks"] !== 'object' || Array.isArray(body["data"]["relationships"]["tasks"])) body["data"]["relationships"]["tasks"] = {};
      if (!body["data"]["relationships"]["tasks"]["links"] || typeof body["data"]["relationships"]["tasks"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["tasks"]["links"])) body["data"]["relationships"]["tasks"]["links"] = {};
      body["data"]["relationships"]["tasks"]["links"]["related"] = d.data_relationships_tasks_links_related;
    }
    if (d.data_relationships_trashedbyaccount_data_id !== undefined && d.data_relationships_trashedbyaccount_data_id !== null && d.data_relationships_trashedbyaccount_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["trashedbyaccount"] || typeof body["data"]["relationships"]["trashedbyaccount"] !== 'object' || Array.isArray(body["data"]["relationships"]["trashedbyaccount"])) body["data"]["relationships"]["trashedbyaccount"] = {};
      if (!body["data"]["relationships"]["trashedbyaccount"]["data"] || typeof body["data"]["relationships"]["trashedbyaccount"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["trashedbyaccount"]["data"])) body["data"]["relationships"]["trashedbyaccount"]["data"] = {};
      body["data"]["relationships"]["trashedbyaccount"]["data"]["id"] = d.data_relationships_trashedbyaccount_data_id;
    }
    if (d.data_relationships_trashedbyaccount_data_type !== undefined && d.data_relationships_trashedbyaccount_data_type !== null && d.data_relationships_trashedbyaccount_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["trashedbyaccount"] || typeof body["data"]["relationships"]["trashedbyaccount"] !== 'object' || Array.isArray(body["data"]["relationships"]["trashedbyaccount"])) body["data"]["relationships"]["trashedbyaccount"] = {};
      if (!body["data"]["relationships"]["trashedbyaccount"]["data"] || typeof body["data"]["relationships"]["trashedbyaccount"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["trashedbyaccount"]["data"])) body["data"]["relationships"]["trashedbyaccount"]["data"] = {};
      body["data"]["relationships"]["trashedbyaccount"]["data"]["type"] = d.data_relationships_trashedbyaccount_data_type;
    }
    if (d.data_relationships_trashedbyaccount_links_related !== undefined && d.data_relationships_trashedbyaccount_links_related !== null && d.data_relationships_trashedbyaccount_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["trashedbyaccount"] || typeof body["data"]["relationships"]["trashedbyaccount"] !== 'object' || Array.isArray(body["data"]["relationships"]["trashedbyaccount"])) body["data"]["relationships"]["trashedbyaccount"] = {};
      if (!body["data"]["relationships"]["trashedbyaccount"]["links"] || typeof body["data"]["relationships"]["trashedbyaccount"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["trashedbyaccount"]["links"])) body["data"]["relationships"]["trashedbyaccount"]["links"] = {};
      body["data"]["relationships"]["trashedbyaccount"]["links"]["related"] = d.data_relationships_trashedbyaccount_links_related;
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

