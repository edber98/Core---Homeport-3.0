# Output JSON contract

The extractor returns one JSON object:

- `api`: resolved API metadata: `name`, `source`, `title`, `version`, `openapi`.
- `endpoint_count`: number of extracted operations.
- `endpoints[]`: one object per OpenAPI operation.
  - `method`: uppercase HTTP method.
  - `path`: OpenAPI path template.
  - `operation_id`, `summary`, `description`, `tags`: operation metadata when present.
  - `parameters`: grouped parameters with keys `path`, `query`, `header`, `cookie`, `other`.
  - `request_body`: mandatory for `POST` and `PUT`, and also present for `PATCH` when the spec defines a body. Contains `required`, `content_types`, and `attributes`.
- `request_body.attributes[]`: flattened payload fields.
  - `name`: dotted path, e.g. `customer.email` or `items[].sku`.
  - `type`: OpenAPI schema type, including `array[type]`, `object`, `oneOf`, `anyOf`, or `allOf`.
  - `required`: whether the attribute is required at its schema level.
  - optional `format`, `description`, `enum`, `content_type` when available.

The output intentionally keeps path/query/header parameters separate from body attributes so an AI agent can decide how to populate URL, headers, and request body independently.
