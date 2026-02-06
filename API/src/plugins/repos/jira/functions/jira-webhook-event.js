module.exports = {
  async jira_webhook_event(node, msg, inputs, opts) {
    const body = (msg && msg.body) || {};
    return {
      ok: true,
      webhookEvent: body.webhookEvent || body.event || "",
      issueKey: body.issue ? body.issue.key || "" : "",
      userAccountId: body.user ? body.user.accountId || "" : "",
      timestamp: body.timestamp ? String(body.timestamp) : new Date().toISOString(),
      payload: JSON.stringify(body)
    };
  }
};
