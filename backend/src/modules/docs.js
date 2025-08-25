const express = require('express');
const path = require('path');
const fs = require('fs');
let yaml = null; try { yaml = require('js-yaml'); } catch {}
let swaggerUi = null; try { swaggerUi = require('swagger-ui-express'); } catch {}

function loadSpec(){
  const candidates = [
    path.resolve(__dirname, '../../../docs/api/swagger-backend.yaml'),
    path.resolve(__dirname, '../../../docs/api/swagger.yaml'),
  ];
  for (const p of candidates){
    try {
      const raw = fs.readFileSync(p, 'utf8');
      const spec = yaml ? yaml.load(raw) : null;
      return { spec, file: p, raw };
    } catch {}
  }
  return { spec: { openapi: '3.0.0', info: { title: 'Homeport API', version: '0.0.0' } }, file: null, raw: '' };
}

module.exports = function docsModule(){
  const r = express.Router();
  const { spec, file } = loadSpec();

  // JSON spec
  r.get('/api-docs.json', (_req, res) => res.json(spec || { openapi: '3.0.0', info: { title: 'Homeport API', version: '0.0.0' } }));
  // YAML spec (if available)
  r.get('/api-docs.yaml', (_req, res) => {
    const { raw } = loadSpec();
    res.setHeader('Content-Type', 'text/yaml');
    if (raw && raw.trim()) return res.send(raw);
    const fallback = `openapi: 3.0.0\ninfo:\n  title: Homeport API\n  version: 0.0.0\n`;
    res.send(fallback);
  });

  // Swagger UI
  if (swaggerUi){
    const uiOptions = { explorer: true, swaggerOptions: { docExpansion: 'list', defaultModelsExpandDepth: 1 } };
    // If we could not parse YAML (js-yaml missing), let UI fetch the YAML URL directly.
    if (!spec) uiOptions.swaggerOptions.url = '/api-docs.yaml';
    r.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec || undefined, uiOptions));
  } else {
    // Fallback Swagger UI via CDN, pointing to the YAML spec served by this app
    r.get('/api-docs', (_req, res) => {
      const html = `<!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>API Docs</title>
        <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
        <style>body{margin:0}</style>
      </head>
      <body>
        <div id="swagger-ui"></div>
        <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
        <script>
          window.ui = SwaggerUIBundle({ url: '/api-docs.yaml', dom_id: '#swagger-ui', deepLinking: true, presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset] });
        </script>
      </body>
      </html>`;
      res.type('html').send(html);
    });
  }

  return r;
}
