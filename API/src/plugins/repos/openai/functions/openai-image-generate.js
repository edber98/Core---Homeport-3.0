const { utils } = require("./utils");

module.exports = {
  async openai_image_generate(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const model = String(d.model || "gpt-image-1");
    const prompt = String(d.prompt || "").trim();
    if (!prompt) return { ok: false, error: "Le prompt est requis." };

    const body = { model, prompt, size: String(d.size || "1024x1024"), n: 1 };
    const quality = String(d.quality || "auto");
    if (model.startsWith("gpt-image")) {
      body.output_format = "png";
      body.quality = quality;
    } else {
      body.response_format = "b64_json";
      body.quality = quality === "auto" ? "standard" : quality;
    }

    log("Génération de l'image...");
    const res = await utils.openaiRequest(opts, "/images/generations", body);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const first = (res.data?.data || [])[0] || {};
    let file = null;
    if (opts && opts.files && first.b64_json) {
      file = await opts.files.store(first.b64_json, {
        name: "generated_image.png",
        mimeType: "image/png",
        lifecycle: "execution"
      });
    }
    return { ok: true, file, url: first.url || "", revised_prompt: first.revised_prompt || "" };
  }
};
