const { utils } = require("./utils");

module.exports = {
  async gitlab_mr_note_delete(node, msg, inputs, opts) {
    const res = await utils.gitlabApi('DELETE', '/projects/{projectId}/merge_requests/{mrIid}/notes/{noteId}', inputs, opts?.credentials, {
      pathParams: ["projectId", "mrIid", "noteId"]
    });
    if (!res.ok) return res;
    return { ok: true, status: 204, data: { message: "Commentaire supprimé." } };
  }
};
