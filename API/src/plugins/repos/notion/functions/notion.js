const DEFAULT_BASE_URL = 'https://api.notion.com';
const DEFAULT_VERSION = '2025-09-03';

function normalizeBaseUrl(url) {
  const value = String(url || '').trim();
  return value ? value.replace(/\/+$/, '') : DEFAULT_BASE_URL;
}

function isEmpty(value) {
  return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
}

function parseJsonInput(value) {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'object') return value;
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return undefined;
    try { return JSON.parse(text); } catch { return value; }
  }
  return value;
}

function parseNumber(value) {
  if (isEmpty(value)) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function parseBoolean(value) {
  if (isEmpty(value)) return undefined;
  if (typeof value === 'boolean') return value;
  const s = String(value).toLowerCase();
  if (['true', '1', 'yes', 'y', 'on'].includes(s)) return true;
  if (['false', '0', 'no', 'n', 'off'].includes(s)) return false;
  return undefined;
}

function stringValue(value) {
  if (isEmpty(value)) return undefined;
  return String(value);
}

function requireInput(inputs, key, label) {
  const value = inputs ? inputs[key] : undefined;
  if (isEmpty(value)) {
    throw new Error(`${label || key} is required`);
  }
  return String(value);
}

function mergeBody(inputs, defs) {
  const baseParsed = parseJsonInput(inputs && inputs.body);
  const base = (baseParsed && typeof baseParsed === 'object' && !Array.isArray(baseParsed)) ? { ...baseParsed } : {};
  for (const def of (defs || [])) {
    const raw = inputs ? inputs[def.key] : undefined;
    if (raw === undefined || raw === null || raw === '') {
      if (def.defaultValue !== undefined && base[def.target] === undefined) {
        base[def.target] = def.defaultValue;
      }
      continue;
    }
    const val = def.parser ? def.parser(raw) : raw;
    if (val !== undefined) base[def.target] = val;
  }
  return Object.keys(base).length ? base : undefined;
}

function ensureArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}

function buildParagraphBlock(text) {
  const content = String(text || '').trim();
  if (!content) return null;
  return {
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: [
        { type: 'text', text: { content } }
      ]
    }
  };
}

function buildPaginationQuery(inputs) {
  const query = {};
  const pageSize = parseNumber(inputs && inputs.pageSize);
  const startCursor = stringValue(inputs && inputs.startCursor);
  if (pageSize !== undefined) query.page_size = pageSize;
  if (startCursor !== undefined) query.start_cursor = startCursor;
  return Object.keys(query).length ? query : undefined;
}

function encodeId(id) {
  return encodeURIComponent(String(id));
}

function isFormData(value) {
  if (typeof FormData === 'undefined') return false;
  return value instanceof FormData;
}

async function notionRequest(opts, options) {
  const cfg = options || {};
  const creds = (opts && opts.credentials) || {};
  const baseUrl = normalizeBaseUrl(creds.baseUrl || DEFAULT_BASE_URL);
  const path = cfg.path || '';
  const method = String(cfg.method || 'GET').toUpperCase();
  const urlPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${baseUrl}${urlPath}`);

  if (cfg.query && typeof cfg.query === 'object') {
    for (const [key, value] of Object.entries(cfg.query)) {
      if (value === undefined || value === null || value === '') continue;
      url.searchParams.set(key, String(value));
    }
  }

  const headers = { ...(cfg.headers || {}) };
  const authType = cfg.authType || 'bearer';
  if (authType === 'bearer') {
    const token = cfg.token || creds.accessToken || creds.token;
    if (!token) return { ok: false, error: 'Missing Notion access token.' };
    headers.Authorization = `Bearer ${token}`;
    if (cfg.useNotionVersion !== false) {
      const version = cfg.notionVersion || creds.notionVersion || creds.version || DEFAULT_VERSION;
      if (version) headers['Notion-Version'] = version;
    }
  } else if (authType === 'basic') {
    const clientId = cfg.clientId || creds.clientId;
    const clientSecret = cfg.clientSecret || creds.clientSecret;
    if (!clientId || !clientSecret) return { ok: false, error: 'Missing Notion clientId/clientSecret.' };
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    headers.Authorization = `Basic ${basic}`;
  }

  let body = cfg.body;
  let bodyToSend = undefined;
  if (body !== undefined) {
    if (isFormData(body)) {
      bodyToSend = body;
    } else if (Buffer.isBuffer(body)) {
      bodyToSend = body;
    } else if (typeof body === 'string') {
      bodyToSend = body;
    } else {
      bodyToSend = JSON.stringify(body);
      if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
    }
  }

  let res;
  try {
    res = await fetch(url, { method, headers, body: bodyToSend });
  } catch (error) {
    return { ok: false, error: error && error.message ? error.message : String(error) };
  }

  const responseHeaders = {};
  try {
    for (const [key, value] of res.headers.entries()) {
      responseHeaders[key.toLowerCase()] = value;
    }
  } catch {}

  const text = await res.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }

  if (!res.ok) {
    const errorMsg = (data && (data.message || data.error || data.code)) ? (data.message || data.error || data.code) : `HTTP ${res.status}`;
    return { ok: false, status: res.status, error: errorMsg, details: data, headers: responseHeaders };
  }

  return { ok: true, status: res.status, data, headers: responseHeaders };
}

function makeHandler(config) {
  return async (_node, _msg, inputs, opts) => {
    try {
      const cfg = config || {};
      const path = typeof cfg.path === 'function' ? cfg.path(inputs || {}) : cfg.path;
      const query = cfg.buildQuery ? cfg.buildQuery(inputs || {}) : undefined;
      const body = cfg.buildBody ? cfg.buildBody(inputs || {}) : undefined;
      return await notionRequest(opts, {
        method: cfg.method,
        path,
        query,
        body,
        headers: cfg.headers,
        authType: cfg.authType,
        useNotionVersion: cfg.useNotionVersion
      });
    } catch (error) {
      return { ok: false, error: error && error.message ? error.message : String(error) };
    }
  };
}

const handlers = {
  // OAuth
  notion_oauth_token: makeHandler({
    method: 'POST',
    path: '/v1/oauth/token',
    authType: 'basic',
    useNotionVersion: false,
    buildBody: (inputs) => {
      const code = requireInput(inputs, 'code', 'code');
      const body = mergeBody(inputs, [
        { key: 'code', target: 'code', parser: stringValue },
        { key: 'redirectUri', target: 'redirect_uri', parser: stringValue },
        { key: 'grantType', target: 'grant_type', parser: stringValue }
      ]) || {};
      body.code = code;
      if (!body.grant_type) body.grant_type = 'authorization_code';
      return body;
    }
  }),
  notion_oauth_refresh_token: makeHandler({
    method: 'POST',
    path: '/v1/oauth/token',
    authType: 'basic',
    useNotionVersion: false,
    buildBody: (inputs) => {
      const refreshToken = requireInput(inputs, 'refreshToken', 'refreshToken');
      const body = mergeBody(inputs, [
        { key: 'refreshToken', target: 'refresh_token', parser: stringValue },
        { key: 'redirectUri', target: 'redirect_uri', parser: stringValue },
        { key: 'grantType', target: 'grant_type', parser: stringValue }
      ]) || {};
      body.refresh_token = refreshToken;
      if (!body.grant_type) body.grant_type = 'refresh_token';
      return body;
    }
  }),
  notion_oauth_introspect: makeHandler({
    method: 'POST',
    path: '/v1/oauth/introspect',
    authType: 'basic',
    useNotionVersion: false,
    buildBody: (inputs) => {
      const token = requireInput(inputs, 'token', 'token');
      const body = mergeBody(inputs, [
        { key: 'token', target: 'token', parser: stringValue },
        { key: 'tokenTypeHint', target: 'token_type_hint', parser: stringValue }
      ]) || {};
      body.token = token;
      return body;
    }
  }),
  notion_oauth_revoke: makeHandler({
    method: 'POST',
    path: '/v1/oauth/revoke',
    authType: 'basic',
    useNotionVersion: false,
    buildBody: (inputs) => {
      const token = requireInput(inputs, 'token', 'token');
      const body = mergeBody(inputs, [
        { key: 'token', target: 'token', parser: stringValue }
      ]) || {};
      body.token = token;
      return body;
    }
  }),

  // Search
  notion_search: makeHandler({
    method: 'POST',
    path: '/v1/search',
    buildBody: (inputs) => {
      return mergeBody(inputs, [
        { key: 'query', target: 'query', parser: stringValue },
        { key: 'filter', target: 'filter', parser: parseJsonInput },
        { key: 'sort', target: 'sort', parser: parseJsonInput },
        { key: 'startCursor', target: 'start_cursor', parser: stringValue },
        { key: 'pageSize', target: 'page_size', parser: parseNumber }
      ]);
    }
  }),

  // Users
  notion_users_list: makeHandler({
    method: 'GET',
    path: '/v1/users',
    buildQuery: buildPaginationQuery
  }),
  notion_users_get: makeHandler({
    method: 'GET',
    path: (inputs) => `/v1/users/${encodeId(requireInput(inputs, 'userId', 'userId'))}`
  }),
  notion_users_me: makeHandler({
    method: 'GET',
    path: '/v1/users/me'
  }),

  // Pages
  notion_pages_create: makeHandler({
    method: 'POST',
    path: '/v1/pages',
    buildBody: (inputs) => {
      const body = mergeBody(inputs, [
        { key: 'parent', target: 'parent', parser: parseJsonInput },
        { key: 'properties', target: 'properties', parser: parseJsonInput },
        { key: 'children', target: 'children', parser: parseJsonInput },
        { key: 'icon', target: 'icon', parser: parseJsonInput },
        { key: 'cover', target: 'cover', parser: parseJsonInput }
      ]) || {};

      const parentPageId = stringValue(inputs && inputs.parentPageId);
      const parentDatabaseId = stringValue(inputs && inputs.parentDatabaseId);
      const titleText = stringValue(inputs && inputs.titleText);
      const titlePropertyName = stringValue(inputs && inputs.titlePropertyName) || 'Name';
      const contentText = stringValue(inputs && inputs.contentText);

      if (!body.parent) {
        if (parentPageId) body.parent = { page_id: parentPageId };
        else if (parentDatabaseId) body.parent = { database_id: parentDatabaseId };
      }

      if (!body.properties && titleText) {
        if (body.parent && body.parent.database_id) {
          body.properties = {
            [titlePropertyName]: {
              title: [{ text: { content: titleText } }]
            }
          };
        } else {
          body.properties = {
            title: [{ text: { content: titleText } }]
          };
        }
      }

      if (contentText) {
        const block = buildParagraphBlock(contentText);
        if (block) {
          if (body.children) body.children = ensureArray(body.children).concat([block]);
          else body.children = [block];
        }
      }

      if (!body.parent) throw new Error('parent est requis (parentPageId, parentDatabaseId ou parent JSON).');
      if (!body.properties) throw new Error('properties est requis (titleText + parentDatabaseId, ou properties JSON).');
      return body;
    }
  }),
  notion_pages_get: makeHandler({
    method: 'GET',
    path: (inputs) => `/v1/pages/${encodeId(requireInput(inputs, 'pageId', 'pageId'))}`
  }),
  notion_pages_update: makeHandler({
    method: 'PATCH',
    path: (inputs) => `/v1/pages/${encodeId(requireInput(inputs, 'pageId', 'pageId'))}`,
    buildBody: (inputs) => {
      return mergeBody(inputs, [
        { key: 'properties', target: 'properties', parser: parseJsonInput },
        { key: 'archived', target: 'archived', parser: parseBoolean },
        { key: 'inTrash', target: 'in_trash', parser: parseBoolean },
        { key: 'icon', target: 'icon', parser: parseJsonInput },
        { key: 'cover', target: 'cover', parser: parseJsonInput }
      ]);
    }
  }),
  notion_pages_archive: makeHandler({
    method: 'PATCH',
    path: (inputs) => `/v1/pages/${encodeId(requireInput(inputs, 'pageId', 'pageId'))}`,
    buildBody: (inputs) => {
      const archived = parseBoolean(inputs && inputs.archived);
      const inTrash = parseBoolean(inputs && inputs.inTrash);
      const body = {};
      body.archived = archived !== undefined ? archived : true;
      if (inTrash !== undefined) body.in_trash = inTrash;
      return body;
    }
  }),
  notion_pages_property_item: makeHandler({
    method: 'GET',
    path: (inputs) => {
      const pageId = requireInput(inputs, 'pageId', 'pageId');
      const propertyId = requireInput(inputs, 'propertyId', 'propertyId');
      return `/v1/pages/${encodeId(pageId)}/properties/${encodeId(propertyId)}`;
    }
  }),

  // Blocks
  notion_blocks_get: makeHandler({
    method: 'GET',
    path: (inputs) => `/v1/blocks/${encodeId(requireInput(inputs, 'blockId', 'blockId'))}`
  }),
  notion_blocks_update: makeHandler({
    method: 'PATCH',
    path: (inputs) => `/v1/blocks/${encodeId(requireInput(inputs, 'blockId', 'blockId'))}`,
    buildBody: (inputs) => {
      requireInput(inputs, 'body', 'body');
      return mergeBody(inputs, []);
    }
  }),
  notion_blocks_delete: makeHandler({
    method: 'DELETE',
    path: (inputs) => `/v1/blocks/${encodeId(requireInput(inputs, 'blockId', 'blockId'))}`
  }),
  notion_blocks_children_list: makeHandler({
    method: 'GET',
    path: (inputs) => `/v1/blocks/${encodeId(requireInput(inputs, 'blockId', 'blockId'))}/children`,
    buildQuery: buildPaginationQuery
  }),
  notion_blocks_children_append: makeHandler({
    method: 'PATCH',
    path: (inputs) => `/v1/blocks/${encodeId(requireInput(inputs, 'blockId', 'blockId'))}/children`,
    buildBody: (inputs) => {
      requireInput(inputs, 'children', 'children');
      return mergeBody(inputs, [
        { key: 'children', target: 'children', parser: parseJsonInput }
      ]);
    }
  }),

  // Databases
  notion_databases_create: makeHandler({
    method: 'POST',
    path: '/v1/databases',
    buildBody: (inputs) => {
      requireInput(inputs, 'parent', 'parent');
      requireInput(inputs, 'title', 'title');
      requireInput(inputs, 'properties', 'properties');
      return mergeBody(inputs, [
        { key: 'parent', target: 'parent', parser: parseJsonInput },
        { key: 'title', target: 'title', parser: parseJsonInput },
        { key: 'properties', target: 'properties', parser: parseJsonInput }
      ]);
    }
  }),
  notion_databases_get: makeHandler({
    method: 'GET',
    path: (inputs) => `/v1/databases/${encodeId(requireInput(inputs, 'databaseId', 'databaseId'))}`
  }),
  notion_databases_update: makeHandler({
    method: 'PATCH',
    path: (inputs) => `/v1/databases/${encodeId(requireInput(inputs, 'databaseId', 'databaseId'))}`,
    buildBody: (inputs) => {
      return mergeBody(inputs, [
        { key: 'title', target: 'title', parser: parseJsonInput },
        { key: 'properties', target: 'properties', parser: parseJsonInput }
      ]);
    }
  }),

  // Data sources
  notion_data_sources_create: makeHandler({
    method: 'POST',
    path: '/v1/data_sources',
    buildBody: (inputs) => {
      requireInput(inputs, 'databaseId', 'databaseId');
      return mergeBody(inputs, [
        { key: 'databaseId', target: 'database_id', parser: stringValue },
        { key: 'title', target: 'title', parser: parseJsonInput },
        { key: 'properties', target: 'properties', parser: parseJsonInput }
      ]);
    }
  }),
  notion_data_sources_get: makeHandler({
    method: 'GET',
    path: (inputs) => `/v1/data_sources/${encodeId(requireInput(inputs, 'dataSourceId', 'dataSourceId'))}`
  }),
  notion_data_sources_update: makeHandler({
    method: 'PATCH',
    path: (inputs) => `/v1/data_sources/${encodeId(requireInput(inputs, 'dataSourceId', 'dataSourceId'))}`,
    buildBody: (inputs) => {
      return mergeBody(inputs, [
        { key: 'properties', target: 'properties', parser: parseJsonInput }
      ]);
    }
  }),
  notion_data_sources_query: makeHandler({
    method: 'POST',
    path: (inputs) => `/v1/data_sources/${encodeId(requireInput(inputs, 'dataSourceId', 'dataSourceId'))}/query`,
    buildBody: (inputs) => {
      return mergeBody(inputs, [
        { key: 'filter', target: 'filter', parser: parseJsonInput },
        { key: 'sorts', target: 'sorts', parser: parseJsonInput },
        { key: 'startCursor', target: 'start_cursor', parser: stringValue },
        { key: 'pageSize', target: 'page_size', parser: parseNumber }
      ]);
    }
  }),

  // Comments
  notion_comments_list: makeHandler({
    method: 'GET',
    path: '/v1/comments',
    buildQuery: (inputs) => {
      const query = buildPaginationQuery(inputs) || {};
      const blockId = stringValue(inputs && inputs.blockId);
      const pageId = stringValue(inputs && inputs.pageId);
      if (blockId) query.block_id = blockId;
      if (pageId) query.page_id = pageId;
      return Object.keys(query).length ? query : undefined;
    }
  }),
  notion_comments_create: makeHandler({
    method: 'POST',
    path: '/v1/comments',
    buildBody: (inputs) => {
      const body = mergeBody(inputs, [
        { key: 'parent', target: 'parent', parser: parseJsonInput },
        { key: 'discussionId', target: 'discussion_id', parser: stringValue },
        { key: 'richText', target: 'rich_text', parser: parseJsonInput }
      ]) || {};
      const text = stringValue(inputs && inputs.text);
      if (text && !body.rich_text) {
        body.rich_text = [{ type: 'text', text: { content: text } }];
      }
      return Object.keys(body).length ? body : undefined;
    }
  }),

  // File uploads
  notion_file_uploads_create: makeHandler({
    method: 'POST',
    path: '/v1/file_uploads',
    buildBody: (inputs) => {
      return mergeBody(inputs, [
        { key: 'fileName', target: 'file_name', parser: stringValue },
        { key: 'contentType', target: 'content_type', parser: stringValue },
        { key: 'fileSize', target: 'file_size', parser: parseNumber },
        { key: 'partSize', target: 'part_size', parser: parseNumber }
      ]);
    }
  }),
  notion_file_uploads_send: async (_node, _msg, inputs, opts) => {
    try {
      const fileUploadId = requireInput(inputs, 'fileUploadId', 'fileUploadId');
      const contentBase64 = stringValue(inputs && inputs.contentBase64);
      const content = inputs && inputs.content;
      const contentType = stringValue(inputs && inputs.contentType) || 'application/octet-stream';
      const filename = stringValue(inputs && inputs.filename) || 'upload';

      let body = undefined;
      let headers = {};

      if (contentBase64) {
        const buffer = Buffer.from(contentBase64, 'base64');
        if (typeof FormData !== 'undefined' && typeof Blob !== 'undefined') {
          const form = new FormData();
          const blob = new Blob([buffer], { type: contentType });
          form.append('file', blob, filename);
          body = form;
        } else {
          body = buffer;
          headers['Content-Type'] = contentType;
        }
      } else if (!isEmpty(content)) {
        body = typeof content === 'string' ? content : String(content);
        headers['Content-Type'] = contentType;
      } else {
        const fallback = parseJsonInput(inputs && inputs.body);
        if (fallback !== undefined) body = fallback;
      }

      return await notionRequest(opts, {
        method: 'POST',
        path: `/v1/file_uploads/${encodeId(fileUploadId)}/send`,
        body,
        headers
      });
    } catch (error) {
      return { ok: false, error: error && error.message ? error.message : String(error) };
    }
  },
  notion_file_uploads_complete: makeHandler({
    method: 'POST',
    path: (inputs) => `/v1/file_uploads/${encodeId(requireInput(inputs, 'fileUploadId', 'fileUploadId'))}/complete`,
    buildBody: (inputs) => {
      return mergeBody(inputs, [
        { key: 'parts', target: 'parts', parser: parseJsonInput }
      ]);
    }
  }),
  notion_file_uploads_get: makeHandler({
    method: 'GET',
    path: (inputs) => `/v1/file_uploads/${encodeId(requireInput(inputs, 'fileUploadId', 'fileUploadId'))}`
  }),
  notion_file_uploads_list: makeHandler({
    method: 'GET',
    path: '/v1/file_uploads',
    buildQuery: buildPaginationQuery
  })
};

module.exports = handlers;
