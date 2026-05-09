// Migration des rôles : passage de l'enum ['admin','user'] à ['admin','editor','viewer'].
//
// Mapping :
//   - 'admin' → 'admin'  (inchangé)
//   - 'user'  → 'editor' (par défaut, l'ancien 'user' avait CRUD donc ≈ editor)
//   - 'viewer' = nouveau tier, opt-in via UI plus tard
//
// Usage :
//   node API/src/scripts/migrate-roles-2026-05.js
//
// Idempotent : peut être lancé plusieurs fois sans casser quoi que ce soit.

require('../config/load-env').loadEnvOnce();
const mongoose = require('mongoose');
const { connectMongo } = require('../db/mongo');
const User = require('../db/models/user.model');

(async () => {
  try {
    await connectMongo();
    const before = await User.countDocuments({ role: 'user' });
    console.log(`[migrate-roles] ${before} user(s) with role='user' to migrate to 'editor'`);
    if (before === 0) {
      console.log('[migrate-roles] nothing to do.');
      process.exit(0);
    }
    const r = await User.updateMany({ role: 'user' }, { $set: { role: 'editor' } });
    console.log(`[migrate-roles] migrated ${r.modifiedCount} user(s)`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (e) {
    console.error('[migrate-roles] failed:', e);
    process.exit(1);
  }
})();
