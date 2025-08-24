Backend CLI Tools

Script
- backend/scripts/cli.js (run via npm --prefix backend run cli -- <cmd> [options])

Commands
- purge: Drop all collections (company, users, workspaces, memberships, flows, providers, node-templates, apps, credentials, notifications, runs, plugin-repos).
- seed: Seed default data (companies/users/workspaces/flows) if empty.
- reload: Reload plugin repos (local + repos directories). Imports manifests and registers functions.
- import <file>: Import a manifest JSON file (providers + node-templates). Options: --dryRun

Options
- --mongo <url>: Override Mongo URL (MONGO_URL)
- --db <name>: Override database name (MONGO_DB_NAME)
- --dryRun: For import command; performs checksum diff without writing

Examples
- Purge + seed + reload:
  - npm --prefix backend run cli -- purge
  - npm --prefix backend run cli -- seed
  - npm --prefix backend run cli -- reload
- Import a manifest file:
  - npm --prefix backend run cli -- import ./myrepo/manifest.json --dryRun

