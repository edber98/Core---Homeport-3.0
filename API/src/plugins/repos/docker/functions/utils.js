const http = require("http");
const https = require("https");
function compactJson(v) { try { return JSON.stringify(v); } catch { return String(v); } }
function parseJson(v, label, fallback) { if (v === undefined || v === null || v === "") return fallback; if (typeof v === "object") return v; try { return JSON.parse(String(v)); } catch { throw new Error("JSON invalide dans " + label + "."); } }
function interpolate(path, d) { return path.replace(/\{([A-Za-z0-9_]+)\}/g, (_, k) => encodeURIComponent(String(d[k] || ""))); }
function pick(d, keys) { const out = {}; for (const k of keys || []) if (d[k] !== undefined && d[k] !== null && d[k] !== "") out[k] = d[k]; return out; }
const ACTIONS = {
  "docker_system_version": {
    "path": "/version",
    "method": "GET",
    "query": [],
    "body": [],
    "json": [],
    "list": false
  },
  "docker_system_info": {
    "path": "/info",
    "method": "GET",
    "query": [],
    "body": [],
    "json": [],
    "list": false
  },
  "docker_containers_list": {
    "path": "/containers/json",
    "method": "GET",
    "query": [
      "all"
    ],
    "body": [],
    "json": [],
    "list": true
  },
  "docker_container_inspect": {
    "path": "/containers/{containerId}/json",
    "method": "GET",
    "query": [],
    "body": [],
    "json": [],
    "list": false
  },
  "docker_container_create": {
    "path": "/containers/create",
    "method": "POST",
    "query": [
      "name"
    ],
    "body": [],
    "json": [],
    "list": false
  },
  "docker_container_start": {
    "path": "/containers/{containerId}/start",
    "method": "POST",
    "query": [],
    "body": [],
    "json": [],
    "list": false
  },
  "docker_container_stop": {
    "path": "/containers/{containerId}/stop",
    "method": "POST",
    "query": [
      "t"
    ],
    "body": [],
    "json": [],
    "list": false
  },
  "docker_container_restart": {
    "path": "/containers/{containerId}/restart",
    "method": "POST",
    "query": [
      "t"
    ],
    "body": [],
    "json": [],
    "list": false
  },
  "docker_container_remove": {
    "path": "/containers/{containerId}",
    "method": "DELETE",
    "query": [
      "force"
    ],
    "body": [],
    "json": [],
    "list": false
  },
  "docker_container_logs": {
    "path": "/containers/{containerId}/logs",
    "method": "GET",
    "query": [
      "stdout",
      "stderr",
      "tail"
    ],
    "body": [],
    "json": [],
    "list": false
  },
  "docker_container_exec": {
    "path": "/containers/{containerId}/exec",
    "method": "POST",
    "query": [],
    "body": [],
    "json": [],
    "list": false
  },
  "docker_images_list": {
    "path": "/images/json",
    "method": "GET",
    "query": [],
    "body": [],
    "json": [],
    "list": true
  },
  "docker_image_pull": {
    "path": "/images/create",
    "method": "POST",
    "query": [
      "fromImage",
      "tag"
    ],
    "body": [],
    "json": [],
    "list": false
  },
  "docker_image_remove": {
    "path": "/images/{imageId}",
    "method": "DELETE",
    "query": [
      "force"
    ],
    "body": [],
    "json": [],
    "list": false
  },
  "docker_networks_list": {
    "path": "/networks",
    "method": "GET",
    "query": [],
    "body": [],
    "json": [],
    "list": true
  },
  "docker_network_create": {
    "path": "/networks/create",
    "method": "POST",
    "query": [],
    "body": [],
    "json": [],
    "list": false
  },
  "docker_network_remove": {
    "path": "/networks/{networkId}",
    "method": "DELETE",
    "query": [],
    "body": [],
    "json": [],
    "list": false
  },
  "docker_network_connect": {
    "path": "/networks/{networkId}/connect",
    "method": "POST",
    "query": [],
    "body": [],
    "json": [],
    "list": false
  },
  "docker_network_disconnect": {
    "path": "/networks/{networkId}/disconnect",
    "method": "POST",
    "query": [],
    "body": [],
    "json": [],
    "list": false
  },
  "docker_volumes_list": {
    "path": "/volumes",
    "method": "GET",
    "query": [],
    "body": [],
    "json": [],
    "list": true
  },
  "docker_volume_create": {
    "path": "/volumes/create",
    "method": "POST",
    "query": [],
    "body": [],
    "json": [],
    "list": false
  },
  "docker_volume_remove": {
    "path": "/volumes/{volumeName}",
    "method": "DELETE",
    "query": [
      "force"
    ],
    "body": [],
    "json": [],
    "list": false
  },
  "docker_container_pause": {"path":"/containers/{containerId}/pause","method":"POST","query":[],"body":[],"json":[],"list":false},
  "docker_container_unpause": {"path":"/containers/{containerId}/unpause","method":"POST","query":[],"body":[],"json":[],"list":false},
  "docker_container_wait": {"path":"/containers/{containerId}/wait","method":"POST","query":[],"body":[],"json":[],"list":false},
  "docker_container_rename": {"path":"/containers/{containerId}/rename","method":"POST","query":["name"],"body":[],"json":[],"list":false},
  "docker_container_stats": {"path":"/containers/{containerId}/stats","method":"GET","query":["stream"],"body":[],"json":[],"list":false},
  "docker_image_inspect": {"path":"/images/{imageId}/json","method":"GET","query":[],"body":[],"json":[],"list":false},
  "docker_image_tag": {"path":"/images/{imageId}/tag","method":"POST","query":["repo","tag"],"body":[],"json":[],"list":false},
  "docker_network_inspect": {"path":"/networks/{networkId}","method":"GET","query":[],"body":[],"json":[],"list":false},
  "docker_volume_inspect": {"path":"/volumes/{volumeName}","method":"GET","query":[],"body":[],"json":[],"list":false},
  "docker_containers_prune": {"path":"/containers/prune","method":"POST","query":[],"body":[],"json":[],"list":false},
  "docker_images_prune": {"path":"/images/prune","method":"POST","query":[],"body":[],"json":[],"list":false},
  "docker_networks_prune": {"path":"/networks/prune","method":"POST","query":[],"body":[],"json":[],"list":false},
  "docker_volumes_prune": {"path":"/volumes/prune","method":"POST","query":[],"body":[],"json":[],"list":false},
  "docker_system_df": {"path":"/system/df","method":"GET","query":[],"body":[],"json":[],"list":false},
  "docker_events_list": {
    "path": "/events",
    "method": "GET",
    "query": [
      "since",
      "until"
    ],
    "body": [],
    "json": [],
    "list": false
  }
};
async function request(opts, spec, inputs) {
  const c = (opts && opts.credentials) || {};
  const socketPath = c.socketPath || "/var/run/docker.sock";
  const baseUrl = c.baseUrl || "";
  const reqPath = interpolate(spec.path, inputs || {});
  const query = new URLSearchParams(pick(inputs || {}, spec.query || [])).toString();
  const fullPath = reqPath + (query ? "?" + query : "");
  const payload = parseJson(inputs.payload, "payload", undefined);
  const bodyObj = payload && typeof payload === "object" ? { ...payload } : {};
  for (const k of ["Image", "Cmd", "Name", "Container", "Force"]) if (inputs[k] !== undefined && inputs[k] !== "") bodyObj[k] = k === "Cmd" ? parseJson(inputs[k], k, inputs[k]) : inputs[k];
  const body = ["POST", "PUT", "PATCH"].includes(spec.method) && Object.keys(bodyObj).length ? JSON.stringify(bodyObj) : undefined;
  return await new Promise((resolve) => {
    const done = (res) => {
      const chunks = [];
      res.on("data", (d) => chunks.push(d));
      res.on("end", () => {
        const text = Buffer.concat(chunks).toString();
        let data = text; try { data = text ? JSON.parse(text) : null; } catch {}
        if (res.statusCode >= 400) resolve({ ok: false, status: res.statusCode, error: (data && data.message) || text || "HTTP " + res.statusCode, details: data });
        else resolve({ ok: true, status: res.statusCode, data });
      });
    };
    const headers = body ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) } : {};
    const options = baseUrl ? new URL(baseUrl + fullPath) : { socketPath, path: fullPath };
    const client = baseUrl.startsWith("https") ? https : http;
    const req = client.request({ ...options, method: spec.method || "GET", headers }, done);
    req.on("error", (e) => resolve({ ok: false, error: e.message }));
    if (body) req.write(body);
    req.end();
  });
}
function response(data) { return { ok: true, status: "ok", data, text: typeof data === "string" ? data : "", result_json: compactJson(data) }; }
function asArray(data) { if (Array.isArray(data)) return data; if (Array.isArray(data?.Volumes)) return data.Volumes; if (Array.isArray(data?.Networks)) return data.Networks; return []; }
function list(data) { const arr = asArray(data); return { ok: true, items: arr.map((v, i) => ({ id: String(v.Id || v.Name || i), name: v.Names?.[0] || v.RepoTags?.[0] || v.Name || v.Id || String(i), status: v.State || v.Status || v.Driver || "", url: "", text: "", result_json: compactJson(v) })), totalCount: arr.length, nextCursor: "", data, result_json: compactJson(data) }; }
async function run(key, inputs, opts) {
  const spec = ACTIONS[key];
  if (!spec) return { ok: false, error: "Action inconnue." };
  if (key === "docker_container_exec") {
    const created = await request(opts || {}, spec, inputs || {});
    if (!created.ok) return created;
    const execId = created.data && created.data.Id;
    if (!execId) return response(created.data);
    const started = await request(opts || {}, { method: "POST", path: "/exec/" + execId + "/start", query: [] }, { payload: { Detach: false, Tty: false } });
    if (!started.ok) return started;
    return response({ execId, output: started.data });
  }
  const res = await request(opts || {}, spec, inputs || {});
  if (!res.ok) return res;
  return spec.list ? list(res.data) : response(res.data);
}
module.exports = { utils: { run, request, parseJson } };
