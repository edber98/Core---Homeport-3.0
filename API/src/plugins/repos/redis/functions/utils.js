const net = require("net");
const tls = require("tls");
function compactJson(v) { try { return JSON.stringify(v); } catch { return String(v); } }
function parseJson(v, label, fallback) { if (v === undefined || v === null || v === "") return fallback; if (typeof v === "object") return v; try { return JSON.parse(String(v)); } catch { throw new Error("JSON invalide dans " + label + "."); } }
function encode(args) { return "*" + args.length + "\r\n" + args.map((a) => { const s = String(a); return "$" + Buffer.byteLength(s) + "\r\n" + s + "\r\n"; }).join(""); }
function parse(buffer) {
  let offset = 0;
  function line() { const end = buffer.indexOf("\r\n", offset); const s = buffer.slice(offset, end).toString(); offset = end + 2; return s; }
  function one() {
    const type = buffer.slice(offset, offset + 1).toString(); offset += 1;
    if (type === "+") return line();
    if (type === "-") throw new Error(line());
    if (type === ":") return Number(line());
    if (type === "$") { const len = Number(line()); if (len < 0) return null; const s = buffer.slice(offset, offset + len).toString(); offset += len + 2; return s; }
    if (type === "*") { const len = Number(line()); if (len < 0) return null; const arr = []; for (let i = 0; i < len; i++) arr.push(one()); return arr; }
    throw new Error("Réponse Redis inconnue.");
  }
  const replies = [];
  while (offset < buffer.length) replies.push(one());
  return replies.length ? replies[replies.length - 1] : null;
}
async function send(credentials, args) {
  const c = credentials || {};
  const host = c.host || "127.0.0.1";
  const port = Number(c.port || 6379);
  const socket = String(c.tls || "false") === "true" ? tls.connect({ host, port }) : net.connect({ host, port });
  const chunks = [];
  return await new Promise((resolve) => {
    socket.setTimeout(Number(c.timeout || 10000));
    socket.on("data", (d) => chunks.push(d));
    socket.on("error", (e) => resolve({ ok: false, error: e.message }));
    socket.on("timeout", () => { socket.destroy(); resolve({ ok: false, error: "Timeout Redis." }); });
    socket.on("connect", () => {
      const commands = [];
      if (c.password) commands.push(["AUTH", ...(c.username ? [c.username] : []), c.password]);
      if (c.database !== undefined && c.database !== "") commands.push(["SELECT", c.database]);
      commands.push(args);
      socket.write(commands.map(encode).join(""));
    });
    socket.on("end", () => { try { resolve({ ok: true, data: parse(Buffer.concat(chunks)) }); } catch (e) { resolve({ ok: false, error: e.message, raw: Buffer.concat(chunks).toString() }); } });
    setTimeout(() => socket.end(), 50);
  });
}
function response(data) { return { ok: true, id: "", status: "ok", name: "", data, result_json: compactJson(data) }; }
function items(data) { const arr = Array.isArray(data) ? data : []; return { ok: true, items: arr.map((v, i) => ({ id: String(i), name: String(v), status: "", url: "", text: String(v), result_json: compactJson(v) })), totalCount: arr.length, nextCursor: "", data: arr, result_json: compactJson(arr) }; }
function splitCsv(v) { return String(v || "").split(",").map((s) => s.trim()).filter(Boolean); }
function flatObject(obj) { const out = []; for (const [k, v] of Object.entries(obj || {})) out.push(k, typeof v === "string" ? v : compactJson(v)); return out; }
async function run(key, inputs, opts) {
  const d = inputs || {};
  const c = (opts && opts.credentials) || {};
  try {
    let args;
    if (key === "redis_key_get") args = ["GET", d.keyName];
    else if (key === "redis_key_set") args = d.ttl ? ["SET", d.keyName, d.value, "EX", d.ttl] : ["SET", d.keyName, d.value];
    else if (key === "redis_key_delete") args = ["DEL", ...splitCsv(d.keys)];
    else if (key === "redis_key_exists") args = ["EXISTS", d.keyName];
    else if (key === "redis_key_expire") args = ["EXPIRE", d.keyName, d.seconds];
    else if (key === "redis_keys_scan") args = ["SCAN", "0", "MATCH", d.pattern || "*", "COUNT", d.count || 100];
    else if (key === "redis_hash_get") args = ["HGETALL", d.keyName];
    else if (key === "redis_hash_set") args = ["HSET", d.keyName, ...flatObject(parseJson(d.data, "data", {}))];
    else if (key === "redis_hash_delete") args = ["HDEL", d.keyName, ...splitCsv(d.fields)];
    else if (key === "redis_list_push") args = [String(d.side || "right").toLowerCase() === "left" ? "LPUSH" : "RPUSH", d.keyName, d.value];
    else if (key === "redis_list_range") args = ["LRANGE", d.keyName, d.start || 0, d.stop || 99];
    else if (key === "redis_list_pop") args = [String(d.side || "left").toLowerCase() === "right" ? "RPOP" : "LPOP", d.keyName];
    else if (key === "redis_set_add") args = ["SADD", d.keyName, ...splitCsv(d.members)];
    else if (key === "redis_set_remove") args = ["SREM", d.keyName, ...splitCsv(d.members)];
    else if (key === "redis_set_members") args = ["SMEMBERS", d.keyName];
    else if (key === "redis_stream_add") args = ["XADD", d.keyName, "*", ...flatObject(parseJson(d.data, "data", {}))];
    else if (key === "redis_stream_read") args = ["XREAD", "COUNT", d.count || 10, "STREAMS", d.keyName, d.lastId || "0"];
    else if (key === "redis_publish") args = ["PUBLISH", d.channel, d.message];
    else if (key === "redis_command_execute") args = [d.command, ...parseJson(d.args, "args", [])];
    else return { ok: false, error: "Action inconnue." };
    const res = await send(c, args);
    if (!res.ok) return res;
    return ["redis_keys_scan", "redis_list_range", "redis_set_members", "redis_stream_read"].includes(key) ? items(Array.isArray(res.data?.[1]) ? res.data[1] : res.data) : response(res.data);
  } catch (e) { return { ok: false, error: e.message }; }
}
module.exports = { utils: { run, send, parseJson } };
