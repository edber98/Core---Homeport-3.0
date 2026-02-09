// GitLab API handler functions
// Each exported function name MUST match the nodeTemplate key

const { gitlabApi } = require('./utils');

module.exports = {
  async gitlab_project_get(node, msg, inputs, opts) {
    return gitlabApi('GET', '/projects/{projectId}', inputs, opts?.credentials, {
      pathParams: ["projectId"]
    });
  },

  async gitlab_projects_list(node, msg, inputs, opts) {
    return gitlabApi('GET', '/projects', inputs, opts?.credentials, {
      queryParams: ["search", "owned", "membership", "per_page"]
    });
  },

  async gitlab_project_create(node, msg, inputs, opts) {
    return gitlabApi('POST', '/projects', inputs, opts?.credentials, {
      bodyParams: ["name", "description", "visibility", "initialize_with_readme"]
    });
  },

  async gitlab_project_update(node, msg, inputs, opts) {
    return gitlabApi('PUT', '/projects/{projectId}', inputs, opts?.credentials, {
      pathParams: ["projectId"],
      bodyParams: ["name", "description", "visibility"]
    });
  },

  async gitlab_project_delete(node, msg, inputs, opts) {
    return gitlabApi('DELETE', '/projects/{projectId}', inputs, opts?.credentials, {
      pathParams: ["projectId"]
    });
  },

  async gitlab_issue_create(node, msg, inputs, opts) {
    return gitlabApi('POST', '/projects/{projectId}/issues', inputs, opts?.credentials, {
      pathParams: ["projectId"],
      bodyParams: ["title", "description", "labels", "assignee_ids", "milestone_id", "confidential"]
    });
  },

  async gitlab_issue_get(node, msg, inputs, opts) {
    return gitlabApi('GET', '/projects/{projectId}/issues/{issueIid}', inputs, opts?.credentials, {
      pathParams: ["projectId", "issueIid"]
    });
  },

  async gitlab_issue_update(node, msg, inputs, opts) {
    return gitlabApi('PUT', '/projects/{projectId}/issues/{issueIid}', inputs, opts?.credentials, {
      pathParams: ["projectId", "issueIid"],
      bodyParams: ["title", "description", "state_event", "labels", "assignee_ids"]
    });
  },

  async gitlab_issues_list(node, msg, inputs, opts) {
    return gitlabApi('GET', '/projects/{projectId}/issues', inputs, opts?.credentials, {
      pathParams: ["projectId"],
      queryParams: ["state", "labels", "search", "per_page"]
    });
  },

  async gitlab_issue_note_create(node, msg, inputs, opts) {
    return gitlabApi('POST', '/projects/{projectId}/issues/{issueIid}/notes', inputs, opts?.credentials, {
      pathParams: ["projectId", "issueIid"],
      bodyParams: ["body"]
    });
  },

  async gitlab_mr_create(node, msg, inputs, opts) {
    return gitlabApi('POST', '/projects/{projectId}/merge_requests', inputs, opts?.credentials, {
      pathParams: ["projectId"],
      bodyParams: ["title", "source_branch", "target_branch", "description", "assignee_id", "labels"]
    });
  },

  async gitlab_mr_get(node, msg, inputs, opts) {
    return gitlabApi('GET', '/projects/{projectId}/merge_requests/{mrIid}', inputs, opts?.credentials, {
      pathParams: ["projectId", "mrIid"]
    });
  },

  async gitlab_mr_update(node, msg, inputs, opts) {
    return gitlabApi('PUT', '/projects/{projectId}/merge_requests/{mrIid}', inputs, opts?.credentials, {
      pathParams: ["projectId", "mrIid"],
      bodyParams: ["title", "description", "state_event", "labels"]
    });
  },

  async gitlab_mrs_list(node, msg, inputs, opts) {
    return gitlabApi('GET', '/projects/{projectId}/merge_requests', inputs, opts?.credentials, {
      pathParams: ["projectId"],
      queryParams: ["state", "labels", "search", "per_page"]
    });
  },

  async gitlab_mr_merge(node, msg, inputs, opts) {
    return gitlabApi('PUT', '/projects/{projectId}/merge_requests/{mrIid}/merge', inputs, opts?.credentials, {
      pathParams: ["projectId", "mrIid"],
      bodyParams: ["merge_commit_message", "squash", "should_remove_source_branch"]
    });
  },

  async gitlab_pipelines_list(node, msg, inputs, opts) {
    return gitlabApi('GET', '/projects/{projectId}/pipelines', inputs, opts?.credentials, {
      pathParams: ["projectId"],
      queryParams: ["ref", "status", "per_page"]
    });
  },

  async gitlab_pipeline_get(node, msg, inputs, opts) {
    return gitlabApi('GET', '/projects/{projectId}/pipelines/{pipelineId}', inputs, opts?.credentials, {
      pathParams: ["projectId", "pipelineId"]
    });
  },

  async gitlab_pipeline_create(node, msg, inputs, opts) {
    return gitlabApi('POST', '/projects/{projectId}/pipeline', inputs, opts?.credentials, {
      pathParams: ["projectId"],
      bodyParams: ["ref"]
    });
  },

  async gitlab_pipeline_retry(node, msg, inputs, opts) {
    return gitlabApi('POST', '/projects/{projectId}/pipelines/{pipelineId}/retry', inputs, opts?.credentials, {
      pathParams: ["projectId", "pipelineId"]
    });
  },

  async gitlab_branches_list(node, msg, inputs, opts) {
    return gitlabApi('GET', '/projects/{projectId}/repository/branches', inputs, opts?.credentials, {
      pathParams: ["projectId"],
      queryParams: ["search", "per_page"]
    });
  },

  async gitlab_branch_create(node, msg, inputs, opts) {
    return gitlabApi('POST', '/projects/{projectId}/repository/branches', inputs, opts?.credentials, {
      pathParams: ["projectId"],
      bodyParams: ["branch", "ref"]
    });
  },

  async gitlab_branch_delete(node, msg, inputs, opts) {
    return gitlabApi('DELETE', '/projects/{projectId}/repository/branches/{branch}', inputs, opts?.credentials, {
      pathParams: ["projectId", "branch"]
    });
  },

  async gitlab_commits_list(node, msg, inputs, opts) {
    return gitlabApi('GET', '/projects/{projectId}/repository/commits', inputs, opts?.credentials, {
      pathParams: ["projectId"],
      queryParams: ["ref_name", "since", "until", "per_page"]
    });
  },

  async gitlab_commit_get(node, msg, inputs, opts) {
    return gitlabApi('GET', '/projects/{projectId}/repository/commits/{sha}', inputs, opts?.credentials, {
      pathParams: ["projectId", "sha"]
    });
  },

  async gitlab_releases_list(node, msg, inputs, opts) {
    return gitlabApi('GET', '/projects/{projectId}/releases', inputs, opts?.credentials, {
      pathParams: ["projectId"],
      queryParams: ["per_page"]
    });
  },

  async gitlab_release_create(node, msg, inputs, opts) {
    return gitlabApi('POST', '/projects/{projectId}/releases', inputs, opts?.credentials, {
      pathParams: ["projectId"],
      bodyParams: ["tag_name", "name", "description"]
    });
  },

  async gitlab_user_get(node, msg, inputs, opts) {
    const userId = inputs.userId;
    if (userId) {
      return gitlabApi('GET', '/users/' + encodeURIComponent(userId), inputs, opts?.credentials);
    }
    return gitlabApi('GET', '/user', inputs, opts?.credentials);
  },

  async gitlab_users_list(node, msg, inputs, opts) {
    return gitlabApi('GET', '/users', inputs, opts?.credentials, {
      queryParams: ["search", "per_page"]
    });
  },

  async gitlab_groups_list(node, msg, inputs, opts) {
    return gitlabApi('GET', '/groups', inputs, opts?.credentials, {
      queryParams: ["search", "per_page"]
    });
  },

  async gitlab_group_get(node, msg, inputs, opts) {
    return gitlabApi('GET', '/groups/{groupId}', inputs, opts?.credentials, {
      pathParams: ["groupId"]
    });
  },

};
