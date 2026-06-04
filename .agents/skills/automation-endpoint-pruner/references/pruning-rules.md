# Règles de filtrage automation

## Garder

- CRUD sur des objets metier utilises dans des workflows.
- Endpoints de lecture servant a alimenter des etapes suivantes: `list`, `search`, `get`, `query`.
- Endpoints d ecriture metier: `create`, `update`, `upsert`, `delete`, `archive`, `restore`.
- Actions operationnelles: `send`, `run`, `execute`, `approve`, `cancel`, `retry`, `deploy`, `publish`, `assign`, `move`, `tag`, `comment`.
- Uploads, fichiers, pieces jointes et exports metier.
- Reception ou emission d evenements metier utiles aux automatisations.

## Exclure par defaut

- Parametres de compte, projet, workspace, environnement, equipe ou organisation.
- Administration des utilisateurs, roles, permissions, groupes, policies.
- Billing, abonnements, plans, factures SaaS, moyens de paiement.
- API keys, tokens, OAuth, credentials, secrets, rotation de secrets.
- Logs internes, audit, diagnostics, health checks, status purement techniques.
- Endpoints beta non stables ou purement internes.
- Configuration des webhooks d administration si le besoin est seulement de recevoir un evenement.

## Arbitrage

- Si un endpoint parait technique mais declenche une action metier concrete, le garder.
- Si un endpoint expose un objet coeur produit meme peu frequemment utilise, le garder.
- Si un endpoint n a de sens que pour administrer la plateforme elle-meme, l exclure.
- En cas d ambiguite, garder l endpoint et le signaler dans le rapport de filtrage.
