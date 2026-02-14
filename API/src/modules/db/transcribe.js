// Audio transcription endpoint — Whisper API
const express = require('express');
const multer = require('multer');
const { authMiddleware, requireCompanyScope } = require('../../auth/jwt');
const env = require('../../config/env');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

module.exports = function () {
  const r = express.Router();
  r.use(authMiddleware());
  r.use(requireCompanyScope());

  r.post('/ai/transcribe', upload.single('audio'), async (req, res) => {
    if (!req.file) {
      return res.apiError(400, 'no_audio', 'No audio file provided');
    }

    const apiKey = env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.apiError(500, 'no_api_key', 'OpenAI API key not configured');
    }

    try {
      // Build multipart form data for OpenAI Whisper API (native FormData + Blob)
      const form = new FormData();
      const blob = new Blob([req.file.buffer], { type: req.file.mimetype || 'audio/webm' });
      form.append('file', blob, req.file.originalname || 'audio.webm');
      form.append('model', 'whisper-1');
      form.append('language', 'fr');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        body: form,
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        console.error('[transcribe] OpenAI error:', response.status, errText);
        return res.apiError(502, 'transcription_error', `Transcription failed: ${response.status}`);
      }

      const result = await response.json();
      res.apiOk({ text: result.text || '' });
    } catch (e) {
      console.error('[transcribe] error:', e?.message || e);
      res.apiError(500, 'transcription_error', e?.message || 'Transcription failed');
    }
  });

  return r;
};
