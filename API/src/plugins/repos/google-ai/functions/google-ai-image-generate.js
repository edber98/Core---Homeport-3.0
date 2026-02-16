module.exports = {
  async google_ai_image_generate(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const creds = (opts && opts.credentials) || {};
    const apiKey = creds.apiKey;
    if (!apiKey) throw new Error('Missing Google AI apiKey in credentials');
    const model = String(inputs.model || 'imagen-3.0-generate-001');
    const prompt = String(inputs.prompt || '').trim();
    if (!prompt) return { ok: false, error: 'Missing prompt' };
    const aspectRatio = String(inputs.size || '1:1');

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${apiKey}`;
    log('Génération de l\'image...');
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: { sampleCount: 1, aspectRatio }
      })
    });

    if (!res.ok) {
      const err = await res.text();
      return { ok: false, error: `Google AI Imagen error: ${res.status}`, details: err };
    }

    const data = await res.json();
    const predictions = data.predictions || [];
    if (!predictions.length || !predictions[0].bytesBase64Encoded) {
      return { ok: false, error: 'Aucune image générée' };
    }

    const b64 = predictions[0].bytesBase64Encoded;
    const mimeType = predictions[0].mimeType || 'image/png';

    // Stocker via opts.files si disponible
    if (opts && opts.files && typeof opts.files.storeBase64 === 'function') {
      const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png';
      const fileRef = await opts.files.storeBase64(b64, {
        name: `imagen-${Date.now()}.${ext}`,
        mimeType,
        lifecycle: 'execution'
      });
      return { ok: true, url: fileRef.url || '', b64, file: fileRef };
    }

    return { ok: true, url: `data:${mimeType};base64,${b64}`, b64, file: null };
  },
};
