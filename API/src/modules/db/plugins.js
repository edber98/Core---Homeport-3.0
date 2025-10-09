const express = require('express');
const { authMiddleware, requireCompanyScope, requireAdmin } = require('../../auth/jwt');
const { registry } = require('../../plugins/registry');

module.exports = function(){
  const r = express.Router();
  r.use(authMiddleware());
  r.use(requireCompanyScope());

  r.get('/plugins', (req, res) => {
    let { limit = 200, page = 1, q, sort } = req.query;
    limit = Math.max(1, Math.min(500, Number(limit) || 200));
    page = Math.max(1, Number(page) || 1);
    let list = registry.list();
    if (q) list = list.filter(it => String(it.key).toLowerCase().includes(String(q).toLowerCase()));
    if (sort) {
      const [f,d] = String(sort).split(':');
      list = list.sort((a,b) => String(a[f]||'').localeCompare(String(b[f]||'')) * (d==='desc'?-1:1));
    }
    const slice = list.slice((page - 1) * limit, (page - 1) * limit + limit);
    res.apiOk(slice);
  });

  r.post('/plugins/reload', requireAdmin(), (_req, res) => {
    const loaded = registry.reload();
    res.apiOk({ loaded });
  });

  return r;
}
