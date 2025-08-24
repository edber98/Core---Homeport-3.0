const express = require('express');
const { authMiddleware, requireCompanyScope } = require('../auth/jwt');

module.exports = function(store){
  const r = express.Router();

  r.use(authMiddleware(store));
  r.use(requireCompanyScope());

  r.get('/company', (req, res) => {
    const c = store.companies.get(req.user.companyId);
    res.apiOk(c || null);
  });

  r.get('/workspaces', (req, res) => {
    const list = [...store.workspaces.values()].filter(w => w.companyId === req.user.companyId);
    res.apiOk(list);
  });

  return r;
}
