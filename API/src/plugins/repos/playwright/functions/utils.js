function compactJson(v) { try { return JSON.stringify(v); } catch { return String(v); } }
function parseJson(v, label, fallback) { if (v === undefined || v === null || v === "") return fallback; if (typeof v === "object") return v; try { return JSON.parse(String(v)); } catch { throw new Error("JSON invalide dans " + label + "."); } }
async function withPage(d, fn) {
  let playwright;
  try { playwright = require("playwright"); } catch { return { ok: false, error: "Le package 'playwright' n'est pas installé." }; }
  const browserType = playwright[d.browser || "chromium"] || playwright.chromium;
  const browser = await browserType.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const res = await page.goto(d.url, { waitUntil: "domcontentloaded", timeout: Number(d.timeout || 30000) });
    const out = await fn(page, res);
    await browser.close();
    return out;
  } catch (e) { try { await browser.close(); } catch {} return { ok: false, error: e.message }; }
}
function response(data) { return { ok: true, status: "ok", data, text: typeof data === "string" ? data : "", result_json: compactJson(data) }; }
function items(arr) { return { ok: true, items: (arr || []).map((v, i) => ({ id: String(i), name: v.text || v.href || String(i), status: "", url: v.href || "", text: v.text || "", result_json: compactJson(v) })), totalCount: (arr || []).length, nextCursor: "", data: arr, result_json: compactJson(arr) }; }
async function run(key, inputs) {
  const d = inputs || {};
  return await withPage(d, async (page, navRes) => {
    if (key === "playwright_page_screenshot") { const target = d.selector ? await page.locator(d.selector).first() : page; const buffer = await target.screenshot({ fullPage: !d.selector && String(d.fullPage) !== "false", type: "png" }); return response({ mimeType: "image/png", base64: buffer.toString("base64") }); }
    if (key === "playwright_page_pdf") { const buffer = await page.pdf({ format: d.format || "A4" }); return response({ mimeType: "application/pdf", base64: buffer.toString("base64") }); }
    if (key === "playwright_page_text_extract") return response(await page.locator("body").innerText({ timeout: Number(d.timeout || 30000) }));
    if (key === "playwright_page_html_extract") return response(await page.content());
    if (key === "playwright_links_extract") return items(await page.$$eval("a[href]", (links) => links.map((a) => ({ text: a.textContent.trim(), href: a.href }))));
    if (key === "playwright_page_evaluate") { const fn = eval(d.script); return response(await page.evaluate(fn)); }
    if (key === "playwright_form_submit") { const fields = parseJson(d.fields, "fields", {}); for (const [selector, value] of Object.entries(fields)) await page.fill(selector, String(value)); if (d.submitSelector) await Promise.all([page.waitForLoadState("domcontentloaded").catch(() => {}), page.click(d.submitSelector)]); return response({ url: page.url(), text: await page.locator("body").innerText().catch(() => "") }); }
    if (key === "playwright_click_and_extract") { await page.click(d.selector); await page.waitForLoadState("domcontentloaded").catch(() => {}); const loc = d.extractSelector ? page.locator(d.extractSelector).first() : page.locator("body"); return response({ url: page.url(), text: await loc.innerText().catch(() => "") }); }
    if (key === "playwright_status_check") return response({ status: navRes ? navRes.status() : 0, ok: navRes ? navRes.ok() : false, url: page.url(), title: await page.title() });
    if (key === "playwright_script_run") {
      const steps = parseJson(d.steps, "steps", []);
      const results = [];
      for (const step of steps) {
        if (step.action === "click") await page.click(step.selector);
        else if (step.action === "fill") await page.fill(step.selector, String(step.value || ""));
        else if (step.action === "wait") await page.waitForTimeout(Number(step.ms || 1000));
        else if (step.action === "goto") await page.goto(step.url, { waitUntil: "domcontentloaded" });
        else if (step.action === "extract") results.push({ selector: step.selector, text: await page.locator(step.selector || "body").first().innerText().catch(() => "") });
      }
      return response({ url: page.url(), results });
    }
    return { ok: false, error: "Action inconnue." };
  });
}
module.exports = { utils: { run, parseJson } };
