module.exports = {
  // Multiple handlers in a single file
  github_issue_create: async (_node, _msg, inputs, opts) => {
    // Demo-only: echo back; real call omitted
    return { created: true, issue: { owner: inputs.owner, repo: inputs.repo, title: inputs.title } };
  },
  github_comment: async (_node, _msg, inputs, opts) => {
    return { commented: true, target: { owner: inputs.owner, repo: inputs.repo, issue: inputs.issue } };
  },
  text_lower: async (_node, _msg, inputs, opts) => {
    return { text: String(inputs.text || '').toLowerCase() };
  }
};
