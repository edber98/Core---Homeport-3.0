API Docs (Swagger UI)

Endpoints
- Swagger UI: http://localhost:5055/api-docs
- Swagger JSON: http://localhost:5055/api-docs.json
- Swagger YAML: http://localhost:5055/api-docs.yaml

Source Spec
- Primary: docs/api/swagger-backend.yaml
- Fallback: docs/api/swagger.yaml (if backend spec not found)

Notes
- UI allows trying endpoints directly (Authorize with Bearer token from /auth/login).
- Keep this spec in sync as new endpoints or fields are added.
