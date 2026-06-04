# Providers avec au moins un champ JSON générique

Généré le `2026-06-04` à partir des `manifest.json` sous `API/src/plugins/repos`.

Définition utilisée: même règle que `.agents/skills/kinn-connector-tester/scripts/test-connector.js`.

Un provider est listé si au moins un de ses noeuds non `custom_request` contient un champ générique de type JSON-like avec une clé parmi:

- `body`
- `payload`
- `payloadJson`
- `data`
- `attributes`
- `input`
- `query`
- `headers`
- `options`
- `requestAttributes`
- `requestRootKey`
- `requestResourceId`

Types surveillés: `json`, `json_editor`, `textarea`, `text`.

Total: `107` providers.

| Provider | Dossier | Noeuds concernés | Champs génériques détectés |
|---|---|---:|---|
| AWS | `aws` | 1 | `payload` |
| Baseten | `baseten` | 59 | `body` |
| Beehiiv | `beehiiv` | 14 | `body` |
| BILL | `bill` | 3 | `body` |
| Braze | `braze` | 7 | `body` |
| Brevo | `brevo` | 2 | `attributes` |
| BrightData | `brightdata` | 10 | `body` |
| Browserbase | `browserbase` | 1 | `body` |
| Calendly | `calendly` | 1 | `body` |
| Cassandra | `cassandra` | 2 | `data` |
| Checkout.com | `checkout-com` | 1 | `body` |
| ChromaDB | `chromadb` | 1 | `payload` |
| Clay | `clay` | 8 | `body`, `payload` |
| Clearbit | `clearbit` | 1 | `body`, `headers` |
| Clerk | `clerk` | 1 | `body` |
| Clickhouse | `clickhouse` | 1 | `body`, `headers`, `query` |
| ClickUp | `clickup` | 1 | `body`, `headers` |
| Close CRM | `close_crm` | 97 | `body` |
| Cloudflare | `cloudflare` | 3 | `body`, `data` |
| Cohere | `cohere` | 1 | `body` |
| ConvertKit | `convertkit` | 30 | `body` |
| CrewAI | `crewai` | 3 | `body` |
| Crisp | `crisp` | 3 | `body`, `data` |
| Customer.io | `customer_io` | 69 | `body` |
| Datadog | `datadog` | 3 | `body`, `options` |
| DeepSeek | `deepseek` | 1 | `input` |
| Docker | `docker` | 7 | `payload` |
| Dropcontact | `dropcontact` | 1 | `body` |
| E2B | `e2b` | 10 | `body` |
| Ebay | `ebay` | 47 | `body` |
| Elasticsearch | `elasticsearch` | 12 | `body`, `headers`, `query` |
| fal AI | `fal_ai` | 5 | `body` |
| Firebase | `firebase` | 1 | `data` |
| Firecrawl | `firecrawl` | 6 | `options` |
| Front | `front` | 95 | `body` |
| Fullstory | `fullstory` | 5 | `body`, `headers`, `query` |
| Groq | `groq` | 2 | `input` |
| Heap | `heap` | 1 | `body`, `headers`, `query` |
| Help Scout | `helpscout` | 14 | `body` |
| Home Assistant | `home-assistant` | 2 | `attributes`, `data` |
| Hotjar | `hotjar` | 5 | `body`, `headers`, `query` |
| HTTP | `http` | 1 | `body`, `headers` |
| Hunter | `hunter` | 8 | `body` |
| Instantly | `instantly` | 56 | `body` |
| Intercom | `intercom` | 3 | `body`, `query` |
| Iterable | `iterable` | 64 | `body` |
| Kafka | `kafka` | 1 | `headers` |
| Kinn | `kinn` | 2 | `data`, `input` |
| Klaviyo | `klaviyo` | 7 | `data`, `payload` |
| Langgraph | `langgraph` | 36 | `body`, `headers`, `query` |
| Lemlist | `lemlist` | 34 | `body` |
| LiveChat | `livechat` | 9 | `body` |
| LlamaIndex | `llamaindex` | 2 | `body` |
| Loom | `loom` | 1 | `payload` |
| Mailgun | `mailgun` | 66 | `body` |
| MariaDB | `mariadb` | 2 | `data` |
| Matomo | `matomo` | 1 | `body`, `headers`, `query` |
| Mem0 | `mem0` | 17 | `body` |
| Milvus | `milvus` | 27 | `body` |
| Miro | `miro` | 2 | `data` |
| Mistral AI | `mistral` | 1 | `input` |
| Modal | `modal` | 6 | `body`, `headers`, `query` |
| MySQL | `mysql` | 2 | `data` |
| NATS | `nats` | 3 | `headers`, `payload` |
| Neon | `neon` | 3 | `data` |
| Ollama | `ollama` | 3 | `options` |
| OpenAI | `openai` | 2 | `input` |
| OpenInterpreter | `openinterpreter` | 1 | `body` |
| OpenRouter | `openrouter` | 8 | `body` |
| Outreach | `outreach` | 100 | `body` |
| People Data Labs | `people_data_labs` | 14 | `body` |
| Perplexity | `perplexity` | 1 | `options` |
| PhantomBuster | `phantombuster` | 30 | `body` |
| PlanetScale | `planetscale` | 3 | `data` |
| Plausible | `plausible` | 7 | `body`, `headers`, `query` |
| PostgreSQL | `postgresql` | 3 | `data` |
| PostHog | `posthog` | 6 | `body`, `payload`, `query` |
| Postmark | `postmark` | 8 | `body` |
| Proxycurl | `proxycurl` | 4 | `body` |
| Qdrant | `qdrant` | 1 | `payload` |
| Qonto | `qonto` | 4 | `payload` |
| RabbitMQ | `rabbitmq` | 3 | `payload` |
| Redis | `redis` | 2 | `data` |
| Replicate | `replicate` | 4 | `input` |
| Resend | `resend` | 1 | `headers` |
| Retool | `retool` | 29 | `body` |
| Revolut Business | `revolut_business` | 24 | `body` |
| RingCentral | `ringcentral` | 23 | `body` |
| Runway | `runway` | 4 | `payload` |
| Salesloft | `salesloft` | 59 | `body` |
| SAP | `sap` | 1 | `body` |
| Segment | `segment` | 21 | `body`, `headers`, `query` |
| SendGrid | `sendgrid` | 103 | `body` |
| Smartlead | `smartlead` | 51 | `body` |
| Snowflake | `snowflake` | 7 | `body`, `headers`, `query` |
| SQL Database (MySQL / PostgreSQL) | `sql-database` | 2 | `data` |
| Stability AI | `stability_ai` | 4 | `body` |
| Substack | `substack` | 1 | `body` |
| Supabase | `supabase` | 3 | `data` |
| Talkdesk | `talkdesk` | 155 | `body` |
| Telegram Bot | `telegram` | 1 | `options` |
| TimescaleDB | `timescaledb` | 3 | `data` |
| Together AI | `together_ai` | 16 | `body` |
| Vercel ✓ | `vercel` | 1 | `payload` |
| vLLM ✓ | `vllm` | 14 | `body` |
| Webflow ✓ | `webflow` | 16 | `body` |
| Xero ✓ | `xero` | 71 | `body` |
