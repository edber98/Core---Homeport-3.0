const TOKEN_URL = "https://identity.xero.com/connect/token";
const API_BASE_URL = "https://api.xero.com/api.xro/2.0";

function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function setNestedValue(target, path, value) {
  if (!Array.isArray(path) || !path.length) return;
  let cursor = target;
  for (let i = 0; i < path.length - 1; i += 1) {
    const segment = path[i];
    if (!isPlainObject(cursor[segment])) cursor[segment] = {};
    cursor = cursor[segment];
  }
  cursor[path[path.length - 1]] = value;
}

function coerceFieldValue(value, field) {
  if (value === undefined || value === null || value === "") return undefined;
  const type = String(field?.type || "text");
  const key = field?.key || "champ";

  if (type === "json") {
    if (typeof value === "object") return value;
    try {
      return JSON.parse(String(value));
    } catch {
      throw new Error(`JSON invalide dans ${key}.`);
    }
  }

  if (type === "checkbox") {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["true", "1", "yes", "oui"].includes(normalized)) return true;
      if (["false", "0", "no", "non"].includes(normalized)) return false;
    }
    return !!value;
  }

  if (type === "number") {
    if (typeof value === "number") return value;
    const num = Number(value);
    if (Number.isNaN(num)) throw new Error(`Nombre invalide dans ${key}.`);
    return num;
  }

  return value;
}

function buildBodyFromFields(inputs, fields) {
  const body = {};
  for (const field of fields || []) {
    const rawValue = inputs ? inputs[field.key] : undefined;
    const value = coerceFieldValue(rawValue, field);
    if (value === undefined) continue;
    setNestedValue(body, field.bodyPath || [field.key], value);
  }
  return Object.keys(body).length ? body : undefined;
}

function firstPathSegment(pathname) {
  const parts = String(pathname || "").split("/").filter(Boolean);
  return parts[0] || "";
}

function hasEntityPathId(pathname) {
  const parts = String(pathname || "").split("/").filter(Boolean);
  return parts.some((part) => /^\{.+\}$/.test(part));
}

function envelopeKeyForPath(pathname) {
  const segment = firstPathSegment(pathname);
  const map = {
    Accounts: "Accounts",
    BatchPayments: "BatchPayments",
    BankTransactions: "BankTransactions",
    BankTransfers: "BankTransfers",
    Budgets: "Budgets",
    Contacts: "Contacts",
    ContactGroups: "ContactGroups",
    CreditNotes: "CreditNotes",
    Currencies: "Currencies",
    ExpenseClaims: "ExpenseClaims",
    Invoices: "Invoices",
    Items: "Items",
    Journals: "Journals",
    LinkedTransactions: "LinkedTransactions",
    ManualJournals: "ManualJournals",
    Organisation: "Organisations",
    Overpayments: "Overpayments",
    Payments: "Payments",
    Prepayments: "Prepayments",
    PurchaseOrders: "PurchaseOrders",
    Quotes: "Quotes",
    Receipts: "Receipts",
    RepeatingInvoices: "RepeatingInvoices",
    Reports: "Reports",
    TaxRates: "TaxRates",
    TrackingCategories: "TrackingCategories",
    Users: "Users"
  };
  return map[segment] || null;
}

function buildHistoryPayload(body) {
  if (Array.isArray(body)) return { HistoryRecords: body };
  if (!isPlainObject(body)) return { HistoryRecords: [{ Details: String(body || "") }] };
  if (Array.isArray(body.HistoryRecords)) return body;
  if (body.Details || body.details) {
    return { HistoryRecords: [{ Details: body.Details || body.details }] };
  }
  return { HistoryRecords: [body] };
}

function buildAllocationsPayload(body) {
  if (Array.isArray(body)) return { Allocations: body };
  if (isPlainObject(body) && Array.isArray(body.Allocations)) return body;
  return { Allocations: [body] };
}

function buildContactGroupContactsPayload(body) {
  if (Array.isArray(body)) return { Contacts: body };
  if (isPlainObject(body) && Array.isArray(body.Contacts)) return body;
  return { Contacts: [body] };
}

function buildWrappedPayload(pathname, body) {
  if (body === undefined) return undefined;
  if (pathname.includes("/Attachments/")) return body;
  if (/\/History$/i.test(pathname)) return buildHistoryPayload(body);
  if (/\/Allocations$/i.test(pathname)) return buildAllocationsPayload(body);
  if (/\/ContactGroups\/\{[^}]+\}\/Contacts$/i.test(pathname)) return buildContactGroupContactsPayload(body);

  const key = envelopeKeyForPath(pathname);
  if (!key) return body;
  if (isPlainObject(body) && body[key] !== undefined) return body;
  if (Array.isArray(body)) return { [key]: body };
  return { [key]: [body] };
}

function extractBinaryPayload(body) {
  if (!isPlainObject(body)) return null;

  const contentBase64 = body.contentBase64 || body.base64 || body.dataBase64;
  const content = body.content || body.text || body.data;
  if (!contentBase64 && content === undefined) return null;

  const buffer = contentBase64
    ? Buffer.from(String(contentBase64), "base64")
    : Buffer.from(String(content), "utf8");

  return {
    buffer,
    contentType: body.contentType || body.mimeType || "application/octet-stream",
    includeOnline: body.includeOnline
  };
}

function deriveId(record) {
  const directKeys = [
    "id",
    "ID",
    "InvoiceID",
    "CreditNoteID",
    "ContactID",
    "ContactGroupID",
    "PaymentID",
    "BatchPaymentID",
    "BankTransactionID",
    "BankTransferID",
    "ItemID",
    "LinkedTransactionID",
    "ManualJournalID",
    "OverpaymentID",
    "PrepaymentID",
    "PurchaseOrderID",
    "QuoteID",
    "ReceiptID",
    "RepeatingInvoiceID",
    "ExpenseClaimID",
    "JournalID",
    "BudgetID",
    "UserID",
    "ReportID",
    "TrackingCategoryID",
    "TrackingOptionID"
  ];
  for (const key of directKeys) {
    if (record[key] !== undefined && record[key] !== null && record[key] !== "") return String(record[key]);
  }
  for (const [key, value] of Object.entries(record)) {
    if (/id$/i.test(key) && value !== undefined && value !== null && value !== "") return String(value);
  }
  return "";
}

function deriveName(record) {
  const keys = [
    "name",
    "Name",
    "Title",
    "InvoiceNumber",
    "CreditNoteNumber",
    "PurchaseOrderNumber",
    "QuoteNumber",
    "ContactNumber",
    "Reference",
    "FileName",
    "EmailAddress",
    "UserName"
  ];
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null && record[key] !== "") return String(record[key]);
  }
  return "";
}

function deriveStatus(record) {
  const keys = ["status", "Status", "ContactStatus", "InvoiceStatus", "State"];
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null && record[key] !== "") return String(record[key]);
  }
  return "";
}

function deriveDate(record, keys) {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null && record[key] !== "") return record[key];
  }
  return "";
}

function normalizeRecord(record) {
  if (!isPlainObject(record)) {
    return { value: record, id: "", name: "", url: "", status: "", created_at: "", updated_at: "", raw: record };
  }

  return {
    ...record,
    id: deriveId(record),
    name: deriveName(record),
    url: record.Url || record.URL || record.url || "",
    status: deriveStatus(record),
    created_at: deriveDate(record, ["Date", "DateString", "CreatedDateUTC", "CreatedDateUTCString", "DateUTC"]),
    updated_at: deriveDate(record, ["UpdatedDateUTC", "UpdatedDateUTCString", "Date", "DateUTC"]),
    raw: record
  };
}

function normalizeListPayload(items) {
  const list = Array.isArray(items) ? items : [];
  return {
    items: list.map(normalizeRecord),
    total: list.length,
    next_cursor: null
  };
}

function maybeListResponse(pathname, method, payload) {
  if (!isPlainObject(payload)) return null;

  const entry = Object.entries(payload).find(([, value]) => Array.isArray(value));
  if (!entry) return null;

  const [key, items] = entry;
  const isListByPath =
    method === "GET" &&
    (
      !hasEntityPathId(pathname) ||
      /\/History$/i.test(pathname) ||
      /\/Attachments$/i.test(pathname) ||
      pathname === "/Reports" ||
      pathname === "/Users"
    );

  if (isListByPath) return normalizeListPayload(items);
  if (Array.isArray(items) && items.length > 1) return normalizeListPayload(items);
  if (pathname === "/Organisation" && Array.isArray(items) && items.length) return normalizeRecord(items[0]);
  if (Array.isArray(items) && items.length === 1) return normalizeRecord(items[0]);
  if (key === "Reports") return normalizeListPayload(items);
  return normalizeListPayload(items);
}

function normalizeJsonResponse(pathname, method, payload) {
  const listPayload = maybeListResponse(pathname, method, payload);
  if (listPayload) return listPayload;

  if (isPlainObject(payload)) {
    const firstObject = Object.values(payload).find((value) => isPlainObject(value));
    if (firstObject && Object.keys(payload).length === 1) return normalizeRecord(firstObject);
    return normalizeRecord(payload);
  }

  return normalizeRecord(payload);
}

async function getAccessToken(credentials) {
  const { clientId, clientSecret, refreshToken, accessToken } = credentials || {};
  if (accessToken) return { ok: true, accessToken: String(accessToken) };
  if (!clientId || !clientSecret || !refreshToken) {
    return { ok: false, error: "Identifiants Xero manquants: clientId, clientSecret et refreshToken sont requis." };
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  let res;
  try {
    res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json"
      },
      body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`
    });
  } catch (error) {
    return { ok: false, error: `Échec du rafraîchissement du token Xero: ${error.message}` };
  }

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }

  if (!res.ok || !data || !data.access_token) {
    return {
      ok: false,
      error: data?.error_description || data?.error || `HTTP ${res.status} lors du rafraîchissement du token Xero.`
    };
  }

  return { ok: true, accessToken: data.access_token };
}

async function providerRequest(opts, pathname, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const tenantId = credentials.tenantId;
  if (!tenantId) return { ok: false, error: "tenantId Xero manquant." };

  const tokenResult = await getAccessToken(credentials);
  if (!tokenResult.ok) return tokenResult;

  const url = new URL(`${API_BASE_URL}${pathname.startsWith("/") ? pathname : `/${pathname}`}`);
  const query = { ...(options.query || {}) };
  const ifModifiedSince = query.ifModifiedSince;
  delete query.ifModifiedSince;

  const body = options.body;
  const binaryUpload = pathname.includes("/Attachments/") ? extractBinaryPayload(body) : null;
  if (binaryUpload && binaryUpload.includeOnline !== undefined) {
    query.includeOnline = binaryUpload.includeOnline;
  }

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(key, String(value));
  }

  const headers = {
    Authorization: `Bearer ${tokenResult.accessToken}`,
    Accept: "application/json",
    "xero-tenant-id": String(tenantId),
    ...(options.headers || {})
  };
  if (ifModifiedSince) headers["If-Modified-Since"] = String(ifModifiedSince);

  let requestBody;
  if (binaryUpload) {
    headers["Content-Type"] = binaryUpload.contentType;
    requestBody = binaryUpload.buffer;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    requestBody = JSON.stringify(buildWrappedPayload(pathname, body));
  }

  let res;
  try {
    res = await fetch(url, {
      method: options.method || "GET",
      headers,
      body: requestBody
    });
  } catch (error) {
    return { ok: false, error: error.message };
  }

  const contentType = String(res.headers.get("content-type") || "");
  const isJson = contentType.includes("application/json") || contentType.includes("text/json");
  const isText = contentType.startsWith("text/");

  if (isJson) {
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }

    if (!res.ok) {
      const problem = data?.Elements?.[0]?.ValidationErrors?.[0]?.Message
        || data?.Detail
        || data?.Message
        || data?.error
        || `HTTP ${res.status}`;
      return { ok: false, error: problem, status: res.status, details: data };
    }

    return {
      ok: true,
      status: res.status,
      data: normalizeJsonResponse(pathname, String(options.method || "GET").toUpperCase(), data)
    };
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  if (!res.ok) {
    return {
      ok: false,
      error: buffer.toString("utf8") || `HTTP ${res.status}`,
      status: res.status
    };
  }

  const disposition = res.headers.get("content-disposition") || "";
  const fileNameMatch = disposition.match(/filename="?([^";]+)"?/i);
  const textValue = isText ? buffer.toString("utf8") : null;

  return {
    ok: true,
    status: res.status,
    data: {
      id: "",
      name: fileNameMatch ? fileNameMatch[1] : "",
      url: "",
      status: String(res.status),
      created_at: "",
      updated_at: "",
      contentBase64: buffer.toString("base64"),
      contentType: contentType || "application/octet-stream",
      fileName: fileNameMatch ? fileNameMatch[1] : "",
      size: buffer.length,
      text: textValue,
      raw: {
        contentType: contentType || "application/octet-stream",
        fileName: fileNameMatch ? fileNameMatch[1] : "",
        size: buffer.length
      }
    }
  };
}

module.exports = { utils: { buildBodyFromFields, providerRequest, getAccessToken } };
