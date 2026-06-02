const { utils } = require("./utils");
module.exports = {
  async appsmith_user_set_release_notes_viewed(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};

const options = {};
    const res = await utils.appsmithRequest(opts, `/api/v1/users/setReleaseNotesViewed`, { method: 'PUT', query, ...options });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, message: 'Opération terminée.', raw: res.data };
  }
};
