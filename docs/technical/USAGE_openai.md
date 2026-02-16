OpenAI Plugins — Usage Guide

Provider & Credentials
- Provider key: `openai`
- Create credentials in the UI for the workspace:
  - `apiKey` (required, secret)
  - `baseUrl` (optional, for Azure/OpenAI-compatible endpoints)
  - `organization` (optional)
  - `defaultModel` (fallback model, e.g., `gpt-4o-mini`)
- Assign the credential to your OpenAI node in the flow.

Nodes
- `openai_chat_completion`
  - Args: `model`, `system`, `prompt`, `temperature`, `maxTokens`
  - Output: `{ ok, text, raw: { id, model, usage } }`
- `openai_embeddings`
  - Args: `model`, `input` (string or JSON array string)
  - Output: `{ ok, vectorsCount, dimensions, vectors }`
- `openai_image_generate`
  - Args: `model`, `prompt`, `size`
  - Output: `{ ok, images: [ { url, b64 } ] }`

Import & Reload
- Built-in repos are scanned at boot and on POST `/api/plugins/reload`.
- The OpenAI repo resides in `API/src/plugins/repos/openai` and is auto-imported.

Testing a Node
- Use POST `/api/flows/:flowId/test-node` with body `{ nodeId, msg }` to execute a single node server-side.
- Ensure the node references a credential (`credentialId`) for `openai` in the target workspace.

Security Notes
- Credentials are decrypted server-side and passed only as `opts.credentials` to handlers.
- No credential values are logged or returned in results.
