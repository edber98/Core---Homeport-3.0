# Audit couverture automation - planetscale, plausible, playwright, postgresql, posthog

## Perimetre retenu
- Endpoints/noeuds metier utiles aux workflows: lecture/ecriture donnees, analytics/query, automation navigateur, evenements.
- Exclusions: credentials/OAuth, configuration globale, administration org/projet, maintenance infra pure.

## Coverage metier
- planetscale: 9/9 (100%)
- plausible: 24/24 (100%)
- playwright: 10/10 (100%)
- postgresql: 9/9 (100%)
- posthog: 24/24 (100%)

## Endpoints/noeuds ajoutes
- postgresql
- `UPSERT SQL (INSERT ... ON CONFLICT ...)` -> `postgresql_record_upsert`

## Endpoints exclus
- planetscale: control plane org/branches/passwords/settings (admin).
- plausible: gestion compte/team/billing globale hors objets site/analytics.
- playwright: parametrage infra navigateur distribue/remote grid.
- postgresql: administration serveur/roles/extension/system catalogs non workflow.
- posthog: administration instance/permissions/org/billing et setup SSO.

## Validation
- Parse JSON manifests: OK
- Chargement `require()` handlers: OK

## Gap residuel
- Aucun sur le perimetre metier retenu.
