const express = require('express');
const { authMiddleware, requireCompanyScope } = require('../../auth/jwt');
const Workspace = require('../../db/models/workspace.model');
const WorkspaceMembership = require('../../db/models/workspace-membership.model');
const Form = require('../../db/models/form.model');
const { normalizeSchemaKeys } = require('../../utils/form-schema');

module.exports = function(){
  const r = express.Router();
  r.use(authMiddleware());
  r.use(requireCompanyScope());

  // List forms in workspace
  r.get('/workspaces/:wsId/forms', async (req, res) => {
    const { Types } = require('mongoose');
    const wsId = String(req.params.wsId);
    const ws = Types.ObjectId.isValid(wsId) ? await Workspace.findById(wsId) : await Workspace.findOne({ id: wsId });
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'workspace_not_found', 'Workspace not found');
    const member = await WorkspaceMembership.findOne({ userId: req.user.id, workspaceId: ws._id });
    if (!member) return res.apiError(403, 'not_a_member', 'User not a workspace member');
    let { limit = 100, page = 1, q, sort } = req.query;
    limit = Math.max(1, Math.min(200, Number(limit) || 100));
    page = Math.max(1, Number(page) || 1);
    const query = { workspaceId: ws._id };
    if (q) query['name'] = { $regex: String(q), $options: 'i' };
    let sortObj = { createdAt: -1 };
    if (typeof sort === 'string') { const [f,d] = String(sort).split(':'); if (f) sortObj = { [f]: (d === 'asc' ? 1 : -1) }; }
    const list = await Form.find(query)
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    res.apiOk(list);
  });

  // Create form in workspace
  r.post('/workspaces/:wsId/forms', async (req, res) => {
    const { Types } = require('mongoose');
    const wsId = String(req.params.wsId);
    const ws = Types.ObjectId.isValid(wsId) ? await Workspace.findById(wsId) : await Workspace.findOne({ id: wsId });
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'workspace_not_found', 'Workspace not found');
    const member = await WorkspaceMembership.findOne({ userId: req.user.id, workspaceId: ws._id });
    if (!member) return res.apiError(403, 'not_a_member', 'User not a workspace member');
    const { name, description = '', status = 'draft', schema = {} } = req.body || {};
    if (!name || String(name).trim() === '') return res.apiError(400, 'name_required', 'Form name is required');
    if (schema && typeof schema === 'object') normalizeSchemaKeys(schema);
    const form = await Form.create({
      name: String(name),
      description: String(description || ''),
      status,
      schema,
      workspaceId: ws._id,
    });
    res.status(201).json({ success: true, data: form.toObject(), requestId: req.requestId, ts: Date.now() });
  });

  // Get a form
  r.get('/forms/:formId', async (req, res) => {
    const { Types } = require('mongoose');
    const fid = String(req.params.formId);
    let f = null;
    if (Types.ObjectId.isValid(fid)) f = await Form.findById(fid);
    if (!f) f = await Form.findOne({ id: fid });
    if (!f) return res.apiError(404, 'form_not_found', 'Form not found');
    const ws = await Workspace.findById(f.workspaceId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'form_not_found', 'Form not found');
    const member = await WorkspaceMembership.findOne({ userId: req.user.id, workspaceId: ws._id });
    if (!member) return res.apiError(403, 'not_a_member', 'User not a workspace member');
    res.apiOk(f);
  });

  // Update a form
  r.put('/forms/:formId', async (req, res) => {
    const { Types } = require('mongoose');
    const fid = String(req.params.formId);
    let f = null;
    if (Types.ObjectId.isValid(fid)) f = await Form.findById(fid);
    if (!f) f = await Form.findOne({ id: fid });
    if (!f) return res.apiError(404, 'form_not_found', 'Form not found');
    const ws = await Workspace.findById(f.workspaceId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'form_not_found', 'Form not found');
    const member = await WorkspaceMembership.findOne({ userId: req.user.id, workspaceId: ws._id });
    if (!member) return res.apiError(403, 'not_a_member', 'User not a workspace member');
    const patch = req.body || {};
    if (patch.schema && typeof patch.schema === 'object') normalizeSchemaKeys(patch.schema);

    // Workspace transfer
    if (patch.workspaceId) {
      const wsId = String(patch.workspaceId);
      const dest = Types.ObjectId.isValid(wsId) ? await Workspace.findById(wsId) : await Workspace.findOne({ id: wsId });
      if (!dest || String(dest.companyId) !== req.user.companyId) return res.apiError(404, 'workspace_not_found', 'Destination workspace not found');
      const destMember = await WorkspaceMembership.findOne({ userId: req.user.id, workspaceId: dest._id });
      if (!destMember) return res.apiError(403, 'not_a_member', 'User not a destination workspace member');
      f.workspaceId = dest._id;
    }

    Object.assign(f, {
      name: patch.name ?? f.name,
      description: (patch.description != null ? String(patch.description) : f.description),
      status: patch.status ?? f.status,
    });
    if (patch.schema && typeof patch.schema === 'object') f.schema = patch.schema;
    await f.save();
    res.apiOk(f);
  });

  // Delete a form
  r.delete('/forms/:formId', async (req, res) => {
    const { Types } = require('mongoose');
    const fid = String(req.params.formId);
    let f = null;
    if (Types.ObjectId.isValid(fid)) f = await Form.findById(fid);
    if (!f) f = await Form.findOne({ id: fid });
    if (!f) return res.apiError(404, 'form_not_found', 'Form not found');
    const ws = await Workspace.findById(f.workspaceId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'form_not_found', 'Form not found');
    const member = await WorkspaceMembership.findOne({ userId: req.user.id, workspaceId: ws._id });
    if (!member) return res.apiError(403, 'not_a_member', 'User not a workspace member');
    await Form.deleteOne({ _id: f._id });
    return res.apiOk({ id: String(f._id) });
  });

  return r;
}
