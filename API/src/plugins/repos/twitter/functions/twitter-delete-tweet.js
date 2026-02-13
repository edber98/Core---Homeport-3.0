const { utils } = require("./utils");

module.exports = {
  async twitter_delete_tweet(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const tweetId = (d.tweetId || "").trim();
    if (!tweetId) return { ok: false, error: "Missing tweetId." };

    log('Suppression en cours...');
    const res = await utils.twitterRequest(opts, `/tweets/${encodeURIComponent(tweetId)}`, {
      method: "DELETE"
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, deleted: res.data?.data?.deleted || true, tweetId };
  }
};
