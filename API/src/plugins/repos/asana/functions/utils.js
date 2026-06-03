async function asanaRequest(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const token = credentials.personalAccessToken;
  if (!token) return { ok: false, error: "Missing Asana personal access token." };

  const url = new URL(`https://app.asana.com/api/1.0${path}`);
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }

  const headers = {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  const method = options.method || "GET";
  const body = options.body ? JSON.stringify(options.body) : undefined;

  let res;
  try {
    res = await fetch(url, { method, headers, body });
  } catch (e) {
    return { ok: false, error: e.message };
  }

  const text = await res.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (!res.ok) {
    const errMsg = (data && data.errors && data.errors[0]) ? data.errors[0].message : `HTTP ${res.status}`;
    return { ok: false, error: errMsg, status: res.status, details: data };
  }
  return { ok: true, data };
}

function mapTask(r, fallbackProject) {
  const task = r || {};
  const projects = Array.isArray(task.projects) ? task.projects : [];
  return {
    gid: task.gid || "",
    name: task.name || "",
    notes: task.notes || "",
    assignee: task.assignee ? task.assignee.name || task.assignee.gid || "" : "",
    completed: String(task.completed || false),
    due_on: task.due_on || "",
    project: fallbackProject || (projects[0] ? projects[0].name || projects[0].gid || "" : ""),
    created_at: task.created_at || "",
    modified_at: task.modified_at || ""
  };
}

module.exports = { utils: { asanaRequest, mapTask } };
