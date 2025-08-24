const express = require('express');
const { authMiddleware, requireCompanyScope } = require('../../auth/jwt');
const Provider = require('../../db/models/provider.model');

module.exports = function(){
  const r = express.Router();
  r.use(authMiddleware());
  r.use(requireCompanyScope());
  r.get('/providers', async (_req, res) => {
    const list = await Provider.find({ enabled: true }).lean();
    res.apiOk(list);
  });

  r.put('/providers/:key', async (req, res) => {
    const p = await Provider.findOne({ key: req.params.key });
    if (!p) return res.apiError(404, 'provider_not_found', 'Provider not found');
    Object.assign(p, req.body || {});
    await p.save();
    res.apiOk(p);
  });
  return r;
}
