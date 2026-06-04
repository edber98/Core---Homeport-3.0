const { utils } = require('./utils');

module.exports = {
  async activecampaign_ecomorder_update_order_updateorderresource(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/ecomOrders/{id}";
    const id = String(d.id || '').trim();
    if (!id) return { ok: false, error: 'id requis.' };
    reqPath = reqPath.replace('{id}', encodeURIComponent(id));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = {};
    if (d.ecomorder_externalid !== undefined && d.ecomorder_externalid !== null && d.ecomorder_externalid !== "") {
          if (!body["ecomorder"] || typeof body["ecomorder"] !== 'object' || Array.isArray(body["ecomorder"])) body["ecomorder"] = {};
          body["ecomorder"]["externalid"] = d.ecomorder_externalid;
        }
    if (d.ecomorder_externalcheckoutid !== undefined && d.ecomorder_externalcheckoutid !== null && d.ecomorder_externalcheckoutid !== "") {
          if (!body["ecomorder"] || typeof body["ecomorder"] !== 'object' || Array.isArray(body["ecomorder"])) body["ecomorder"] = {};
          body["ecomorder"]["externalcheckoutid"] = d.ecomorder_externalcheckoutid;
        }
    if (d.ecomorder_email !== undefined && d.ecomorder_email !== null && d.ecomorder_email !== "") {
          if (!body["ecomorder"] || typeof body["ecomorder"] !== 'object' || Array.isArray(body["ecomorder"])) body["ecomorder"] = {};
          body["ecomorder"]["email"] = d.ecomorder_email;
        }
    if (d.ecomorder_orderproducts_name !== undefined && d.ecomorder_orderproducts_name !== null && d.ecomorder_orderproducts_name !== "") {
          if (!body["ecomorder"] || typeof body["ecomorder"] !== 'object' || Array.isArray(body["ecomorder"])) body["ecomorder"] = {};
          if (!body["ecomorder"]["orderproducts"] || typeof body["ecomorder"]["orderproducts"] !== 'object' || Array.isArray(body["ecomorder"]["orderproducts"])) body["ecomorder"]["orderproducts"] = {};
          body["ecomorder"]["orderproducts"]["name"] = d.ecomorder_orderproducts_name;
        }
    if (d.ecomorder_orderproducts_price !== undefined && d.ecomorder_orderproducts_price !== null && d.ecomorder_orderproducts_price !== "") {
          if (!body["ecomorder"] || typeof body["ecomorder"] !== 'object' || Array.isArray(body["ecomorder"])) body["ecomorder"] = {};
          if (!body["ecomorder"]["orderproducts"] || typeof body["ecomorder"]["orderproducts"] !== 'object' || Array.isArray(body["ecomorder"]["orderproducts"])) body["ecomorder"]["orderproducts"] = {};
          body["ecomorder"]["orderproducts"]["price"] = d.ecomorder_orderproducts_price;
        }
    if (d.ecomorder_orderproducts_quantity !== undefined && d.ecomorder_orderproducts_quantity !== null && d.ecomorder_orderproducts_quantity !== "") {
          if (!body["ecomorder"] || typeof body["ecomorder"] !== 'object' || Array.isArray(body["ecomorder"])) body["ecomorder"] = {};
          if (!body["ecomorder"]["orderproducts"] || typeof body["ecomorder"]["orderproducts"] !== 'object' || Array.isArray(body["ecomorder"]["orderproducts"])) body["ecomorder"]["orderproducts"] = {};
          body["ecomorder"]["orderproducts"]["quantity"] = d.ecomorder_orderproducts_quantity;
        }
    if (d.ecomorder_orderproducts_externalid !== undefined && d.ecomorder_orderproducts_externalid !== null && d.ecomorder_orderproducts_externalid !== "") {
          if (!body["ecomorder"] || typeof body["ecomorder"] !== 'object' || Array.isArray(body["ecomorder"])) body["ecomorder"] = {};
          if (!body["ecomorder"]["orderproducts"] || typeof body["ecomorder"]["orderproducts"] !== 'object' || Array.isArray(body["ecomorder"]["orderproducts"])) body["ecomorder"]["orderproducts"] = {};
          body["ecomorder"]["orderproducts"]["externalid"] = d.ecomorder_orderproducts_externalid;
        }
    if (d.ecomorder_orderproducts_category !== undefined && d.ecomorder_orderproducts_category !== null && d.ecomorder_orderproducts_category !== "") {
          if (!body["ecomorder"] || typeof body["ecomorder"] !== 'object' || Array.isArray(body["ecomorder"])) body["ecomorder"] = {};
          if (!body["ecomorder"]["orderproducts"] || typeof body["ecomorder"]["orderproducts"] !== 'object' || Array.isArray(body["ecomorder"]["orderproducts"])) body["ecomorder"]["orderproducts"] = {};
          body["ecomorder"]["orderproducts"]["category"] = d.ecomorder_orderproducts_category;
        }
    if (d.ecomorder_orderproducts_sku !== undefined && d.ecomorder_orderproducts_sku !== null && d.ecomorder_orderproducts_sku !== "") {
          if (!body["ecomorder"] || typeof body["ecomorder"] !== 'object' || Array.isArray(body["ecomorder"])) body["ecomorder"] = {};
          if (!body["ecomorder"]["orderproducts"] || typeof body["ecomorder"]["orderproducts"] !== 'object' || Array.isArray(body["ecomorder"]["orderproducts"])) body["ecomorder"]["orderproducts"] = {};
          body["ecomorder"]["orderproducts"]["sku"] = d.ecomorder_orderproducts_sku;
        }
    if (d.ecomorder_orderproducts_description !== undefined && d.ecomorder_orderproducts_description !== null && d.ecomorder_orderproducts_description !== "") {
          if (!body["ecomorder"] || typeof body["ecomorder"] !== 'object' || Array.isArray(body["ecomorder"])) body["ecomorder"] = {};
          if (!body["ecomorder"]["orderproducts"] || typeof body["ecomorder"]["orderproducts"] !== 'object' || Array.isArray(body["ecomorder"]["orderproducts"])) body["ecomorder"]["orderproducts"] = {};
          body["ecomorder"]["orderproducts"]["description"] = d.ecomorder_orderproducts_description;
        }
    if (d.ecomorder_orderproducts_imageurl !== undefined && d.ecomorder_orderproducts_imageurl !== null && d.ecomorder_orderproducts_imageurl !== "") {
          if (!body["ecomorder"] || typeof body["ecomorder"] !== 'object' || Array.isArray(body["ecomorder"])) body["ecomorder"] = {};
          if (!body["ecomorder"]["orderproducts"] || typeof body["ecomorder"]["orderproducts"] !== 'object' || Array.isArray(body["ecomorder"]["orderproducts"])) body["ecomorder"]["orderproducts"] = {};
          body["ecomorder"]["orderproducts"]["imageurl"] = d.ecomorder_orderproducts_imageurl;
        }
    if (d.ecomorder_orderproducts_producturl !== undefined && d.ecomorder_orderproducts_producturl !== null && d.ecomorder_orderproducts_producturl !== "") {
          if (!body["ecomorder"] || typeof body["ecomorder"] !== 'object' || Array.isArray(body["ecomorder"])) body["ecomorder"] = {};
          if (!body["ecomorder"]["orderproducts"] || typeof body["ecomorder"]["orderproducts"] !== 'object' || Array.isArray(body["ecomorder"]["orderproducts"])) body["ecomorder"]["orderproducts"] = {};
          body["ecomorder"]["orderproducts"]["producturl"] = d.ecomorder_orderproducts_producturl;
        }
    if (d.ecomorder_totalprice !== undefined && d.ecomorder_totalprice !== null && d.ecomorder_totalprice !== "") {
          if (!body["ecomorder"] || typeof body["ecomorder"] !== 'object' || Array.isArray(body["ecomorder"])) body["ecomorder"] = {};
          body["ecomorder"]["totalprice"] = d.ecomorder_totalprice;
        }
    if (d.ecomorder_shippingamount !== undefined && d.ecomorder_shippingamount !== null && d.ecomorder_shippingamount !== "") {
          if (!body["ecomorder"] || typeof body["ecomorder"] !== 'object' || Array.isArray(body["ecomorder"])) body["ecomorder"] = {};
          body["ecomorder"]["shippingamount"] = d.ecomorder_shippingamount;
        }
    if (d.ecomorder_taxamount !== undefined && d.ecomorder_taxamount !== null && d.ecomorder_taxamount !== "") {
          if (!body["ecomorder"] || typeof body["ecomorder"] !== 'object' || Array.isArray(body["ecomorder"])) body["ecomorder"] = {};
          body["ecomorder"]["taxamount"] = d.ecomorder_taxamount;
        }
    if (d.ecomorder_discountamount !== undefined && d.ecomorder_discountamount !== null && d.ecomorder_discountamount !== "") {
          if (!body["ecomorder"] || typeof body["ecomorder"] !== 'object' || Array.isArray(body["ecomorder"])) body["ecomorder"] = {};
          body["ecomorder"]["discountamount"] = d.ecomorder_discountamount;
        }
    if (d.ecomorder_currency !== undefined && d.ecomorder_currency !== null && d.ecomorder_currency !== "") {
          if (!body["ecomorder"] || typeof body["ecomorder"] !== 'object' || Array.isArray(body["ecomorder"])) body["ecomorder"] = {};
          body["ecomorder"]["currency"] = d.ecomorder_currency;
        }
    if (d.ecomorder_orderurl !== undefined && d.ecomorder_orderurl !== null && d.ecomorder_orderurl !== "") {
          if (!body["ecomorder"] || typeof body["ecomorder"] !== 'object' || Array.isArray(body["ecomorder"])) body["ecomorder"] = {};
          body["ecomorder"]["orderurl"] = d.ecomorder_orderurl;
        }
    if (d.ecomorder_externalupdateddate !== undefined && d.ecomorder_externalupdateddate !== null && d.ecomorder_externalupdateddate !== "") {
          if (!body["ecomorder"] || typeof body["ecomorder"] !== 'object' || Array.isArray(body["ecomorder"])) body["ecomorder"] = {};
          body["ecomorder"]["externalupdateddate"] = d.ecomorder_externalupdateddate;
        }
    if (d.ecomorder_abandoneddate !== undefined && d.ecomorder_abandoneddate !== null && d.ecomorder_abandoneddate !== "") {
          if (!body["ecomorder"] || typeof body["ecomorder"] !== 'object' || Array.isArray(body["ecomorder"])) body["ecomorder"] = {};
          body["ecomorder"]["abandoneddate"] = d.ecomorder_abandoneddate;
        }
    if (d.ecomorder_shippingmethod !== undefined && d.ecomorder_shippingmethod !== null && d.ecomorder_shippingmethod !== "") {
          if (!body["ecomorder"] || typeof body["ecomorder"] !== 'object' || Array.isArray(body["ecomorder"])) body["ecomorder"] = {};
          body["ecomorder"]["shippingmethod"] = d.ecomorder_shippingmethod;
        }
    if (d.ecomorder_ordernumber !== undefined && d.ecomorder_ordernumber !== null && d.ecomorder_ordernumber !== "") {
          if (!body["ecomorder"] || typeof body["ecomorder"] !== 'object' || Array.isArray(body["ecomorder"])) body["ecomorder"] = {};
          body["ecomorder"]["ordernumber"] = d.ecomorder_ordernumber;
        }
    if (d.ecomorder_orderdiscounts_name !== undefined && d.ecomorder_orderdiscounts_name !== null && d.ecomorder_orderdiscounts_name !== "") {
          if (!body["ecomorder"] || typeof body["ecomorder"] !== 'object' || Array.isArray(body["ecomorder"])) body["ecomorder"] = {};
          if (!body["ecomorder"]["orderdiscounts"] || typeof body["ecomorder"]["orderdiscounts"] !== 'object' || Array.isArray(body["ecomorder"]["orderdiscounts"])) body["ecomorder"]["orderdiscounts"] = {};
          body["ecomorder"]["orderdiscounts"]["name"] = d.ecomorder_orderdiscounts_name;
        }
    if (d.ecomorder_orderdiscounts_type !== undefined && d.ecomorder_orderdiscounts_type !== null && d.ecomorder_orderdiscounts_type !== "") {
          if (!body["ecomorder"] || typeof body["ecomorder"] !== 'object' || Array.isArray(body["ecomorder"])) body["ecomorder"] = {};
          if (!body["ecomorder"]["orderdiscounts"] || typeof body["ecomorder"]["orderdiscounts"] !== 'object' || Array.isArray(body["ecomorder"]["orderdiscounts"])) body["ecomorder"]["orderdiscounts"] = {};
          body["ecomorder"]["orderdiscounts"]["type"] = d.ecomorder_orderdiscounts_type;
        }
    if (d.ecomorder_orderdiscounts_discountamount !== undefined && d.ecomorder_orderdiscounts_discountamount !== null && d.ecomorder_orderdiscounts_discountamount !== "") {
          if (!body["ecomorder"] || typeof body["ecomorder"] !== 'object' || Array.isArray(body["ecomorder"])) body["ecomorder"] = {};
          if (!body["ecomorder"]["orderdiscounts"] || typeof body["ecomorder"]["orderdiscounts"] !== 'object' || Array.isArray(body["ecomorder"]["orderdiscounts"])) body["ecomorder"]["orderdiscounts"] = {};
          body["ecomorder"]["orderdiscounts"]["discountamount"] = d.ecomorder_orderdiscounts_discountamount;
        }
    const requestBody = Object.keys(body).length ? body : undefined;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'PUT', query, body: requestBody });
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
