const { utils } = require('./utils');

module.exports = {
  async outreach_product_update_update_a_product(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/products/{id}";
    const id = String(d.id || '').trim();
    if (!id) return { ok: false, error: 'id requis.' };
    reqPath = reqPath.replace('{id}', encodeURIComponent(id));

    const query = {};

    const headers = {};

    const body = {};
    if (d.data_attributes_classification !== undefined && d.data_attributes_classification !== null && d.data_attributes_classification !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["classification"] = d.data_attributes_classification;
    }
    if (d.data_attributes_code !== undefined && d.data_attributes_code !== null && d.data_attributes_code !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["code"] = d.data_attributes_code;
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
    if (d.data_attributes_deleted !== undefined && d.data_attributes_deleted !== null && d.data_attributes_deleted !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["deleted"] = d.data_attributes_deleted;
    }
    if (d.data_attributes_description !== undefined && d.data_attributes_description !== null && d.data_attributes_description !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["description"] = d.data_attributes_description;
    }
    if (d.data_attributes_name !== undefined && d.data_attributes_name !== null && d.data_attributes_name !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["name"] = d.data_attributes_name;
    }
    if (d.data_attributes_productfamily !== undefined && d.data_attributes_productfamily !== null && d.data_attributes_productfamily !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["productfamily"] = d.data_attributes_productfamily;
    }
    if (d.data_attributes_status !== undefined && d.data_attributes_status !== null && d.data_attributes_status !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["status"] = d.data_attributes_status;
    }
    if (d.data_attributes_unitofmeasure !== undefined && d.data_attributes_unitofmeasure !== null && d.data_attributes_unitofmeasure !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["unitofmeasure"] = d.data_attributes_unitofmeasure;
    }
    if (d.data_attributes_updatedat !== undefined && d.data_attributes_updatedat !== null && d.data_attributes_updatedat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["updatedat"] = d.data_attributes_updatedat;
    }
    if (d.data_attributes_website !== undefined && d.data_attributes_website !== null && d.data_attributes_website !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["website"] = d.data_attributes_website;
    }
    if (d.data_id !== undefined && d.data_id !== null && d.data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      body["data"]["id"] = d.data_id;
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
    if (d.data_relationships_purchases_links_related !== undefined && d.data_relationships_purchases_links_related !== null && d.data_relationships_purchases_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["purchases"] || typeof body["data"]["relationships"]["purchases"] !== 'object' || Array.isArray(body["data"]["relationships"]["purchases"])) body["data"]["relationships"]["purchases"] = {};
      if (!body["data"]["relationships"]["purchases"]["links"] || typeof body["data"]["relationships"]["purchases"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["purchases"]["links"])) body["data"]["relationships"]["purchases"]["links"] = {};
      body["data"]["relationships"]["purchases"]["links"]["related"] = d.data_relationships_purchases_links_related;
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

