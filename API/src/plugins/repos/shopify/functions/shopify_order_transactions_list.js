const { utils } = require('./utils');
module.exports = { async shopify_order_transactions_list(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.orderId) return { ok: false, error: 'Missing orderId.' };
  const res = await utils.shopifyRequest(opts, `/orders/${encodeURIComponent(String(d.orderId))}/transactions.json`);
  if (!res.ok) return res;
  const tx = Array.isArray(res.data?.transactions) ? res.data.transactions : [];
  const orders = tx.map(t => ({ id: String(t.id||''), order_number: String(d.orderId), email: '', financial_status: t.status || '', fulfillment_status: t.kind || '', total_price: t.amount || '', currency: t.currency || '', created_at: t.created_at || '', customer_id: '' }));
  return { ok: true, orders, totalCount: orders.length };
} };
