const { SEED, SEED_COMPANIES, SEED_USERS, DEFAULT_WORKSPACE_NAME } = require('./config/env');
const { hashPassword } = require('./utils/crypto');
// DB models are required lazily inside seedMongoIfEmpty to allow memory-only mode without mongoose installed

function seedAllMemory(store){
  store.reset();
  if (!SEED) return store;
  const companiesByName = new Map();
  for (const name of SEED_COMPANIES){
    const c = store.add(store.companies, { name });
    companiesByName.set(name, c);
  }
  for (const u of SEED_USERS){
    const c = companiesByName.get(u.company); if (!c) continue;
    store.add(store.users, { email: u.email, pwdHash: hashPassword(u.password), role: u.role, companyId: c.id });
  }
  for (const c of store.companies.values()){
    const wsDefault = store.add(store.workspaces, { name: `${c.name} ${DEFAULT_WORKSPACE_NAME}`, companyId: c.id, templatesAllowed: [], isDefault: true });
    const wsTesting = store.add(store.workspaces, { name: `${c.name} Testing`, companyId: c.id, templatesAllowed: [] });
  }
  for (const ws of store.workspaces.values()){
    store.add(store.flows, { name: `${ws.name} — Demo 1`, description: 'Flow de démonstration (brouillon)', workspaceId: ws.id, status: 'draft', enabled: true, graph: { nodes: [], edges: [] } });
    store.add(store.flows, { name: `${ws.name} — Demo 2`, description: 'Flow de démonstration (test)', workspaceId: ws.id, status: 'test', enabled: false, graph: { nodes: [], edges: [] } });
  }
  return store;
}

async function seedMongoIfEmpty(){
  if (!SEED) return;
  const Company = require('./db/models/company.model');
  const User = require('./db/models/user.model');
  const Workspace = require('./db/models/workspace.model');
  const Flow = require('./db/models/flow.model');
  const Provider = require('./db/models/provider.model');
  const NodeTemplate = require('./db/models/node-template.model');
  const WorkspaceMembership = require('./db/models/workspace-membership.model');

  const count = await Company.countDocuments();
  if (count > 0) return;
  const nameToId = new Map();
  for (const name of SEED_COMPANIES){
    const c = await Company.create({ name });
    nameToId.set(name, c._id);
  }
  for (const u of SEED_USERS){
    const companyId = nameToId.get(u.company); if (!companyId) continue;
    await User.create({ email: u.email, pwdHash: hashPassword(u.password), role: u.role, companyId });
  }
  for (const [name, companyId] of nameToId.entries()){
    await Workspace.create({ name: `${name} ${DEFAULT_WORKSPACE_NAME}`, companyId, templatesAllowed: [], isDefault: true });
    await Workspace.create({ name: `${name} Testing`, companyId, templatesAllowed: [] });
  }
  const wss = await Workspace.find();
  for (const ws of wss){
    await Flow.create({ name: `${ws.name} — Demo 1`, description: 'Flow de démonstration (brouillon)', workspaceId: ws._id, status: 'draft', enabled: true, graph: { nodes: [], edges: [] } });
    await Flow.create({ name: `${ws.name} — Demo 2`, description: 'Flow de démonstration (test)', workspaceId: ws._id, status: 'test', enabled: false, graph: { nodes: [], edges: [] } });
  }

  // Providers: all providers and node templates are now loaded from plugin manifests.

  // Node templates are no longer seeded — all nodes come from plugins manifests.

  // Condition template is provided via plugins, not seeded here.

  // Workspace memberships: add all users to both default and testing workspaces of their company
  const users = await User.find();
  for (const u of users){
    const wss = await Workspace.find({ companyId: u.companyId }).lean();
    for (const ws of wss){
      await WorkspaceMembership.create({ userId: u._id, workspaceId: ws._id, role: u.role === 'admin' ? 'owner' : 'editor' });
    }
  }
}

module.exports = { seedAllMemory, seedMongoIfEmpty };
