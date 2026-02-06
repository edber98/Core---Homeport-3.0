// Trello API handler functions
// All functions share a common pattern: build URL, add auth, call API, return result

const BASE_URL = 'https://api.trello.com/1';

/**
 * Generic Trello API call
 * @param {string} method - HTTP method
 * @param {string} pathTemplate - URL path with {param} placeholders
 * @param {object} inputs - Compiled args from the node form
 * @param {object} credentials - { apiKey, apiToken }
 * @param {object} [options] - { pathParams: [...], queryParams: [...], bodyParams: [...] }
 */
async function trelloApi(method, pathTemplate, inputs, credentials, options = {}) {
  const { apiKey, apiToken } = credentials || {};
  if (!apiKey || !apiToken) throw new Error('Trello credentials required (apiKey + apiToken)');

  const { pathParams = [], queryParams = [], bodyParams = [] } = options;

  // Build path by replacing {param} with input values
  let path = pathTemplate;
  for (const p of pathParams) {
    const val = String(inputs[p] || '').trim();
    if (!val) throw new Error(`${p} is required`);
    path = path.replace(`{${p}}`, encodeURIComponent(val));
  }

  // Build query string
  const qs = new URLSearchParams();
  qs.set('key', apiKey);
  qs.set('token', apiToken);
  for (const q of queryParams) {
    const val = inputs[q];
    if (val !== undefined && val !== null && val !== '') {
      qs.set(q, String(val));
    }
  }

  const url = `${BASE_URL}${path}?${qs.toString()}`;

  // Build body for POST/PUT
  const fetchOpts = { method, headers: {} };
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    const body = {};
    for (const b of bodyParams) {
      const val = inputs[b];
      if (val !== undefined && val !== null && val !== '') {
        body[b] = val;
      }
    }
    if (Object.keys(body).length > 0) {
      fetchOpts.headers['Content-Type'] = 'application/json';
      fetchOpts.body = JSON.stringify(body);
    }
  }

  const res = await fetch(url, fetchOpts);
  let data;
  const ct = String(res.headers.get('content-type') || '');
  try {
    if (ct.includes('application/json')) data = await res.json();
    else data = await res.text();
  } catch { data = await res.text().catch(() => null); }

  if (!res.ok) {
    const errMsg = typeof data === 'string' ? data : (data && data.message) || JSON.stringify(data);
    return { ok: false, error: `Trello API error ${res.status}: ${errMsg}`, status: res.status };
  }

  return { ok: true, status: res.status, data };
}

// ============================================================
// BOARDS
// ============================================================

module.exports = {
  async trello_board_create(node, msg, inputs, opts) {
    return trelloApi('POST', '/boards', inputs, opts?.credentials, {
      bodyParams: ['name', 'desc', 'idOrganization', 'defaultLists', 'defaultLabels', 'prefs_permissionLevel']
    });
  },

  async trello_board_get(node, msg, inputs, opts) {
    return trelloApi('GET', '/boards/{idBoard}', inputs, opts?.credentials, {
      pathParams: ['idBoard'],
      queryParams: ['fields']
    });
  },

  async trello_board_update(node, msg, inputs, opts) {
    return trelloApi('PUT', '/boards/{idBoard}', inputs, opts?.credentials, {
      pathParams: ['idBoard'],
      bodyParams: ['name', 'desc', 'closed']
    });
  },

  async trello_board_lists(node, msg, inputs, opts) {
    return trelloApi('GET', '/boards/{idBoard}/lists', inputs, opts?.credentials, {
      pathParams: ['idBoard'],
      queryParams: ['filter', 'fields']
    });
  },

  async trello_board_cards(node, msg, inputs, opts) {
    return trelloApi('GET', '/boards/{idBoard}/cards', inputs, opts?.credentials, {
      pathParams: ['idBoard'],
      queryParams: ['fields']
    });
  },

  async trello_board_members(node, msg, inputs, opts) {
    return trelloApi('GET', '/boards/{idBoard}/members', inputs, opts?.credentials, {
      pathParams: ['idBoard'],
      queryParams: ['fields']
    });
  },

  async trello_board_labels(node, msg, inputs, opts) {
    return trelloApi('GET', '/boards/{idBoard}/labels', inputs, opts?.credentials, {
      pathParams: ['idBoard'],
      queryParams: ['fields', 'limit']
    });
  },

  // ============================================================
  // CARDS
  // ============================================================

  async trello_card_create(node, msg, inputs, opts) {
    return trelloApi('POST', '/cards', inputs, opts?.credentials, {
      bodyParams: ['idList', 'name', 'desc', 'pos', 'due', 'dueComplete', 'idMembers', 'idLabels', 'urlSource']
    });
  },

  async trello_card_get(node, msg, inputs, opts) {
    return trelloApi('GET', '/cards/{idCard}', inputs, opts?.credentials, {
      pathParams: ['idCard'],
      queryParams: ['fields', 'attachments', 'members']
    });
  },

  async trello_card_update(node, msg, inputs, opts) {
    return trelloApi('PUT', '/cards/{idCard}', inputs, opts?.credentials, {
      pathParams: ['idCard'],
      bodyParams: ['name', 'desc', 'closed', 'idList', 'idBoard', 'pos', 'due', 'dueComplete', 'idMembers', 'idLabels']
    });
  },

  async trello_card_delete(node, msg, inputs, opts) {
    return trelloApi('DELETE', '/cards/{idCard}', inputs, opts?.credentials, {
      pathParams: ['idCard']
    });
  },

  async trello_card_move(node, msg, inputs, opts) {
    return trelloApi('PUT', '/cards/{idCard}', inputs, opts?.credentials, {
      pathParams: ['idCard'],
      bodyParams: ['idList', 'idBoard', 'pos']
    });
  },

  async trello_card_add_comment(node, msg, inputs, opts) {
    return trelloApi('POST', '/cards/{idCard}/actions/comments', inputs, opts?.credentials, {
      pathParams: ['idCard'],
      bodyParams: ['text']
    });
  },

  async trello_card_add_label(node, msg, inputs, opts) {
    return trelloApi('POST', '/cards/{idCard}/idLabels', inputs, opts?.credentials, {
      pathParams: ['idCard'],
      bodyParams: ['value']
    });
  },

  async trello_card_remove_label(node, msg, inputs, opts) {
    return trelloApi('DELETE', '/cards/{idCard}/idLabels/{idLabel}', inputs, opts?.credentials, {
      pathParams: ['idCard', 'idLabel']
    });
  },

  async trello_card_add_member(node, msg, inputs, opts) {
    return trelloApi('POST', '/cards/{idCard}/idMembers', inputs, opts?.credentials, {
      pathParams: ['idCard'],
      bodyParams: ['value']
    });
  },

  async trello_card_remove_member(node, msg, inputs, opts) {
    return trelloApi('DELETE', '/cards/{idCard}/idMembers/{idMember}', inputs, opts?.credentials, {
      pathParams: ['idCard', 'idMember']
    });
  },

  async trello_card_attachments(node, msg, inputs, opts) {
    return trelloApi('GET', '/cards/{idCard}/attachments', inputs, opts?.credentials, {
      pathParams: ['idCard']
    });
  },

  async trello_card_add_attachment(node, msg, inputs, opts) {
    return trelloApi('POST', '/cards/{idCard}/attachments', inputs, opts?.credentials, {
      pathParams: ['idCard'],
      bodyParams: ['name', 'url', 'mimeType']
    });
  },

  async trello_card_checklists(node, msg, inputs, opts) {
    return trelloApi('GET', '/cards/{idCard}/checklists', inputs, opts?.credentials, {
      pathParams: ['idCard']
    });
  },

  async trello_card_add_checklist(node, msg, inputs, opts) {
    return trelloApi('POST', '/cards/{idCard}/checklists', inputs, opts?.credentials, {
      pathParams: ['idCard'],
      bodyParams: ['name', 'idChecklistSource', 'pos']
    });
  },

  async trello_card_actions(node, msg, inputs, opts) {
    return trelloApi('GET', '/cards/{idCard}/actions', inputs, opts?.credentials, {
      pathParams: ['idCard'],
      queryParams: ['filter', 'limit']
    });
  },

  // ============================================================
  // LISTS
  // ============================================================

  async trello_list_create(node, msg, inputs, opts) {
    return trelloApi('POST', '/lists', inputs, opts?.credentials, {
      bodyParams: ['name', 'idBoard', 'pos']
    });
  },

  async trello_list_get(node, msg, inputs, opts) {
    return trelloApi('GET', '/lists/{idList}', inputs, opts?.credentials, {
      pathParams: ['idList'],
      queryParams: ['fields']
    });
  },

  async trello_list_update(node, msg, inputs, opts) {
    return trelloApi('PUT', '/lists/{idList}', inputs, opts?.credentials, {
      pathParams: ['idList'],
      bodyParams: ['name', 'closed', 'pos', 'subscribed']
    });
  },

  async trello_list_cards(node, msg, inputs, opts) {
    return trelloApi('GET', '/lists/{idList}/cards', inputs, opts?.credentials, {
      pathParams: ['idList'],
      queryParams: ['fields']
    });
  },

  async trello_list_archive_cards(node, msg, inputs, opts) {
    return trelloApi('POST', '/lists/{idList}/archiveAllCards', inputs, opts?.credentials, {
      pathParams: ['idList']
    });
  },

  async trello_list_move_cards(node, msg, inputs, opts) {
    return trelloApi('POST', '/lists/{idList}/moveAllCards', inputs, opts?.credentials, {
      pathParams: ['idList'],
      bodyParams: ['idBoard']
    });
  },

  // ============================================================
  // LABELS
  // ============================================================

  async trello_label_create(node, msg, inputs, opts) {
    return trelloApi('POST', '/labels', inputs, opts?.credentials, {
      bodyParams: ['name', 'color', 'idBoard']
    });
  },

  async trello_label_get(node, msg, inputs, opts) {
    return trelloApi('GET', '/labels/{idLabel}', inputs, opts?.credentials, {
      pathParams: ['idLabel'],
      queryParams: ['fields']
    });
  },

  async trello_label_update(node, msg, inputs, opts) {
    return trelloApi('PUT', '/labels/{idLabel}', inputs, opts?.credentials, {
      pathParams: ['idLabel'],
      bodyParams: ['name', 'color']
    });
  },

  async trello_label_delete(node, msg, inputs, opts) {
    return trelloApi('DELETE', '/labels/{idLabel}', inputs, opts?.credentials, {
      pathParams: ['idLabel']
    });
  },

  // ============================================================
  // CHECKLISTS
  // ============================================================

  async trello_checklist_create(node, msg, inputs, opts) {
    return trelloApi('POST', '/checklists', inputs, opts?.credentials, {
      bodyParams: ['idCard', 'name', 'pos']
    });
  },

  async trello_checklist_get(node, msg, inputs, opts) {
    return trelloApi('GET', '/checklists/{idChecklist}', inputs, opts?.credentials, {
      pathParams: ['idChecklist'],
      queryParams: ['fields', 'checkItems']
    });
  },

  async trello_checklist_delete(node, msg, inputs, opts) {
    return trelloApi('DELETE', '/checklists/{idChecklist}', inputs, opts?.credentials, {
      pathParams: ['idChecklist']
    });
  },

  async trello_checklist_items(node, msg, inputs, opts) {
    return trelloApi('GET', '/checklists/{idChecklist}/checkItems', inputs, opts?.credentials, {
      pathParams: ['idChecklist'],
      queryParams: ['fields']
    });
  },

  async trello_checklist_add_item(node, msg, inputs, opts) {
    return trelloApi('POST', '/checklists/{idChecklist}/checkItems', inputs, opts?.credentials, {
      pathParams: ['idChecklist'],
      bodyParams: ['name', 'pos', 'checked']
    });
  },

  async trello_checklist_delete_item(node, msg, inputs, opts) {
    return trelloApi('DELETE', '/checklists/{idChecklist}/checkItems/{idCheckItem}', inputs, opts?.credentials, {
      pathParams: ['idChecklist', 'idCheckItem']
    });
  },

  async trello_checklist_update_item(node, msg, inputs, opts) {
    return trelloApi('PUT', '/cards/{idCard}/checklist/{idChecklist}/checkItem/{idCheckItem}', inputs, opts?.credentials, {
      pathParams: ['idCard', 'idChecklist', 'idCheckItem'],
      bodyParams: ['name', 'state', 'pos']
    });
  },

  // ============================================================
  // MEMBERS
  // ============================================================

  async trello_member_get(node, msg, inputs, opts) {
    return trelloApi('GET', '/members/{idMember}', inputs, opts?.credentials, {
      pathParams: ['idMember'],
      queryParams: ['fields']
    });
  },

  async trello_member_boards(node, msg, inputs, opts) {
    return trelloApi('GET', '/members/{idMember}/boards', inputs, opts?.credentials, {
      pathParams: ['idMember'],
      queryParams: ['filter', 'fields']
    });
  },

  async trello_member_cards(node, msg, inputs, opts) {
    return trelloApi('GET', '/members/{idMember}/cards', inputs, opts?.credentials, {
      pathParams: ['idMember'],
      queryParams: ['fields']
    });
  },

  async trello_member_organizations(node, msg, inputs, opts) {
    return trelloApi('GET', '/members/{idMember}/organizations', inputs, opts?.credentials, {
      pathParams: ['idMember'],
      queryParams: ['fields']
    });
  },

  // ============================================================
  // ORGANIZATIONS
  // ============================================================

  async trello_org_get(node, msg, inputs, opts) {
    return trelloApi('GET', '/organizations/{idOrg}', inputs, opts?.credentials, {
      pathParams: ['idOrg'],
      queryParams: ['fields']
    });
  },

  async trello_org_boards(node, msg, inputs, opts) {
    return trelloApi('GET', '/organizations/{idOrg}/boards', inputs, opts?.credentials, {
      pathParams: ['idOrg'],
      queryParams: ['filter', 'fields']
    });
  },

  async trello_org_members(node, msg, inputs, opts) {
    return trelloApi('GET', '/organizations/{idOrg}/members', inputs, opts?.credentials, {
      pathParams: ['idOrg'],
      queryParams: ['fields']
    });
  },

  // ============================================================
  // SEARCH
  // ============================================================

  async trello_search(node, msg, inputs, opts) {
    return trelloApi('GET', '/search', inputs, opts?.credentials, {
      queryParams: ['query', 'idBoards', 'idOrganizations', 'modelTypes', 'cards_limit', 'boards_limit']
    });
  },

  async trello_search_members(node, msg, inputs, opts) {
    return trelloApi('GET', '/search/members', inputs, opts?.credentials, {
      queryParams: ['query', 'limit', 'idBoard', 'idOrganization']
    });
  },

  // ============================================================
  // WEBHOOKS
  // ============================================================

  async trello_webhook_create(node, msg, inputs, opts) {
    return trelloApi('POST', '/webhooks', inputs, opts?.credentials, {
      bodyParams: ['callbackURL', 'idModel', 'description', 'active']
    });
  },

  async trello_webhook_get(node, msg, inputs, opts) {
    return trelloApi('GET', '/webhooks/{idWebhook}', inputs, opts?.credentials, {
      pathParams: ['idWebhook']
    });
  },

  async trello_webhook_update(node, msg, inputs, opts) {
    return trelloApi('PUT', '/webhooks/{idWebhook}', inputs, opts?.credentials, {
      pathParams: ['idWebhook'],
      bodyParams: ['callbackURL', 'idModel', 'description', 'active']
    });
  },

  async trello_webhook_delete(node, msg, inputs, opts) {
    return trelloApi('DELETE', '/webhooks/{idWebhook}', inputs, opts?.credentials, {
      pathParams: ['idWebhook']
    });
  },

  // ============================================================
  // ACTIONS
  // ============================================================

  async trello_action_get(node, msg, inputs, opts) {
    return trelloApi('GET', '/actions/{idAction}', inputs, opts?.credentials, {
      pathParams: ['idAction'],
      queryParams: ['fields']
    });
  },

  async trello_action_delete(node, msg, inputs, opts) {
    return trelloApi('DELETE', '/actions/{idAction}', inputs, opts?.credentials, {
      pathParams: ['idAction']
    });
  },
};
