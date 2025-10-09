# Repository Guidelines

## Project Structure & Module Organization

- Source: `src/`
  - App entry: `src/main.ts`, root component `src/app/app.ts`.
  - Routes and features: `src/app/app.routes.ts`, lazy modules under `src/app/features/*` (e.g., `dashboard`, `builder`).
  - Modules: reusable building blocks in `src/app/modules/*` (e.g., `dynamic-form`).
  - Layout and pages: `src/app/layout/*`, `src/app/pages/*`.
- Assets: `public/` (copied to `dist` on build).
- Config: `angular.json`, `tsconfig*.json`, `.editorconfig`.
- Docs: `docs/` (e.g., `AGENT_CHANGES.md`).

## Build, Test, and Development Commands

- Run dev server: `npm start` (Angular CLI dev-server at http://localhost:4200).
- Build (prod by default): `npm run build` (outputs to `dist/Homeport`).
- Unit tests: `npm test` (Karma + Jasmine).
- Useful: `ng serve`, `ng build --configuration development` for faster local builds.

## Coding Style & Naming Conventions

- Language: TypeScript (Angular 20), styles in SCSS/LESS as configured.
- File naming: kebab-case for files/folders (e.g., `dynamic-form-builder.component.ts`).
- Classes/Components: PascalCase (e.g., `DynamicFormBuilderComponent`).
- Prefer standalone components and Angular’s style guide (inputs/outputs first, lifecycle next).
- Formatting: honor `.editorconfig`; HTML formatted via Prettier override in `package.json`.

## Testing Guidelines

- Frameworks: Jasmine + Karma.
- Place specs alongside sources (e.g., `src/app/app.spec.ts`).
- Name tests `*.spec.ts`; keep fast, deterministic tests. Run with `npm test`.

## Commit & Pull Request Guidelines

- Commits: concise, imperative subject (e.g., "fix: handle select in sections"). Group related changes; avoid unrelated formatting churn.
- PRs: include a clear description, before/after notes, linked issues, and screenshots or clips for UI/UX changes. Mention affected routes (e.g., `/dynamic-form`) and files.

## Architecture & Tips

- Routing-first, lazy features, and a reusable `dynamic-form` module (`src/app/modules/dynamic-form`).
- UI: NG Zorro components; respect grid usage (`nz-row`/`nz-col`) and trackBy to reduce DOM churn.
- Config: production budgets and a CommonJS allowlist are set in `angular.json`; avoid committing secrets.
