const express = require('express');
const { authMiddleware, requireCompanyScope } = require('../../auth/jwt');
const Flow = require('../../db/models/flow.model');
const Workspace = require('../../db/models/workspace.model');
const WorkspaceMembership = require('../../db/models/workspace-membership.model');
const AiChatThread = require('../../db/models/ai-chat-thread.model');
const AiChatMessage = require('../../db/models/ai-chat-message.model');
const AiContext = require('../../db/models/ai-context.model');

module.exports = function(){
  const r = express.Router();
  r.use(authMiddleware());
  r.use(requireCompanyScope());

  async function ensureFlowAccess(req, res, next){
    const { Types } = require('mongoose');
    const fid = String(req.params.flowId);
    let f = null;
    if (Types.ObjectId.isValid(fid)) f = await Flow.findById(fid);
    if (!f) f = await Flow.findOne({ id: fid });
    if (!f) return res.apiError(404, 'flow_not_found', 'Flow not found');
    const ws = await Workspace.findById(f.workspaceId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'flow_not_found', 'Flow not found');
    const member = await WorkspaceMembership.findOne({ userId: req.user.id, workspaceId: ws._id });
    if (!member) return res.apiError(403, 'not_a_member', 'User not a workspace member');
    req.flow = f; req.workspace = ws; next();
  }

  async function ensureThreadAccess(req, res, next){
    const { Types } = require('mongoose');
    const tid = String(req.params.threadId);
    let t = null;
    if (Types.ObjectId.isValid(tid)) t = await AiChatThread.findById(tid);
    if (!t) t = await AiChatThread.findOne({ id: tid });
    if (!t) return res.apiError(404, 'thread_not_found', 'Chat thread not found');
    const f = await Flow.findById(t.flowId);
    if (!f) return res.apiError(404, 'flow_not_found', 'Flow not found');
    const ws = await Workspace.findById(f.workspaceId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'not_found', 'Not found');
    const member = await WorkspaceMembership.findOne({ userId: req.user.id, workspaceId: ws._id });
    if (!member) return res.apiError(403, 'not_a_member', 'User not a workspace member');
    req.thread = t; req.flow = f; req.workspace = ws; next();
  }

  // Threads
  r.get('/flows/:flowId/ai/chats', ensureFlowAccess, async (req, res) => {
    const list = await AiChatThread.find({ flowId: req.flow._id }).sort({ updatedAt: -1 }).lean();
    res.apiOk(list);
  });
  r.post('/flows/:flowId/ai/chats', ensureFlowAccess, async (req, res) => {
    const title = String((req.body && req.body.title) || 'Chat');
    const t = await AiChatThread.create({ flowId: req.flow._id, title });
    res.status(201).json({ success: true, data: t, requestId: req.requestId, ts: Date.now() });
  });
  r.delete('/ai/chats/:threadId', ensureThreadAccess, async (req, res) => {
    await AiChatMessage.deleteMany({ threadId: req.thread._id });
    await AiChatThread.deleteOne({ _id: req.thread._id });
    res.apiOk(true);
  });

  // Messages
  r.get('/ai/chats/:threadId/messages', ensureThreadAccess, async (req, res) => {
    const list = await AiChatMessage.find({ threadId: req.thread._id }).sort({ createdAt: 1 }).lean();
    res.apiOk(list);
  });
  r.post('/ai/chats/:threadId/messages', ensureThreadAccess, async (req, res) => {
    const { role, text, parts } = req.body || {};
    const doc = await AiChatMessage.create({ threadId: req.thread._id, role: String(role||'user'), text: text || '', parts: Array.isArray(parts) ? parts : undefined });
    await AiChatThread.updateOne({ _id: req.thread._id }, { $set: { updatedAt: new Date() } });
    res.status(201).json({ success: true, data: doc, requestId: req.requestId, ts: Date.now() });
  });
  r.delete('/ai/chats/:threadId/messages', ensureThreadAccess, async (req, res) => {
    await AiChatMessage.deleteMany({ threadId: req.thread._id });
    res.apiOk(true);
  });

  // Context (1 par flow)
  r.get('/flows/:flowId/ai/context', ensureFlowAccess, async (req, res) => {
    const ctx = await AiContext.findOne({ flowId: req.flow._id }).lean();
    if (!ctx) return res.apiOk(null);
    res.apiOk(ctx);
  });
  r.put('/flows/:flowId/ai/context', ensureFlowAccess, async (req, res) => {
    const data = (req.body && Object.prototype.hasOwnProperty.call(req.body, 'data')) ? req.body.data : null;
    const now = new Date();
    const ctx = await AiContext.findOneAndUpdate({ flowId: req.flow._id }, { $set: { data, updatedAt: now } }, { new: true, upsert: true });
    res.apiOk(ctx);
  });
  r.delete('/flows/:flowId/ai/context', ensureFlowAccess, async (req, res) => {
    await AiContext.deleteOne({ flowId: req.flow._id });
    res.apiOk(true);
  });

  return r;
};

