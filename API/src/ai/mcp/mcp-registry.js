// MCP Registry — manages active MCP server connections (singleton)

const { McpClient } = require('./mcp-client');

class McpRegistry {
  constructor() {
    this.connections = new Map(); // serverId → McpClient
  }

  /**
   * Connect to an MCP server.
   * @param {object} serverConfig - McpServer document from DB
   * @returns {McpClient}
   */
  async connectServer(serverConfig) {
    const id = serverConfig.id || String(serverConfig._id);

    // Return existing connection if available
    if (this.connections.has(id) && this.connections.get(id).connected) {
      return this.connections.get(id);
    }

    const client = new McpClient(serverConfig);
    await client.connect();
    this.connections.set(id, client);
    console.log(`[mcp-registry] connected: ${serverConfig.name} (${id})`);
    return client;
  }

  /**
   * Disconnect a specific server.
   */
  async disconnectServer(serverId) {
    const client = this.connections.get(serverId);
    if (client) {
      await client.disconnect();
      this.connections.delete(serverId);
      console.log(`[mcp-registry] disconnected: ${serverId}`);
    }
  }

  /**
   * Get all available MCP tools for a workspace.
   * @param {string} workspaceId
   * @returns {Array<{ name, description, inputSchema, serverPrefix, serverId }>}
   */
  async getTools(workspaceId) {
    const McpServer = require('../../db/models/mcp-server.model');
    const servers = await McpServer.find({ workspaceId, enabled: true }).lean();

    const allTools = [];
    for (const server of servers) {
      const id = server.id || String(server._id);
      try {
        let client = this.connections.get(id);
        if (!client || !client.connected) {
          client = await this.connectServer(server);
        }
        const tools = await client.listTools();
        for (const t of tools) {
          allTools.push({ ...t, serverId: id });
        }
      } catch (e) {
        console.error(`[mcp-registry] error loading tools from ${server.name}:`, e.message);
      }
    }

    return allTools;
  }

  /**
   * Call a tool on a specific server.
   */
  async callTool(serverId, toolName, args) {
    const client = this.connections.get(serverId);
    if (!client || !client.connected) {
      throw new Error(`MCP server ${serverId} not connected`);
    }
    return client.callTool(toolName, args);
  }

  /**
   * Disconnect all servers.
   */
  async disconnectAll() {
    for (const [id, client] of this.connections) {
      try { await client.disconnect(); } catch {}
    }
    this.connections.clear();
    console.log('[mcp-registry] all connections closed');
  }

  /**
   * Get connection status for a server.
   */
  getStatus(serverId) {
    const client = this.connections.get(serverId);
    return {
      connected: !!client?.connected,
      toolCount: client?._tools?.length || 0,
    };
  }
}

// Singleton
const mcpRegistry = new McpRegistry();

module.exports = { mcpRegistry, McpRegistry };
