const { utils } = require('./utils');

const BODY_FIELDS = [
  {
    "key": "code",
    "type": "text",
    "bodyPath": [
      "Code"
    ]
  },
  {
    "key": "inventory_asset_account_code",
    "type": "text",
    "bodyPath": [
      "InventoryAssetAccountCode"
    ]
  },
  {
    "key": "name",
    "type": "text",
    "bodyPath": [
      "Name"
    ]
  },
  {
    "key": "is_sold",
    "type": "checkbox",
    "bodyPath": [
      "IsSold"
    ]
  },
  {
    "key": "is_purchased",
    "type": "checkbox",
    "bodyPath": [
      "IsPurchased"
    ]
  },
  {
    "key": "description",
    "type": "text",
    "bodyPath": [
      "Description"
    ]
  },
  {
    "key": "purchase_description",
    "type": "text",
    "bodyPath": [
      "PurchaseDescription"
    ]
  },
  {
    "key": "purchase_details_unit_price",
    "type": "number",
    "bodyPath": [
      "PurchaseDetails",
      "UnitPrice"
    ]
  },
  {
    "key": "purchase_details_account_code",
    "type": "text",
    "bodyPath": [
      "PurchaseDetails",
      "AccountCode"
    ]
  },
  {
    "key": "purchase_details_cogsaccount_code",
    "type": "text",
    "bodyPath": [
      "PurchaseDetails",
      "COGSAccountCode"
    ]
  },
  {
    "key": "purchase_details_tax_type",
    "type": "text",
    "bodyPath": [
      "PurchaseDetails",
      "TaxType"
    ]
  },
  {
    "key": "sales_details_unit_price",
    "type": "number",
    "bodyPath": [
      "SalesDetails",
      "UnitPrice"
    ]
  },
  {
    "key": "sales_details_account_code",
    "type": "text",
    "bodyPath": [
      "SalesDetails",
      "AccountCode"
    ]
  },
  {
    "key": "sales_details_cogsaccount_code",
    "type": "text",
    "bodyPath": [
      "SalesDetails",
      "COGSAccountCode"
    ]
  },
  {
    "key": "sales_details_tax_type",
    "type": "text",
    "bodyPath": [
      "SalesDetails",
      "TaxType"
    ]
  },
  {
    "key": "is_tracked_as_inventory",
    "type": "checkbox",
    "bodyPath": [
      "IsTrackedAsInventory"
    ]
  },
  {
    "key": "total_cost_pool",
    "type": "number",
    "bodyPath": [
      "TotalCostPool"
    ]
  },
  {
    "key": "quantity_on_hand",
    "type": "number",
    "bodyPath": [
      "QuantityOnHand"
    ]
  },
  {
    "key": "updated_date_utc",
    "type": "text",
    "bodyPath": [
      "UpdatedDateUTC"
    ]
  },
  {
    "key": "item_id",
    "type": "text",
    "bodyPath": [
      "ItemID"
    ]
  },
  {
    "key": "status_attribute_string",
    "type": "text",
    "bodyPath": [
      "StatusAttributeString"
    ]
  },
  {
    "key": "validation_errors",
    "type": "json",
    "bodyPath": [
      "ValidationErrors"
    ]
  }
];


module.exports = {
  async xero_item_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/Items/{itemId}";
    const itemid = String(d.itemid || '').trim();
    if (!itemid) return { ok: false, error: 'itemid requis.' };
    reqPath = reqPath.replace('{itemid}', encodeURIComponent(itemid));

    const query = {};
    let body;
    try {
      body = utils.buildBodyFromFields(d, BODY_FIELDS);
    } catch (e) {
      return { ok: false, error: e.message };
    }

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'POST', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return {
      ok: true,
      ...(r && typeof r === 'object' ? r : { value: r }),
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
