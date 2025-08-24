const express = require('express');
const { sign } = require('../../auth/jwt');
const { verifyPassword } = require('../../utils/crypto');
const User = require('../../db/models/user.model');
const Company = require('../../db/models/company.model');

module.exports = function(){
  const r = express.Router();
  r.post('/login', async (req, res) => {
    const { email, password } = req.body || {};
    const user = await User.findOne({ email: String(email||'').toLowerCase() });
    if (!user) return res.apiError(401, 'invalid_credentials', 'Invalid email or password');
    if (!verifyPassword(password || '', user.pwdHash)) return res.apiError(401, 'invalid_credentials', 'Invalid email or password');
    const company = await Company.findById(user.companyId);
    const token = sign({ user: { id: String(user._id), email: user.email, role: user.role, companyId: String(user.companyId) } });
    res.apiOk({ token, user: { id: String(user._id), email: user.email, role: user.role }, company });
  });
  return r;
}
