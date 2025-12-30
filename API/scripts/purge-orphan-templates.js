#!/usr/bin/env node
// Quick admin script to purge templates without providerKey
const mongoose = require('mongoose');
const NodeTemplate = require('../src/db/models/node-template.model');
async function main(){
  const uri = process.env.MONGO_URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/homeport';
  await mongoose.connect(uri);
  const q = { $or: [ { providerKey: { $exists: false } }, { providerKey: null }, { providerKey: '' } ] };
  const list = await NodeTemplate.find(q).lean();
  if (!list.length){ console.log('No orphan templates found.'); process.exit(0); }
  console.log('Deleting', list.length, 'orphan templates:', list.map(t => t.key));
  await NodeTemplate.deleteMany({ key: { $in: list.map(t => t.key) } });
  await mongoose.disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });

