const { utils } = require("./utils");

module.exports = {
  async gitlab_issue_note_delete(node, msg, inputs, opts) {
    const res = await utils.gitlabApi('DELETE', '/projects/{projectId}/issues/{issueIid}/notes/{noteId}', inputs, opts?.credentials, {
      pathParams: ["projectId", "issueIid", "noteId"]
    });
    if (!res.ok) return res;
    return { ok: true, status: 204, data: { message: "Commentaire supprimé." } };
  }
};
