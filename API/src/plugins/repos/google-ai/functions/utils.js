function parseJsonResponseText(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function readJsonResponse(res) {
  if (res && typeof res.json === "function") return res.json();
  const text = res && typeof res.text === "function" ? await res.text() : "";
  return parseJsonResponseText(text) || {};
}

module.exports = { utils: { readJsonResponse } };
