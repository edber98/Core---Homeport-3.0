const express = require('express');
const { sign } = require('../auth/jwt');
const { verifyPassword } = require('../utils/crypto');

module.exports = function(store){
  const r = express.Router();

  r.post('/login', (req, res) => {
    const { email, password } = req.body || {};
    const user = [...store.users.values()].find(u => u.email.toLowerCase() === String(email||'').toLowerCase());
    if (!user) return res.apiError(401, 'invalid_credentials', 'Invalid email or password');
    if (!verifyPassword(password || '', user.pwdHash)) return res.apiError(401, 'invalid_credentials', 'Invalid email or password');
    const company = store.companies.get(user.companyId);
    const token = sign({ user: { id: user.id, email: user.email, role: user.role, companyId: user.companyId } });
    res.apiOk({ token, user: { id: user.id, email: user.email, role: user.role }, company });
  });

  return r;
}
