const { utils } = require("./utils");

const BODY_FIELDS = [
  {
    "key": "custom_environment_slug_or_id",
    "type": "text",
    "bodyPath": [
      "customEnvironmentSlugOrId"
    ]
  },
  {
    "key": "deployment_id",
    "type": "text",
    "bodyPath": [
      "deploymentId"
    ]
  },
  {
    "key": "files",
    "type": "json",
    "bodyPath": [
      "files"
    ]
  },
  {
    "key": "git_metadata_remote_url",
    "type": "text",
    "bodyPath": [
      "gitMetadata",
      "remoteUrl"
    ]
  },
  {
    "key": "git_metadata_commit_author_name",
    "type": "text",
    "bodyPath": [
      "gitMetadata",
      "commitAuthorName"
    ]
  },
  {
    "key": "git_metadata_commit_author_email",
    "type": "text",
    "bodyPath": [
      "gitMetadata",
      "commitAuthorEmail"
    ]
  },
  {
    "key": "git_metadata_commit_message",
    "type": "text",
    "bodyPath": [
      "gitMetadata",
      "commitMessage"
    ]
  },
  {
    "key": "git_metadata_commit_ref",
    "type": "text",
    "bodyPath": [
      "gitMetadata",
      "commitRef"
    ]
  },
  {
    "key": "git_metadata_commit_sha",
    "type": "text",
    "bodyPath": [
      "gitMetadata",
      "commitSha"
    ]
  },
  {
    "key": "git_metadata_dirty",
    "type": "checkbox",
    "bodyPath": [
      "gitMetadata",
      "dirty"
    ]
  },
  {
    "key": "git_metadata_ci",
    "type": "checkbox",
    "bodyPath": [
      "gitMetadata",
      "ci"
    ]
  },
  {
    "key": "git_metadata_ci_type",
    "type": "text",
    "bodyPath": [
      "gitMetadata",
      "ciType"
    ]
  },
  {
    "key": "git_metadata_ci_git_provider_username",
    "type": "text",
    "bodyPath": [
      "gitMetadata",
      "ciGitProviderUsername"
    ]
  },
  {
    "key": "git_metadata_ci_git_repo_visibility",
    "type": "text",
    "bodyPath": [
      "gitMetadata",
      "ciGitRepoVisibility"
    ]
  },
  {
    "key": "git_source",
    "type": "json",
    "bodyPath": [
      "gitSource"
    ]
  },
  {
    "key": "meta",
    "type": "json",
    "bodyPath": [
      "meta"
    ]
  },
  {
    "key": "monorepo_manager",
    "type": "text",
    "bodyPath": [
      "monorepoManager"
    ]
  },
  {
    "key": "name",
    "type": "text",
    "bodyPath": [
      "name"
    ]
  },
  {
    "key": "project",
    "type": "text",
    "bodyPath": [
      "project"
    ]
  },
  {
    "key": "project_settings_build_command",
    "type": "text",
    "bodyPath": [
      "projectSettings",
      "buildCommand"
    ]
  },
  {
    "key": "project_settings_command_for_ignoring_build_step",
    "type": "text",
    "bodyPath": [
      "projectSettings",
      "commandForIgnoringBuildStep"
    ]
  },
  {
    "key": "project_settings_dev_command",
    "type": "text",
    "bodyPath": [
      "projectSettings",
      "devCommand"
    ]
  },
  {
    "key": "project_settings_framework",
    "type": "text",
    "bodyPath": [
      "projectSettings",
      "framework"
    ]
  },
  {
    "key": "project_settings_install_command",
    "type": "text",
    "bodyPath": [
      "projectSettings",
      "installCommand"
    ]
  },
  {
    "key": "project_settings_node_version",
    "type": "text",
    "bodyPath": [
      "projectSettings",
      "nodeVersion"
    ]
  },
  {
    "key": "project_settings_output_directory",
    "type": "text",
    "bodyPath": [
      "projectSettings",
      "outputDirectory"
    ]
  },
  {
    "key": "project_settings_root_directory",
    "type": "text",
    "bodyPath": [
      "projectSettings",
      "rootDirectory"
    ]
  },
  {
    "key": "project_settings_serverless_function_region",
    "type": "text",
    "bodyPath": [
      "projectSettings",
      "serverlessFunctionRegion"
    ]
  },
  {
    "key": "project_settings_skip_git_connect_during_link",
    "type": "checkbox",
    "bodyPath": [
      "projectSettings",
      "skipGitConnectDuringLink"
    ]
  },
  {
    "key": "project_settings_source_files_outside_root_directory",
    "type": "checkbox",
    "bodyPath": [
      "projectSettings",
      "sourceFilesOutsideRootDirectory"
    ]
  },
  {
    "key": "target",
    "type": "text",
    "bodyPath": [
      "target"
    ]
  },
  {
    "key": "with_latest_commit",
    "type": "checkbox",
    "bodyPath": [
      "withLatestCommit"
    ]
  }
];


module.exports = {
  async vercel_deployment_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let body;
    try {
      body = utils.buildBodyFromFields(d, BODY_FIELDS);
    } catch (e) {
      return { ok: false, error: e.message };
    }
    log("Appel API en cours...");
    const options = { method: "POST", query, body };
    const res = await utils.vercelRequest(opts, path, options);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    if (false) {
      const rawItems = utils.asArray(utils.getPath(res.data, null));
      const items = rawItems.map(utils.itemFromUnknown);
      return { ok: true, items, totalCount: Number(res.data?.pagination?.total || res.data?.total || res.data?.totalCount || items.length), nextCursor: "" };
    }
    const r = res.data?.data || res.data || {};
    return {
      ok: true,
      id: String(r.id || r.key || r.uuid || r.uid || d.id || d.fileKey || d.boardId || d.projectId || ""),
      status: r.status || r.state || r.type || "",
      name: r.name || r.title || r.subject || "",
      url: r.url || r.html_url || r.web_url || r.shareUrl || "",
      text: typeof r === "string" ? r : (r.text || r.message || r.description || ""),
      result_json: utils.compactJson(res.data)
    };
  }
};
