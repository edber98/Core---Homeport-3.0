const express = require('express');
const { sign } = require('../../auth/jwt');
const { verifyPassword } = require('../../utils/crypto');
const User = require('../../db/models/user.model');
const Company = require('../../db/models/company.model');
const Workspace = require('../../db/models/workspace.model');
const WorkspaceMembership = require('../../db/models/workspace-membership.model');

module.exports = function(){
  const r = express.Router();
  r.post('/login', async (req, res) => {
    const { email, password } = req.body || {};
    const user = await User.findOne({ email: String(email||'').toLowerCase() });
    if (!user) return res.apiError(401, 'invalid_credentials', 'Invalid email or password');
    if (!verifyPassword(password || '', user.pwdHash)) return res.apiError(401, 'invalid_credentials', 'Invalid email or password');
    const company = await Company.findById(user.companyId);
    const token = sign({ user: { id: String(user._id), email: user.email, role: user.role, companyId: String(user.companyId) } });

    // Resolve accessible workspaces for this user
    let workspaces = [];
    let defaultWorkspaceId = user.defaultWorkspaceId ? String(user.defaultWorkspaceId) : null;
    try {
      if (user.role === 'admin') {
        // Admin sees all company workspaces
        workspaces = await Workspace.find({ companyId: user.companyId }).sort({ isDefault: -1, createdAt: 1 }).lean();
      } else {
        // Regular user sees only workspaces they are members of
        const memberships = await WorkspaceMembership.find({ userId: user._id }).lean();
        const wsIds = memberships.map(m => m.workspaceId);
        workspaces = await Workspace.find({ _id: { $in: wsIds } }).sort({ isDefault: -1, createdAt: 1 }).lean();
      }
      // If no default preference, use isDefault workspace
      if (!defaultWorkspaceId && workspaces.length) {
        const def = workspaces.find(w => w.isDefault);
        defaultWorkspaceId = String((def || workspaces[0])._id);
      }
    } catch {}

    res.apiOk({
      token,
      user: { id: String(user._id), email: user.email, role: user.role },
      company,
      workspaces: workspaces.map(w => ({
        id: String(w._id),
        name: w.name,
        isDefault: !!w.isDefault,
        templatesAllowed: w.templatesAllowed || [],
      })),
      defaultWorkspaceId,
    });
  });
  return r;
}
