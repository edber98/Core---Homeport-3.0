const express = require('express');
const { authMiddleware, requireCompanyScope, requireAdmin } = require('../../auth/jwt');
const { registry } = require('../../plugins/registry');

module.exports = function(){
  const r = express.Router();
  r.use(authMiddleware());
  r.use(requireCompanyScope());

  r.get('/plugins', (_req, res) => {
    res.apiOk(registry.list());
  });

  r.post('/plugins/reload', requireAdmin(), (_req, res) => {
    const loaded = registry.reload();
    res.apiOk({ loaded });
  });

  return r;
}

