// GitLab API handler functions
// Each exported function name MUST match the nodeTemplate key

const { gitlabApi } = require('./utils');

module.exports = {
  async gitlab_project_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    return gitlabApi('GET', '/projects/{projectId}', inputs, opts?.credentials, {
      pathParams: ["projectId"]
    });
  },

  async gitlab_projects_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const res = await gitlabApi('GET', '/projects', inputs, opts?.credentials, {
      queryParams: ["search", "owned", "membership", "per_page"]
    });
    if (!res.ok) return res;
    const projects = (res.data || []).map(r => ({
      id: r.id, name: r.name, path_with_namespace: r.path_with_namespace,
      description: r.description, visibility: r.visibility, default_branch: r.default_branch,
      web_url: r.web_url, created_at: r.created_at, last_activity_at: r.last_activity_at,
      star_count: r.star_count, forks_count: r.forks_count
    }));
    return { ok: true, projects, totalCount: res.pagination?.total || projects.length };
  },

  async gitlab_project_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    return gitlabApi('POST', '/projects', inputs, opts?.credentials, {
      bodyParams: ["name", "description", "visibility", "initialize_with_readme"]
    });
  },

  async gitlab_project_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    return gitlabApi('PUT', '/projects/{projectId}', inputs, opts?.credentials, {
      pathParams: ["projectId"],
      bodyParams: ["name", "description", "visibility"]
    });
  },

  async gitlab_project_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    return gitlabApi('DELETE', '/projects/{projectId}', inputs, opts?.credentials, {
      pathParams: ["projectId"]
    });
  },

  async gitlab_issue_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    return gitlabApi('POST', '/projects/{projectId}/issues', inputs, opts?.credentials, {
      pathParams: ["projectId"],
      bodyParams: ["title", "description", "labels", "assignee_ids", "milestone_id", "confidential"]
    });
  },

  async gitlab_issue_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    return gitlabApi('GET', '/projects/{projectId}/issues/{issueIid}', inputs, opts?.credentials, {
      pathParams: ["projectId", "issueIid"]
    });
  },

  async gitlab_issue_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    return gitlabApi('PUT', '/projects/{projectId}/issues/{issueIid}', inputs, opts?.credentials, {
      pathParams: ["projectId", "issueIid"],
      bodyParams: ["title", "description", "state_event", "labels", "assignee_ids"]
    });
  },

  async gitlab_issues_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const res = await gitlabApi('GET', '/projects/{projectId}/issues', inputs, opts?.credentials, {
      pathParams: ["projectId"],
      queryParams: ["state", "labels", "search", "per_page"]
    });
    if (!res.ok) return res;
    const issues = (res.data || []).map(r => ({
      id: r.id, iid: r.iid, title: r.title, description: r.description,
      state: r.state, labels: r.labels, web_url: r.web_url,
      created_at: r.created_at, updated_at: r.updated_at, closed_at: r.closed_at,
      author: r.author?.name, assignee: r.assignee?.name
    }));
    return { ok: true, issues, totalCount: res.pagination?.total || issues.length };
  },

  async gitlab_issue_note_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    return gitlabApi('POST', '/projects/{projectId}/issues/{issueIid}/notes', inputs, opts?.credentials, {
      pathParams: ["projectId", "issueIid"],
      bodyParams: ["body"]
    });
  },

  async gitlab_mr_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    return gitlabApi('POST', '/projects/{projectId}/merge_requests', inputs, opts?.credentials, {
      pathParams: ["projectId"],
      bodyParams: ["title", "source_branch", "target_branch", "description", "assignee_id", "labels"]
    });
  },

  async gitlab_mr_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    return gitlabApi('GET', '/projects/{projectId}/merge_requests/{mrIid}', inputs, opts?.credentials, {
      pathParams: ["projectId", "mrIid"]
    });
  },

  async gitlab_mr_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    return gitlabApi('PUT', '/projects/{projectId}/merge_requests/{mrIid}', inputs, opts?.credentials, {
      pathParams: ["projectId", "mrIid"],
      bodyParams: ["title", "description", "state_event", "labels"]
    });
  },

  async gitlab_mrs_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const res = await gitlabApi('GET', '/projects/{projectId}/merge_requests', inputs, opts?.credentials, {
      pathParams: ["projectId"],
      queryParams: ["state", "labels", "search", "per_page"]
    });
    if (!res.ok) return res;
    const merge_requests = (res.data || []).map(r => ({
      id: r.id, iid: r.iid, title: r.title, description: r.description,
      state: r.state, source_branch: r.source_branch, target_branch: r.target_branch,
      labels: r.labels, web_url: r.web_url,
      created_at: r.created_at, updated_at: r.updated_at, merged_at: r.merged_at,
      author: r.author?.name
    }));
    return { ok: true, merge_requests, totalCount: res.pagination?.total || merge_requests.length };
  },

  async gitlab_mr_merge(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    return gitlabApi('PUT', '/projects/{projectId}/merge_requests/{mrIid}/merge', inputs, opts?.credentials, {
      pathParams: ["projectId", "mrIid"],
      bodyParams: ["merge_commit_message", "squash", "should_remove_source_branch"]
    });
  },

  async gitlab_pipelines_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const res = await gitlabApi('GET', '/projects/{projectId}/pipelines', inputs, opts?.credentials, {
      pathParams: ["projectId"],
      queryParams: ["ref", "status", "per_page"]
    });
    if (!res.ok) return res;
    const pipelines = (res.data || []).map(r => ({
      id: r.id, iid: r.iid, status: r.status, ref: r.ref, sha: r.sha,
      source: r.source, created_at: r.created_at, updated_at: r.updated_at, web_url: r.web_url
    }));
    return { ok: true, pipelines, totalCount: res.pagination?.total || pipelines.length };
  },

  async gitlab_pipeline_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    return gitlabApi('GET', '/projects/{projectId}/pipelines/{pipelineId}', inputs, opts?.credentials, {
      pathParams: ["projectId", "pipelineId"]
    });
  },

  async gitlab_pipeline_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    return gitlabApi('POST', '/projects/{projectId}/pipeline', inputs, opts?.credentials, {
      pathParams: ["projectId"],
      bodyParams: ["ref"]
    });
  },

  async gitlab_pipeline_retry(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    return gitlabApi('POST', '/projects/{projectId}/pipelines/{pipelineId}/retry', inputs, opts?.credentials, {
      pathParams: ["projectId", "pipelineId"]
    });
  },

  async gitlab_branches_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const res = await gitlabApi('GET', '/projects/{projectId}/repository/branches', inputs, opts?.credentials, {
      pathParams: ["projectId"],
      queryParams: ["search", "per_page"]
    });
    if (!res.ok) return res;
    const branches = (res.data || []).map(r => ({
      name: r.name, merged: r.merged, protected: r.protected, default: r.default,
      web_url: r.web_url,
      commit_id: r.commit?.short_id, commit_title: r.commit?.title,
      commit_author: r.commit?.author_name, commit_date: r.commit?.created_at
    }));
    return { ok: true, branches, totalCount: res.pagination?.total || branches.length };
  },

  async gitlab_branch_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    return gitlabApi('POST', '/projects/{projectId}/repository/branches', inputs, opts?.credentials, {
      pathParams: ["projectId"],
      bodyParams: ["branch", "ref"]
    });
  },

  async gitlab_branch_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    return gitlabApi('DELETE', '/projects/{projectId}/repository/branches/{branch}', inputs, opts?.credentials, {
      pathParams: ["projectId", "branch"]
    });
  },

  async gitlab_commits_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const res = await gitlabApi('GET', '/projects/{projectId}/repository/commits', inputs, opts?.credentials, {
      pathParams: ["projectId"],
      queryParams: ["ref_name", "since", "until", "per_page"]
    });
    if (!res.ok) return res;
    const commits = (res.data || []).map(r => ({
      id: r.id, short_id: r.short_id, title: r.title, message: r.message,
      author_name: r.author_name, author_email: r.author_email,
      authored_date: r.authored_date, committed_date: r.committed_date, web_url: r.web_url
    }));
    return { ok: true, commits, totalCount: res.pagination?.total || commits.length };
  },

  async gitlab_commit_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    return gitlabApi('GET', '/projects/{projectId}/repository/commits/{sha}', inputs, opts?.credentials, {
      pathParams: ["projectId", "sha"]
    });
  },

  async gitlab_releases_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const res = await gitlabApi('GET', '/projects/{projectId}/releases', inputs, opts?.credentials, {
      pathParams: ["projectId"],
      queryParams: ["per_page"]
    });
    if (!res.ok) return res;
    const releases = (res.data || []).map(r => ({
      tag_name: r.tag_name, name: r.name, description: r.description,
      created_at: r.created_at, released_at: r.released_at
    }));
    return { ok: true, releases, totalCount: res.pagination?.total || releases.length };
  },

  async gitlab_release_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    return gitlabApi('POST', '/projects/{projectId}/releases', inputs, opts?.credentials, {
      pathParams: ["projectId"],
      bodyParams: ["tag_name", "name", "description"]
    });
  },

  async gitlab_user_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const userId = inputs.userId;
    if (userId) {
      return gitlabApi('GET', '/users/' + encodeURIComponent(userId), inputs, opts?.credentials);
    }
    return gitlabApi('GET', '/user', inputs, opts?.credentials);
  },

  async gitlab_users_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const res = await gitlabApi('GET', '/users', inputs, opts?.credentials, {
      queryParams: ["search", "per_page"]
    });
    if (!res.ok) return res;
    const users = (res.data || []).map(r => ({
      id: r.id, username: r.username, name: r.name, state: r.state,
      avatar_url: r.avatar_url, web_url: r.web_url
    }));
    return { ok: true, users, totalCount: res.pagination?.total || users.length };
  },

  async gitlab_groups_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const res = await gitlabApi('GET', '/groups', inputs, opts?.credentials, {
      queryParams: ["search", "per_page"]
    });
    if (!res.ok) return res;
    const groups = (res.data || []).map(r => ({
      id: r.id, name: r.name, path: r.path, description: r.description,
      visibility: r.visibility, web_url: r.web_url, created_at: r.created_at
    }));
    return { ok: true, groups, totalCount: res.pagination?.total || groups.length };
  },

  async gitlab_group_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    return gitlabApi('GET', '/groups/{groupId}', inputs, opts?.credentials, {
      pathParams: ["groupId"]
    });
  },

};
