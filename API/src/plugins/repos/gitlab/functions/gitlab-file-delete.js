const { utils } = require("./utils");

module.exports = {
  async gitlab_file_delete(node, msg, inputs, opts) {
    const res = await utils.gitlabApi('DELETE', '/projects/{projectId}/repository/files/{filePath}', inputs, opts?.credentials, {
      pathParams: ["projectId", "filePath"],
      bodyParams: ["branch", "commit_message", "author_email", "author_name", "last_commit_id", "start_branch"]
    });
    if (!res.ok) return res;
    return { ok: true, status: res.status, data: { message: "Fichier supprimé." } };
  }
};
