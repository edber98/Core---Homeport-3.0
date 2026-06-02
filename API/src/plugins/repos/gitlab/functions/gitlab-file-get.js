const { utils } = require("./utils");

module.exports = {
  async gitlab_file_get(node, msg, inputs, opts) {
    const res = await utils.gitlabApi('GET', '/projects/{projectId}/repository/files/{filePath}', inputs, opts?.credentials, {
      pathParams: ["projectId", "filePath"],
      queryParams: ["ref"]
    });
    if (!res.ok) return res;
    const d = res.data || {};
    return {
      ok: true,
      status: res.status,
      data: {
        blob_id: d.blob_id,
        commit_id: d.commit_id,
        content: d.content,
        content_sha256: d.content_sha256,
        encoding: d.encoding,
        execute_filemode: d.execute_filemode,
        file_name: d.file_name,
        file_path: d.file_path,
        last_commit_id: d.last_commit_id,
        ref: d.ref,
        size: d.size
      }
    };
  }
};
