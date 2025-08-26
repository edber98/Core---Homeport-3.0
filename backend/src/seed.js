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
    store.add(store.flows, { name: `${ws.name} — Demo 1`, workspaceId: ws.id, status: 'draft', enabled: true, graph: { nodes: [], edges: [] } });
    store.add(store.flows, { name: `${ws.name} — Demo 2`, workspaceId: ws.id, status: 'test', enabled: false, graph: { nodes: [], edges: [] } });
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
    await Flow.create({ name: `${ws.name} — Demo 1`, workspaceId: ws._id, status: 'draft', enabled: true, graph: { nodes: [], edges: [] } });
    await Flow.create({ name: `${ws.name} — Demo 2`, workspaceId: ws._id, status: 'test', enabled: false, graph: { nodes: [], edges: [] } });
  }

  // Providers
  await Provider.create({ key: 'http', name: 'HTTP', title: 'HTTP', categories: ['network'], enabled: true, iconClass: 'fa-solid fa-code' });
  await Provider.create({ key: 'mail', name: 'Mail', title: 'Mail', categories: ['communication'], enabled: true, iconClass: 'fa-solid fa-envelope' });

  // Node templates (website + form examples)
  await NodeTemplate.create({ key: 'website_open', name: 'OpenWebsite', title: 'Open Website', subtitle: 'Website', description: 'Open an URL in a browser', icon: 'fa-solid fa-globe', type: 'function', category: 'website', providerKey: 'http', args: { title: 'Open Website', ui: { layout: 'vertical', labelsOnTop: true }, fields: [ { type: 'text', key: 'url', label: 'URL', col: { xs:24, sm:24, md:24, lg:24, xl:24 }, expression: { allow: true }, validators: [{ type: 'required' }] } ] }, output: ['Success'], authorize_catch_error: true, authorize_skip_error: true });
  await NodeTemplate.create({ key: 'form_submit', name: 'SubmitForm', title: 'Submit Form', subtitle: 'Form', description: 'Submit a form with data', icon: 'fa-solid fa-table', type: 'function', category: 'form', providerKey: 'http', args: { title: 'Form Submit', ui: { layout: 'vertical', labelsOnTop: true }, fields: [ { type: 'text', key: 'formId', label: 'Form ID', col: { xs:24, sm:24, md:24, lg:24, xl:24 }, expression: { allow: true }, validators: [{ type: 'required' }] }, { type: 'object', key: 'data', label: 'Data', col: { xs:24, sm:24, md:24, lg:24, xl:24 }, expression: { allow: true } } ] }, output: ['Success','Retry'], authorize_catch_error: true, authorize_skip_error: false });

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
