# RADAR — Prochaine étape : INTELLIGENCE & scénarios ciblés

Constat utilisateur : les liens et process se forment, mais « c'est pas assez précis,
c'est du vent, c'est pas intelligent ». Il manque la SÉMANTIQUE (types, contenus,
intentions) et des scénarios réels, pour que l'analyse des goulots soit ciblée et
qu'on puisse interroger le système et qu'il s'adapte.

## I1 — Liens sémantiques email ↔ projet / ticket (pas seulement client/facture)
Un email parle souvent d'un PROJET ou d'un TICKET (par son sujet/contenu), pas
seulement du client. À faire :
- corréler `Communication.email` → `Project` / `WorkItem.ticket` par similarité
  sujet↔libellé (réutiliser `correlate.js` + `nameSimilarity`), pas seulement → Party ;
- relation `references` (role `about`) email→projet et email→ticket ;
- côté simulation : générer des emails « point projet », « réponse au ticket #X ».
État : amorcé (emails simulés reliés client+pièce ; à étendre projet+ticket).

## I2 — Typage SÉMANTIQUE des entités (secteur, nature)
Pour cibler l'analyse, enrichir les entités d'un TYPE métier :
- **Client** : secteur (industrie, formation, service public, commerce…) ;
- **Projet** : nature (déploiement, R&D, maintenance, marketing…) ;
- **Facture** : catégorie (prestation, matériel, abonnement, acompte…).
Méthode hybride (predict-or-ask) :
1. déterministe (mots-clés du libellé/lignes) ;
2. LLM sur le contenu réel (libellés + lignes + emails liés) ;
3. **agents web** optionnels : à partir du nom + site du client, rechercher en ligne
   son activité réelle et la qualifier (déjà esquissé : « analyse de mon entreprise »).
Stockage : `attributes.segment` / `attributes.kind` + sous-types d'ontologie dynamiques.

## I3 — Process mining CIBLÉ par type
Une fois les types posés, le process mining se segmente :
- DFG filtrables par secteur client / nature de projet / catégorie de facture ;
- comparaison des goulots PAR segment (« les déploiements industriels traînent à l'étape
  livraison », « les formations sont payées plus vite ») → analyse réellement actionnable.

## I4 — Processus GLOBAUX (bout-en-bout métier)
Au-delà du cycle par type, des processus métier nommés et transverses :
- **Processus de vente** : lead → devis → relance → signature → commande → livraison →
  facture → paiement (cross-logiciel, avec emails et délais à chaque étape) ;
- **Processus support** : ticket reçu → qualifié → traité → résolu → satisfaction ;
- **Processus projet** : cadrage → production → recette → clôture.
Vue dédiée : un parcours global lisible, drill-down vers les cycles par type.

## I5 — Interrogation conversationnelle + adaptation
- Poser des questions en langage naturel sur le graphe/process (« où sont mes goulots
  sur les clients industriels ce trimestre ? ») ;
- l'agent interroge le cerveau (graphe + process + modèles) et répond, avec sources ;
- adaptation : ses réponses/feedback affinent types, mappings et seuils (boucle feedback).

## I6 — Scénarios de test RÉELS (étendre RADAR_TEST_PLAN.md)
Jeux de données par SEGMENT, avec cas riches :
- client industriel (production, OF, stock, maintenance) ;
- organisme de formation (sessions, stagiaires, financement) ;
- service public (marchés, délais de paiement longs → goulot trésorerie) ;
chacun avec son cycle de vente complet + emails + tickets + projet, pour valider le
typage, les liens email↔projet/ticket et les goulots ciblés.

---
Priorité suggérée : I1 (liens) → I2 (types) → I3 (process ciblé) → I4 (process globaux)
→ I5 (conversationnel). I6 alimente chaque étape en données de test réelles.
