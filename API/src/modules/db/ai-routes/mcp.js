// Routes /ai/mcp-servers/* — gestion des serveurs Model Context Protocol par workspace.
//
//   GET    /ai/mcp-servers              liste avec statut connexion
//   POST   /ai/mcp-servers              créer (stdio ou http transport)
//   PUT    /ai/mcp-servers/:id          MAJ
//   DELETE /ai/mcp-servers/:id          supprimer + déconnecter
//   POST   /ai/mcp-servers/:id/connect      connexion manuelle
//   POST   /ai/mcp-servers/:id/disconnect   déconnexion
//   GET    /ai/mcp-servers/:id/tools        liste tools exposés par le serveur

const McpServer = require('../../../db/models/mcp-server.model');
const { mcpRegistry } = require('../../../ai/mcp/mcp-registry');
const { ensureWorkspaceAccess } = require('./_shared');

const UPDATABLE = ['name', 'transport', 'command', 'args', 'env', 'url', 'headers', 'enabled', 'autoConnect', 'toolPrefix'];

module.exports = function registerMcpRoutes(r) {
  // ── List ───────────────────────────────────────────────────────────
  r.get('/ai/mcp-servers', async (req, res) => {
    const ws = await ensureWorkspaceAccess(req, res);
    if (!ws) return;
    const servers = await McpServer.find({ workspaceId: ws._id }).sort({ createdAt: -1 }).lean();
    res.apiOk(servers.map(s => ({ ...s, status: mcpRegistry.getStatus(s.id || String(s._id)) })));
  });

  // ── Create ─────────────────────────────────────────────────────────
  r.post('/ai/mcp-servers', async (req, res) => {
    const ws = await ensureWorkspaceAccess(req, res);
    if (!ws) return;
    const b = req.body || {};
    if (!b.name || !b.transport) return res.apiError(400, 'invalid', 'name and transport required');
    const server = await McpServer.create({
      workspaceId: ws._id,
      name: b.name, transport: b.transport,
      command: b.command || undefined,
      args: b.args || [],
      env: b.env || {},
      url: b.url || undefined,
      headers: b.headers || {},
      enabled: b.enabled !== false,
      autoConnect: !!b.autoConnect,
      toolPrefix: b.toolPrefix || '',
    });
    res.status(201).json({ success: true, data: server, requestId: req.requestId, ts: Date.now() });
  });

  // ── Update ─────────────────────────────────────────────────────────
  r.put('/ai/mcp-servers/:id', async (req, res) => {
    const ws = await ensureWorkspaceAccess(req, res);
    if (!ws) return;
    const server = await McpServer.findOne({ id: req.params.id, workspaceId: ws._id });
    if (!server) return res.apiError(404, 'not_found', 'MCP server not found');
    for (const k of UPDATABLE) {
      if (req.body[k] !== undefined) server[k] = req.body[k];
    }
    await server.save();
    res.apiOk(server);
  });

  // ── Delete (+ disconnect) ──────────────────────────────────────────
  r.delete('/ai/mcp-servers/:id', async (req, res) => {
    const ws = await ensureWorkspaceAccess(req, res);
    if (!ws) return;
    const server = await McpServer.findOne({ id: req.params.id, workspaceId: ws._id });
    if (!server) return res.apiError(404, 'not_found', 'MCP server not found');
    await mcpRegistry.disconnectServer(server.id);
    await McpServer.deleteOne({ _id: server._id });
    res.apiOk(true);
  });

  // ── Connect manually ───────────────────────────────────────────────
  r.post('/ai/mcp-servers/:id/connect', async (req, res) => {
    const ws = await ensureWorkspaceAccess(req, res);
    if (!ws) return;
    const server = await McpServer.findOne({ id: req.params.id, workspaceId: ws._id }).lean();
    if (!server) return res.apiError(404, 'not_found', 'MCP server not found');
    try {
      await mcpRegistry.connectServer(server);
      res.apiOk({ connected: true, ...mcpRegistry.getStatus(server.id) });
    } catch (e) {
      res.apiError(500, 'connect_error', e.message);
    }
  });

  // ── Disconnect ─────────────────────────────────────────────────────
  r.post('/ai/mcp-servers/:id/disconnect', async (req, res) => {
    const ws = await ensureWorkspaceAccess(req, res);
    if (!ws) return;
    await mcpRegistry.disconnectServer(req.params.id);
    res.apiOk({ connected: false });
  });

  // ── List tools from a connected server ─────────────────────────────
  r.get('/ai/mcp-servers/:id/tools', async (req, res) => {
    const ws = await ensureWorkspaceAccess(req, res);
    if (!ws) return;
    const server = await McpServer.findOne({ id: req.params.id, workspaceId: ws._id }).lean();
    if (!server) return res.apiError(404, 'not_found', 'MCP server not found');
    try {
      const client = await mcpRegistry.connectServer(server);
      const tools = await client.listTools();
      res.apiOk(tools);
    } catch (e) {
      res.apiError(500, 'tools_error', e.message);
    }
  });
};
