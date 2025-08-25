const express = require('express');
const { authMiddleware, requireCompanyScope } = require('../../auth/jwt');
const Workspace = require('../../db/models/workspace.model');
const Credential = require('../../db/models/credential.model');
const { encrypt, decrypt } = require('../../utils/enc');
const { Types } = require('mongoose');

module.exports = function(){
  const r = express.Router();
  r.use(authMiddleware());
  r.use(requireCompanyScope());

  r.get('/workspaces/:wsId/credentials', async (req, res) => {
    const { wsId } = req.params;
    let ws;
    if (Types.ObjectId.isValid(String(wsId))) ws = await Workspace.findById(wsId);
    else ws = await Workspace.findOne({ id: wsId });
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'workspace_not_found', 'Workspace not found');
    const WorkspaceMembership = require('../../db/models/workspace-membership.model');
    const member = await WorkspaceMembership.findOne({ userId: req.user.id, workspaceId: ws._id });
    if (!member) return res.apiError(403, 'not_a_member', 'User not a workspace member');
    let { limit = 100, page = 1, q, sort } = req.query;
    limit = Math.max(1, Math.min(200, Number(limit) || 100));
    page = Math.max(1, Number(page) || 1);
    const query = { workspaceId: ws._id };
    if (q) Object.assign(query, { $or: [ { name: { $regex: String(q), $options: 'i' } }, { providerKey: { $regex: String(q), $options: 'i' } } ] });
    let sortObj = { createdAt: -1 };
    if (typeof sort === 'string') { const [f,d] = String(sort).split(':'); if (f) sortObj = { [f]: (d === 'asc' ? 1 : -1) }; }
    const list = await Credential.find(query).select('-secret')
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    res.apiOk(list);
  });

  r.post('/workspaces/:wsId/credentials', async (req, res) => {
    const { wsId } = req.params;
    let ws;
    if (Types.ObjectId.isValid(String(wsId))) ws = await Workspace.findById(wsId);
    else ws = await Workspace.findOne({ id: wsId });
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'workspace_not_found', 'Workspace not found');
    const body = req.body || {};
    if (!body.name || !body.providerKey) return res.apiError(400, 'bad_request', 'Missing name or providerKey');
    const secret = encrypt(body.values || {});
    const cred = await Credential.create({ name: body.name, providerKey: body.providerKey, workspaceId: ws._id, secret });
    res.status(201).json({ success: true, data: { id: String(cred._id), name: cred.name, providerKey: cred.providerKey, workspaceId: String(cred.workspaceId) }, requestId: req.requestId, ts: Date.now() });
  });

  r.get('/credentials/:id', async (req, res) => {
    const cred = await Credential.findById(req.params.id);
    if (!cred) return res.apiError(404, 'credential_not_found', 'Credential not found');
    const ws = await Workspace.findById(cred.workspaceId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'credential_not_found', 'Credential not found');
    res.apiOk({ id: String(cred._id), name: cred.name, providerKey: cred.providerKey, workspaceId: String(cred.workspaceId) });
  });

  // Secure read of credential values
  r.get('/credentials/:id/values', async (req, res) => {
    const cred = await Credential.findById(req.params.id);
    if (!cred) return res.apiError(404, 'credential_not_found', 'Credential not found');
    const ws = await Workspace.findById(cred.workspaceId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'credential_not_found', 'Credential not found');
    const reveal = req.query.reveal === '1';
    try {
      const values = decrypt(cred.secret);
      if (reveal) {
        if (req.user.role !== 'admin') return res.apiError(403, 'forbidden', 'Reveal requires admin');
        return res.apiOk({ values });
      }
      const masked = maskDeep(values);
      return res.apiOk({ masked: true, values: masked });
    } catch (e) {
      return res.apiError(500, 'decrypt_failed', 'Unable to decrypt credential');
    }
  });

  r.put('/credentials/:id', async (req, res) => {
    const cred = await Credential.findById(req.params.id);
    if (!cred) return res.apiError(404, 'credential_not_found', 'Credential not found');
    const ws = await Workspace.findById(cred.workspaceId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'credential_not_found', 'Credential not found');
    const body = req.body || {};
    if (body.name != null) cred.name = body.name;
    if (body.providerKey != null) cred.providerKey = body.providerKey;
    if (body.values != null) cred.secret = encrypt(body.values);
    await cred.save();
    res.apiOk({ id: String(cred._id), name: cred.name, providerKey: cred.providerKey, workspaceId: String(cred.workspaceId) });
  });

  return r;
}

function maskDeep(obj){
  if (obj == null) return obj;
  if (typeof obj === 'string') return maskString(obj);
  if (Array.isArray(obj)) return obj.map(maskDeep);
  if (typeof obj === 'object'){ const o={}; for (const [k,v] of Object.entries(obj)) o[k]=maskDeep(v); return o; }
  return obj;
}
function maskString(s){
  const str = String(s);
  if (str.length <= 4) return '*'.repeat(str.length);
  return str.slice(0,2) + '*'.repeat(Math.max(2, str.length-4)) + str.slice(-2);
}
