const express = require('express');
const { authMiddleware, requireAdmin } = require('../auth/jwt');
const { seedAll } = require('../seed');

module.exports = function(store){
  const r = express.Router();
  r.use(authMiddleware(store));
  r.use(requireAdmin());

  r.post('/admin/reset', (req, res) => {
    seedAll(store);
    res.apiOk({ ok: true });
  });

  return r;
}
