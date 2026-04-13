const express = require('express');
const { authMiddleware, requireCompanyScope } = require('../../auth/jwt');
const Notification = require('../../db/models/notification.model');
const Workspace = require('../../db/models/workspace.model');
const { Types } = require('mongoose');

module.exports = function(){
  const r = express.Router();
  r.use(authMiddleware());
  r.use(requireCompanyScope());

  async function resolveWorkspaceObjectId(workspaceId, companyId) {
    const raw = String(workspaceId || '').trim();
    if (!raw) return null;
    let ws = null;
    if (Types.ObjectId.isValid(raw)) {
      ws = await Workspace.findById(raw).select('_id companyId').lean();
    }
    if (!ws) {
      ws = await Workspace.findOne({ id: raw }).select('_id companyId').lean();
    }
    if (!ws) return null;
    if (String(ws.companyId) !== String(companyId)) return null;
    return ws._id;
  }

  r.get('/notifications', async (req, res) => {
    const { workspaceId, entityType, entityId, acknowledged, severity, q: search, sort, pagination } = req.query;
    const base = { companyId: req.user.companyId };
    if (workspaceId) {
      const wsObjectId = await resolveWorkspaceObjectId(workspaceId, req.user.companyId);
      const withMeta = String(pagination || '').toLowerCase() === 'true';
      if (!wsObjectId) {
        if (withMeta) {
          return res.apiOk({ items: [], total: 0, page: 1, limit: Math.max(1, Math.min(200, Number(req.query?.limit) || 100)), pages: 1 });
        }
        return res.apiOk([]);
      }
      base.workspaceId = wsObjectId;
    }
    if (entityType) base.entityType = entityType;
    if (entityId) base.entityId = entityId;
    if (severity) base.severity = severity;
    if (acknowledged != null) base.acknowledged = acknowledged === 'true';
    let { limit = 100, page = 1 } = req.query;
    limit = Math.max(1, Math.min(200, Number(limit) || 100));
    page = Math.max(1, Number(page) || 1);
    const findQ = { ...base };
    if (search) Object.assign(findQ, { $or: [ { code: { $regex: String(search), $options: 'i' } }, { message: { $regex: String(search), $options: 'i' } } ] });
    let sortObj = { createdAt: -1 };
    if (typeof sort === 'string') { const [f,d] = String(sort).split(':'); if (f) sortObj = { [f]: (d === 'asc' ? 1 : -1) }; }
    const list = await Notification.find(findQ)
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    const withMeta = String(pagination || '').toLowerCase() === 'true';
    if (!withMeta) return res.apiOk(list);
    const total = await Notification.countDocuments(findQ);
    return res.apiOk({
      items: list,
      total,
      page,
      limit,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  });

  // Count notifications matching filters (useful for unread badge)
  r.get('/notifications/count', async (req, res) => {
    const { workspaceId, entityType, entityId, acknowledged, severity, q: search } = req.query;
    const base = { companyId: req.user.companyId };
    if (workspaceId) {
      const wsObjectId = await resolveWorkspaceObjectId(workspaceId, req.user.companyId);
      if (!wsObjectId) return res.apiOk({ total: 0 });
      base.workspaceId = wsObjectId;
    }
    if (entityType) base.entityType = entityType;
    if (entityId) base.entityId = entityId;
    if (severity) base.severity = severity;
    if (acknowledged != null) base.acknowledged = acknowledged === 'true';
    const findQ = { ...base };
    if (search) Object.assign(findQ, { $or: [ { code: { $regex: String(search), $options: 'i' } }, { message: { $regex: String(search), $options: 'i' } } ] });
    const total = await Notification.countDocuments(findQ);
    res.apiOk({ total });
  });

  r.post('/notifications/:id/ack', async (req, res) => {
    const id = String(req.params.id || '');
    if (!Types.ObjectId.isValid(id)) return res.apiError(400, 'invalid_id', 'Invalid notification id');
    const n = await Notification.findById(id);
    if (!n || String(n.companyId) !== req.user.companyId) return res.apiError(404, 'notification_not_found', 'Notification not found');
    n.acknowledged = true; await n.save();
    res.apiOk(n);
  });

  r.put('/notifications/:id', async (req, res) => {
    const id = String(req.params.id || '');
    if (!Types.ObjectId.isValid(id)) return res.apiError(400, 'invalid_id', 'Invalid notification id');
    const n = await Notification.findById(id);
    if (!n || String(n.companyId) !== req.user.companyId) return res.apiError(404, 'notification_not_found', 'Notification not found');
    const body = req.body || {};
    if (typeof body.acknowledged === 'boolean') n.acknowledged = body.acknowledged;
    await n.save();
    res.apiOk(n);
  });

  // Mark all notifications as read (per workspace or company-wide)
  r.post('/notifications/ack-all', async (req, res) => {
    const filter = { companyId: req.user.companyId, acknowledged: false };
    const { workspaceId } = req.body || {};
    if (workspaceId) {
      const wsObjectId = await resolveWorkspaceObjectId(workspaceId, req.user.companyId);
      if (!wsObjectId) return res.apiError(404, 'workspace_not_found', 'Workspace not found');
      filter.workspaceId = wsObjectId;
    }
    const result = await Notification.updateMany(filter, { $set: { acknowledged: true } });
    res.apiOk({ modifiedCount: result.modifiedCount || 0 });
  });

  r.delete('/notifications/:id', async (req, res) => {
    const id = String(req.params.id || '');
    if (!Types.ObjectId.isValid(id)) return res.apiError(400, 'invalid_id', 'Invalid notification id');
    const n = await Notification.findById(id);
    if (!n || String(n.companyId) !== req.user.companyId) return res.apiError(404, 'notification_not_found', 'Notification not found');
    await n.deleteOne();
    res.apiOk({ deleted: true, id: req.params.id });
  });

  return r;
}
