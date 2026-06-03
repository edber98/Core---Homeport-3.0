const { utils } = require("./utils");

module.exports = {
  async gitlab_file_update(node, msg, inputs, opts) {
    const res = await utils.gitlabApi('PUT', '/projects/{projectId}/repository/files/{filePath}', inputs, opts?.credentials, {
      pathParams: ["projectId", "filePath"],
      bodyParams: ["branch", "commit_message", "content", "author_email", "author_name", "encoding", "execute_filemode", "last_commit_id", "start_branch"]
    });
    if (!res.ok) return res;
    return { ok: true, status: res.status, data: res.data };
  }
};
