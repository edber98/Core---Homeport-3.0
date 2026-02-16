const { utils } = require("./utils");
module.exports = {
  async notion_comment_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const richText = (d.richText || "").trim();
    if (!richText) return { ok: false, error: "Missing richText." };
    const body = { rich_text: [{ text: { content: richText } }] };
    if (d.discussionId) { body.discussion_id = d.discussionId; }
    else if (d.pageId) { body.parent = { page_id: d.pageId }; }
    else { return { ok: false, error: "Missing pageId or discussionId." }; }
    log('Création en cours...');
    const res = await utils.notionRequest(opts, "/comments", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data || {};
    return { ok: true, id: r.id, discussion_id: r.discussion_id, rich_text: r.rich_text?.map(t => t.plain_text).join("") || "", created_time: r.created_time };
  }
};
