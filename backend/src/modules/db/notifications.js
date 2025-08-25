const express = require('express');
const { authMiddleware, requireCompanyScope } = require('../../auth/jwt');
const Notification = require('../../db/models/notification.model');

module.exports = function(){
  const r = express.Router();
  r.use(authMiddleware());
  r.use(requireCompanyScope());

  r.get('/notifications', async (req, res) => {
    const { workspaceId, entityType, entityId, acknowledged, q: search, sort } = req.query;
    const base = { companyId: req.user.companyId };
    if (workspaceId) base.workspaceId = workspaceId;
    if (entityType) base.entityType = entityType;
    if (entityId) base.entityId = entityId;
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
    res.apiOk(list);
  });

  r.post('/notifications/:id/ack', async (req, res) => {
    const n = await Notification.findById(req.params.id);
    if (!n || String(n.companyId) !== req.user.companyId) return res.apiError(404, 'notification_not_found', 'Notification not found');
    n.acknowledged = true; await n.save();
    res.apiOk(n);
  });

  r.put('/notifications/:id', async (req, res) => {
    const n = await Notification.findById(req.params.id);
    if (!n || String(n.companyId) !== req.user.companyId) return res.apiError(404, 'notification_not_found', 'Notification not found');
    const body = req.body || {};
    if (typeof body.acknowledged === 'boolean') n.acknowledged = body.acknowledged;
    await n.save();
    res.apiOk(n);
  });

  r.delete('/notifications/:id', async (req, res) => {
    const n = await Notification.findById(req.params.id);
    if (!n || String(n.companyId) !== req.user.companyId) return res.apiError(404, 'notification_not_found', 'Notification not found');
    await n.deleteOne();
    res.apiOk({ deleted: true, id: req.params.id });
  });

  return r;
}
