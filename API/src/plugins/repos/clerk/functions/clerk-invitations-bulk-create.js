const { utils } = require("./utils");

module.exports = {
  async clerk_invitations_bulk_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const emails = utils.parseList(d.emailAddresses);
    if (!emails.length) return { ok: false, error: "Au moins un email est requis." };

    const invitations = emails.map((email) => ({
      email_address: email,
      redirect_url: d.redirectUrl || undefined
    }));

    const res = await utils.clerkRequest(opts, "/invitations/bulk", { method: "POST", body: { invitations } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const items = utils.listData(res.data).map(utils.compactInvitation);
    return { ok: true, invitations: items, totalCount: items.length };
  }
};
