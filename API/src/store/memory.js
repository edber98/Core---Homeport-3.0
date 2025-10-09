const { randomUUID } = require('crypto');

class MemoryStore {
  constructor(){ this.reset(); }

  reset(){
    this.companies = new Map(); // id → {id, name}
    this.users = new Map();     // id → {id, email, pwdHash, role, companyId}
    this.workspaces = new Map();// id → {id, name, companyId, templatesAllowed: string[]}
    this.flows = new Map();     // id → {id, workspaceId, name, status, enabled, graph}
    this.runs = new Map();      // id → {id, flowId, workspaceId, companyId, status, events:[], result: any}
  }

  add(map, obj){ const id = obj.id || randomUUID(); const copy = { ...obj, id }; map.set(id, copy); return copy; }
}

module.exports = { MemoryStore };

