const { SEED, SEED_COMPANIES, SEED_USERS } = require('./config/env');
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
    store.add(store.workspaces, { name: `${c.name} Default`, companyId: c.id, templatesAllowed: [] });
  }
  for (const ws of store.workspaces.values()){
    store.add(store.flows, { name: 'Hello World', workspaceId: ws.id, status: 'draft', enabled: true, graph: { nodes: [], edges: [] } });
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
    await Workspace.create({ name: `${name} Default`, companyId, templatesAllowed: [] });
  }
  const wss = await Workspace.find();
  for (const ws of wss){
    await Flow.create({ name: 'Hello World', workspaceId: ws._id, status: 'draft', enabled: true, graph: { nodes: [], edges: [] } });
  }

  // Providers
  await Provider.create({ key: 'http', name: 'HTTP', categories: ['network'], enabled: true });
  await Provider.create({ key: 'mail', name: 'Mail', categories: ['communication'], enabled: true });

  // Node templates (website + form examples)
  await NodeTemplate.create({ key: 'website_open', name: 'Open Website', type: 'function', category: 'website', args: { title: 'Open Website', ui: { layout: 'vertical', labelsOnTop: true }, fields: [ { type: 'text', key: 'url', label: 'URL', col: { xs:24, sm:24, md:24, lg:24, xl:24 }, expression: { allow: true } } ] }, output: ['Success'], authorize_catch_error: true, authorize_skip_error: true });
  await NodeTemplate.create({ key: 'form_submit', name: 'Submit Form', type: 'function', category: 'form', args: { title: 'Form Submit', ui: { layout: 'vertical', labelsOnTop: true }, fields: [ { type: 'text', key: 'formId', label: 'Form ID', col: { xs:24, sm:24, md:24, lg:24, xl:24 }, expression: { allow: true } }, { type: 'object', key: 'data', label: 'Data', col: { xs:24, sm:24, md:24, lg:24, xl:24 }, expression: { allow: true } } ] }, output: ['Success','Retry'], authorize_catch_error: true, authorize_skip_error: false });

  // Workspace memberships: add all users to their company default ws
  const users = await User.find();
  for (const u of users){
    const ws = await Workspace.findOne({ companyId: u.companyId }).lean();
    if (ws) await WorkspaceMembership.create({ userId: u._id, workspaceId: ws._id, role: u.role === 'admin' ? 'owner' : 'editor' });
  }
}

module.exports = { seedAllMemory, seedMongoIfEmpty };
