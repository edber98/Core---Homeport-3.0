// MCP Client — connects to MCP servers via stdio or SSE transport
// Implements tool discovery and execution via JSON-RPC 2.0

const { spawn } = require('child_process');

class McpClient {
  constructor(serverConfig) {
    this.config = serverConfig;
    this.transport = serverConfig.transport; // 'stdio' | 'sse'
    this.connected = false;
    this._process = null;
    this._requestId = 0;
    this._pendingRequests = new Map();
    this._buffer = '';
    this._tools = [];
  }

  // ── Lifecycle ──

  async connect() {
    if (this.connected) return;

    if (this.transport === 'stdio') {
      await this._connectStdio();
    } else if (this.transport === 'sse') {
      await this._connectSse();
    } else {
      throw new Error(`Unknown MCP transport: ${this.transport}`);
    }

    this.connected = true;

    // Initialize protocol
    await this._initialize();

    // Discover tools
    this._tools = await this._listToolsRpc();
  }

  async disconnect() {
    this.connected = false;
    this._tools = [];
    this._pendingRequests.clear();

    if (this._process) {
      this._process.kill();
      this._process = null;
    }
    this._buffer = '';
  }

  // ── Discovery ──

  async listTools() {
    if (!this.connected) await this.connect();
    return this._tools.map(t => ({
      name: t.name,
      description: t.description || '',
      inputSchema: t.inputSchema || { type: 'object', properties: {} },
      serverPrefix: this.config.toolPrefix || this.config.id,
    }));
  }

  // ── Execution ──

  async callTool(name, args) {
    if (!this.connected) await this.connect();
    return this._sendRequest('tools/call', { name, arguments: args });
  }

  // ── Stdio transport ──

  async _connectStdio() {
    const { command, args = [], env = {} } = this.config;
    if (!command) throw new Error('MCP stdio: command is required');

    this._process = spawn(command, args, {
      env: { ...process.env, ...env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this._process.stdout.on('data', (chunk) => {
      this._buffer += chunk.toString();
      this._processBuffer();
    });

    this._process.stderr.on('data', (chunk) => {
      console.error(`[mcp-stdio] ${this.config.name} stderr:`, chunk.toString().trim());
    });

    this._process.on('close', (code) => {
      console.log(`[mcp-stdio] ${this.config.name} process closed (code=${code})`);
      this.connected = false;
    });

    this._process.on('error', (err) => {
      console.error(`[mcp-stdio] ${this.config.name} error:`, err.message);
      this.connected = false;
    });
  }

  // ── SSE transport ──

  async _connectSse() {
    const { url } = this.config;
    if (!url) throw new Error('MCP SSE: url is required');
    // For SSE, we use HTTP requests for each RPC call
    // The connection is stateless — each call is an HTTP POST
    this._sseUrl = url;
    this._sseHeaders = this.config.headers || {};
  }

  // ── JSON-RPC ──

  async _initialize() {
    try {
      await this._sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'homeport', version: '1.0.0' },
      });
      // Send initialized notification
      await this._sendNotification('notifications/initialized', {});
    } catch (e) {
      console.error(`[mcp] ${this.config.name} init error:`, e.message);
    }
  }

  async _listToolsRpc() {
    try {
      const result = await this._sendRequest('tools/list', {});
      return result?.tools || [];
    } catch (e) {
      console.error(`[mcp] ${this.config.name} list tools error:`, e.message);
      return [];
    }
  }

  async _sendRequest(method, params) {
    const id = ++this._requestId;
    const message = { jsonrpc: '2.0', id, method, params };

    if (this.transport === 'stdio') {
      return this._sendStdio(message);
    } else {
      return this._sendHttp(message);
    }
  }

  async _sendNotification(method, params) {
    const message = { jsonrpc: '2.0', method, params };
    if (this.transport === 'stdio' && this._process?.stdin?.writable) {
      const serialized = JSON.stringify(message) + '\n';
      this._process.stdin.write(serialized);
    }
    // For SSE, notifications are fire-and-forget HTTP
    if (this.transport === 'sse') {
      try {
        await fetch(this._sseUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...this._sseHeaders },
          body: JSON.stringify(message),
        });
      } catch {}
    }
  }

  _sendStdio(message) {
    return new Promise((resolve, reject) => {
      if (!this._process?.stdin?.writable) {
        return reject(new Error('MCP stdio process not available'));
      }

      const timeout = setTimeout(() => {
        this._pendingRequests.delete(message.id);
        reject(new Error(`MCP request timeout (method=${message.method})`));
      }, 30000);

      this._pendingRequests.set(message.id, { resolve, reject, timeout });

      const serialized = JSON.stringify(message) + '\n';
      this._process.stdin.write(serialized);
    });
  }

  async _sendHttp(message) {
    const res = await fetch(this._sseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this._sseHeaders },
      body: JSON.stringify(message),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`MCP HTTP error ${res.status}: ${errText}`);
    }

    const body = await res.json();
    if (body.error) {
      throw new Error(`MCP error: ${body.error.message || JSON.stringify(body.error)}`);
    }
    return body.result;
  }

  _processBuffer() {
    const lines = this._buffer.split('\n');
    this._buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      let msg;
      try { msg = JSON.parse(trimmed); } catch { continue; }

      if (msg.id && this._pendingRequests.has(msg.id)) {
        const pending = this._pendingRequests.get(msg.id);
        this._pendingRequests.delete(msg.id);
        clearTimeout(pending.timeout);

        if (msg.error) {
          pending.reject(new Error(`MCP error: ${msg.error.message || JSON.stringify(msg.error)}`));
        } else {
          pending.resolve(msg.result);
        }
      }
    }
  }
}

module.exports = { McpClient };
