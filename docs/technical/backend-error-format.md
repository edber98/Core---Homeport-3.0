Backend Error and Response Format

Overview
- All API responses use a unified envelope to simplify frontend handling.
- Success: { success: true, data, requestId, ts }
- Error: { success: false, error: { code, message, details }, requestId, ts }

Fields
- success: boolean indicating request outcome.
- data: any payload for successful responses.
- error.code: short machine-readable string (e.g., not_found, invalid_credentials, bad_request).
- error.message: human-friendly message (localized on the frontend if needed).
- error.details: optional structured info (validation errors, field, id, etc.).
- requestId: correlation identifier (propagates X-Request-Id if provided; otherwise generated).
- ts: server timestamp in ms.

HTTP Status
- Use appropriate HTTP status codes; envelope still applied.
  - 200 OK: success
  - 201 Created: resource created
  - 400 Bad Request: validation or malformed request
  - 401 Unauthorized: missing/invalid token
  - 403 Forbidden: auth OK but not allowed (workspace membership)
  - 404 Not Found: resource not found or not in company scope
  - 409 Conflict: unique constraint, state conflict
  - 500 Internal Server Error: unexpected failure

Frontend Handling Pattern
- For every response, check success.
- If false: display error.message (or map error.code to i18n labels), optionally inspect error.details to highlight fields.
- Prefer optimistic UI updates after 201, fallback to re-fetch on 200.
- Attach X-Request-Id header when invoking API to trace a workflow across services.

Examples
- Invalid login:
  - 401 { success:false, error:{ code:'invalid_credentials', message:'Invalid email or password' }, requestId, ts }
- Missing flow name:
  - 400 { success:false, error:{ code:'name_required', message:'Flow name is required' }, requestId, ts }
- Not member of workspace:
  - 403 { success:false, error:{ code:'not_a_member', message:'User not a workspace member' }, requestId, ts }

Implementation Notes
- Middleware apiResponse injects res.apiOk(data) and res.apiError(status, code, message, details).
- errorHandler catches thrown errors and formats them to the envelope. Use AppError for precise status/code.
- Route best practice:
  - return res.apiOk(data) on success
  - return res.apiError(404, 'flow_not_found', 'Flow not found') on scoped 404s
  - next(new AppError(400, 'bad_request', '...')) for deeper service errors

Compatibility
- Existing endpoints returning plain data will be migrated progressively to the envelope (most critical errors already aligned). Frontend should accept bare 200 payloads during transition but rely on the envelope for errors.

