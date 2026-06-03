const { utils } = require('./utils');
module.exports = { async supa_auth_update_user(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.userId) return { ok: false, error: 'userId requis.' };
  const body = {};
  if (d.email) body.email = d.email;
  if (d.password) body.password = d.password;
  if (d.phone) body.phone = d.phone;
  if (d.userMetadata) {
    if (typeof d.userMetadata === 'object') body.user_metadata = d.userMetadata;
    else { try { body.user_metadata = JSON.parse(String(d.userMetadata)); } catch { return { ok: false, error: 'userMetadata JSON invalide.' }; } }
  }
  const res = await utils.supaAuth(opts, `/admin/users/${encodeURIComponent(String(d.userId))}`, { method: 'PUT', body });
  if (!res.ok) return res;
  const u = res.data || {};
  return { ok: true, id: u.id || d.userId, email: u.email || '', phone: u.phone || '', role: u.role || '', createdAt: u.created_at || '', lastSignInAt: u.last_sign_in_at || '' };
}};
