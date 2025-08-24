#!/usr/bin/env node
// Simple CLI: purge DB, seed, reload plugins, import manifest
const fs = require('fs');
const path = require('path');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const { connectMongo, disconnectMongo } = require('../src/db/mongo');
const Company = require('../src/db/models/company.model');
const User = require('../src/db/models/user.model');
const Workspace = require('../src/db/models/workspace.model');
const Flow = require('../src/db/models/flow.model');
const Provider = require('../src/db/models/provider.model');
const NodeTemplate = require('../src/db/models/node-template.model');
const Credential = require('../src/db/models/credential.model');
const App = require('../src/db/models/app.model');
const Notification = require('../src/db/models/notification.model');
const PluginRepo = require('../src/db/models/plugin-repo.model');
const Run = require('../src/db/models/run.model');
const WorkspaceMembership = require('../src/db/models/workspace-membership.model');
const { seedMongoIfEmpty } = require('../src/seed');
const { importManifest } = require('../src/plugins/importer');
const { registry } = require('../src/plugins/registry');

async function purge(){
  await Promise.all([
    Company.deleteMany({}), User.deleteMany({}), Workspace.deleteMany({}), WorkspaceMembership.deleteMany({}),
    Flow.deleteMany({}), Provider.deleteMany({}), NodeTemplate.deleteMany({}), Credential.deleteMany({}), App.deleteMany({}),
    Notification.deleteMany({}), PluginRepo.deleteMany({}), Run.deleteMany({})
  ]);
}

async function main(){
  const argv = yargs(hideBin(process.argv))
    .command('purge', 'Purge all data')
    .command('seed', 'Seed default data (companies/users/workspaces/flows)')
    .command('reload', 'Reload plugins from local/repos directories')
    .command('import [file]', 'Import a manifest JSON file', y => y.positional('file', { type: 'string', demandOption: true }))
    .option('mongo', { type: 'string', describe: 'Mongo URL (override MONGO_URL)' })
    .option('db', { type: 'string', describe: 'Database name (override MONGO_DB_NAME)' })
    .option('dryRun', { type: 'boolean', default: false, describe: 'Dry run for import' })
    .demandCommand(1)
    .help()
    .argv;

  if (argv.mongo) process.env.MONGO_URL = argv.mongo;
  if (argv.db) process.env.MONGO_DB_NAME = argv.db;

  await connectMongo();
  const cmd = argv._[0];
  if (cmd === 'purge'){ await purge(); console.log('Purged.'); }
  else if (cmd === 'seed'){ await seedMongoIfEmpty(); console.log('Seeded if empty.'); }
  else if (cmd === 'reload'){ const loaded = registry.reload(); console.log('Loaded handlers:', loaded); }
  else if (cmd === 'import'){
    const p = path.resolve(String(argv.file));
    const manifest = JSON.parse(fs.readFileSync(p, 'utf8'));
    const summary = await importManifest(manifest, { dryRun: argv.dryRun });
    console.log('Import summary:', JSON.stringify(summary, null, 2));
  }
  await disconnectMongo();
}

main().catch((e) => { console.error(e); process.exit(1); });

