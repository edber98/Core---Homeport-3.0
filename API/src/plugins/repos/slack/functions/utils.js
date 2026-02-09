async function slackRequest(opts, method, body = {}) {
  const credentials = (opts && opts.credentials) || {};
  const botToken = credentials.botToken;
  if (!botToken) return { ok: false, error: "Missing Slack bot token." };

  const res = await fetch(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${botToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const data = await res.json();
  if (!data.ok) return { ok: false, error: data.error || "Slack API error", details: data };
  return { ok: true, data };
}

async function slackUpload(opts, { channels, content, filename, title }) {
  const credentials = (opts && opts.credentials) || {};
  const botToken = credentials.botToken;
  if (!botToken) return { ok: false, error: "Missing Slack bot token." };

  // Step 1: get upload URL
  const lenBuf = Buffer.from(content || "", "utf-8");
  const getUrl = await fetch("https://slack.com/api/files.getUploadURLExternal", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${botToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      filename: filename || "file.txt",
      length: lenBuf.length
    })
  });
  const urlData = await getUrl.json();
  if (!urlData.ok) return { ok: false, error: urlData.error || "Failed to get upload URL", details: urlData };

  // Step 2: upload content
  await fetch(urlData.upload_url, {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body: lenBuf
  });

  // Step 3: complete upload
  const files = [{ id: urlData.file_id, title: title || filename || "file.txt" }];
  const completeBody = { files };
  if (channels) {
    const ch = channels.split(",").map(c => c.trim()).filter(Boolean).join(",");
    if (ch) completeBody.channel_id = ch.split(",")[0];
  }
  const complete = await fetch("https://slack.com/api/files.completeUploadExternal", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${botToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(completeBody)
  });
  const completeData = await complete.json();
  if (!completeData.ok) return { ok: false, error: completeData.error || "Failed to complete upload", details: completeData };

  const f = (completeData.files && completeData.files[0]) || {};
  return { ok: true, data: { file: f } };
}

module.exports = { utils: { slackRequest, slackUpload } };
