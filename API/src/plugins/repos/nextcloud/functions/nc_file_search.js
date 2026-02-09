const { utils } = require("./utils");

module.exports = {
  async nc_file_search(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.query) return { ok: false, error: "Recherche requise." };
    const body = `<?xml version="1.0" encoding="UTF-8"?>
<d:searchrequest xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns">
  <d:basicsearch>
    <d:select><d:prop>
      <d:displayname/><d:getcontenttype/><d:getcontentlength/><d:getlastmodified/><d:getetag/>
    </d:prop></d:select>
    <d:from><d:scope><d:href>/files/${encodeURIComponent((opts.credentials || {}).username || "")}</d:href><d:depth>infinity</d:depth></d:scope></d:from>
    <d:where><d:like><d:prop><d:displayname/></d:prop><d:literal>%${d.query}%</d:literal></d:like></d:where>
  </d:basicsearch>
</d:searchrequest>`;
    const res = await utils.nextcloudRequest(opts, "/remote.php/dav/", {
      method: "SEARCH",
      body,
      rawBody: true,
      headers: { "Content-Type": "application/xml" }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const files = utils.parseWebdavMultistatus(res.data);
    return { ok: true, files };
  }
};
