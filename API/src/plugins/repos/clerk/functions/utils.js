function cleanBaseUrl(value, fallback) {
  return String(value || fallback).replace(/\/+$/, "");
}

function toInt(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parseJsonInput(value, label) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(String(value));
  } catch {
    throw new Error(`JSON invalide dans ${label}.`);
  }
}

function parseBoolean(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  return ["1", "true", "yes", "oui", "on"].includes(String(value).trim().toLowerCase());
}

function parseList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  return String(value).split(/[\n,]+/).map((v) => v.trim()).filter(Boolean);
}

async function clerkRequest(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const secretKey = credentials.secretKey;
  if (!secretKey) return { ok: false, error: "Clé secrète Clerk manquante." };

  const baseUrl = cleanBaseUrl(credentials.baseUrl, "https://api.clerk.com/v1");
  const url = new URL(`${baseUrl}${path}`);
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
    }
  }

  const headers = {
    "Authorization": `Bearer ${secretKey}`,
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  let res;
  try {
    res = await fetch(url, {
      method: options.method || "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
  } catch (e) {
    return { ok: false, error: e.message };
  }

  const text = await res.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }

  if (!res.ok) {
    const first = Array.isArray(data?.errors) ? data.errors[0] : null;
    return { ok: false, error: first?.message || data?.message || data?.error || `HTTP ${res.status}`, status: res.status, details: data };
  }
  return { ok: true, data, status: res.status };
}

function compactUser(user) {
  return {
    id: user?.id,
    username: user?.username,
    first_name: user?.first_name,
    last_name: user?.last_name,
    primary_email_address_id: user?.primary_email_address_id,
    email: (user?.email_addresses || []).find((e) => e.id === user?.primary_email_address_id)?.email_address || user?.email_addresses?.[0]?.email_address || "",
    image_url: user?.image_url,
    created_at: user?.created_at,
    updated_at: user?.updated_at,
    banned: user?.banned,
    locked: user?.locked
  };
}

function compactOrganization(org) {
  return {
    id: org?.id,
    name: org?.name,
    slug: org?.slug,
    image_url: org?.image_url,
    members_count: org?.members_count,
    max_allowed_memberships: org?.max_allowed_memberships,
    created_at: org?.created_at,
    updated_at: org?.updated_at
  };
}

function compactInvitation(invitation) {
  return {
    id: invitation?.id,
    email_address: invitation?.email_address,
    status: invitation?.status,
    role: invitation?.role,
    organization_id: invitation?.organization_id,
    url: invitation?.url,
    created_at: invitation?.created_at,
    updated_at: invitation?.updated_at
  };
}

function compactMembership(membership) {
  return {
    id: membership?.id,
    organization_id: membership?.organization?.id || membership?.organization_id,
    user_id: membership?.public_user_data?.user_id || membership?.user_id,
    role: membership?.role,
    created_at: membership?.created_at,
    updated_at: membership?.updated_at
  };
}

function listData(data) {
  return Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
}

module.exports = {
  utils: {
    clerkRequest,
    compactInvitation,
    compactMembership,
    compactOrganization,
    compactUser,
    listData,
    parseBoolean,
    parseJsonInput,
    parseList,
    toInt
  }
};
