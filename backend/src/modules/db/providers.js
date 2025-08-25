const express = require('express');
const { authMiddleware, requireCompanyScope } = require('../../auth/jwt');
const Provider = require('../../db/models/provider.model');

module.exports = function(){
  const r = express.Router();
  r.use(authMiddleware());
  r.use(requireCompanyScope());
  r.get('/providers', async (req, res) => {
    let { limit = 100, page = 1 } = req.query;
    limit = Math.max(1, Math.min(200, Number(limit) || 100));
    page = Math.max(1, Number(page) || 1);
    const { q, sort } = req.query;
    const query = { enabled: true };
    if (q) {
      const rx = { $regex: String(q), $options: 'i' };
      Object.assign(query, { $or: [ { name: rx }, { title: rx }, { tags: rx } ] });
    }
    let sortObj = { name: 1 };
    if (typeof sort === 'string') {
      const [field, dir] = String(sort).split(':');
      if (field) sortObj = { [field]: (dir === 'desc' ? -1 : 1) };
    }
    const list = await Provider.find(query)
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    res.apiOk(list);
  });

  const { requireAdmin } = require('../../auth/jwt');
  r.put('/providers/:key', requireAdmin(), async (req, res) => {
    const p = await Provider.findOne({ key: req.params.key });
    if (!p) return res.apiError(404, 'provider_not_found', 'Provider not found');
    Object.assign(p, req.body || {});
    await p.save();
    res.apiOk(p);
  });
  return r;
}
