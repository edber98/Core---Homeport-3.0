const { utils } = require("./utils");

module.exports = {
  async plaid_link_token_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const userId = d.userId || d.clientUserId || "kinn-user";
    const body = {
      client_name: d.clientName || "Kinn",
      user: { client_user_id: userId },
      products: utils.list(d.products, ["transactions"]),
      country_codes: utils.list(d.countryCodes, ["US"]),
      language: d.language || "en"
    };
    if (d.redirectUri) body.redirect_uri = d.redirectUri;
    if (d.webhook) body.webhook = d.webhook;
    if (d.accessToken) body.access_token = d.accessToken;
    const res = await utils.plaidRequest(opts, "/link/token/create", body);
    if (!res.ok) return res;
    const data = res.data || {};
    return { ok: true, linkToken: data.link_token || "", expiration: data.expiration || "", requestId: data.request_id || "" };
  }
};
