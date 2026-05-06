# Kinn — Script oral

*6 min 17 s de vidéo · 10 min de prise de parole · prévoir des respirations.*

---

## P00 — Histoire C4RBON → Kinn · **0:00 – 0:25**

> C4RBON GROUP, c'est **quatre ans de terrain**.
>
> En 2021, nous créions i55 pour faire parler les ERP, les CRM et les machines des industriels. En 2022, nous automatisions. En 2023, nous intégrions l'IA. Et en 2024, i55 est devenu C4RBON GROUP.
>
> **Kinn est l'aboutissement de cette aventure.** Notre conviction : les entreprises n'ont pas besoin de nouveaux outils — elles ont besoin qu'ils se parlent.

---

## P01 — Le problème · **0:25 – 0:40**

> Dans 100 % des PME que nous accompagnons, on entend la même chose : les logiciels ne se parlent pas entre eux. Un commercial saisit une affaire dans le CRM, la compta la ressaisit dans l'ERP, le chef de projet la recopie dans Notion, et quelqu'un finit par prévenir Slack.
>
> Résultat : **30 % du temps de travail gaspillé. 11 heures par semaine par collaborateur perdues. 62 % des entreprises ont des outils déconnectés.**

---

## P02 — Workflows · **0:40 – 1:02**

> La première brique de Kinn, ce sont les **workflows**. Vous décrivez en langage naturel ce que vous voulez faire, et Kinn construit le tuyau.
>
> L'information circule automatiquement entre Gmail, Odoo, Stripe et Slack. Aucune action humaine nécessaire à chaque exécution. Et au centre, un **nœud IA** : n'importe quelle étape peut être étoffée, structurée ou corrigée par l'intelligence artificielle.

---

## P03 — DÉMO 1 · Workflow IA (carte de visite) · **1:02 – 1:59**

> Passons à la démo. À gauche, le Flow Builder de Kinn. À droite, le panneau IA toujours ouvert.
>
> Je tape un besoin concret : un formulaire qui accepte une photo de carte de visite, extrait les coordonnées, et pousse le contact dans Odoo. Sans coder.
>
> Remarquez : **le canvas reste vide**. Kinn commence par **réfléchir**. Il analyse le besoin, identifie les outils, séquence les étapes.
>
> Une fois la planification terminée, Kinn dépose les briques : formulaire, agent Hedy pour la vision, extraction structurée, connecteur Odoo, notification Slack. **Simple, vertical, lisible.**
>
> Je clique sur **Lancer**. Une photo de carte arrive : Sophie Laurent, directrice commerciale chez NovaTech. Hedy lit l'image, extrait nom, fonction, société, email, téléphone. Et dans Odoo, **une notification : nouveau contact créé**.
>
> Une carte de visite physique devient un lead qualifié dans votre CRM, **en trois secondes, sans qu'un humain n'ait touché au clavier**.

---

## P04 — Pont Workflow ↔ Agents · **1:59 – 2:23**

> Deux manières complémentaires de mettre l'IA au travail. Les **workflows** pour les tâches récurrentes, déclenchées par événement ou planning. Les **agents** pour les demandes ponctuelles, en langage naturel.
>
> Un workflow peut appeler des agents. Un agent peut lui aussi déclencher n'importe quel nœud de workflow. **Les deux partagent les mêmes briques**.
>
> **Récurrent → workflow. Ponctuel → agent.**

---

## P05 — Agents IA · **2:23 – 2:41**

> La deuxième brique, ce sont les **agents**. Une équipe de spécialistes virtuels : un explorateur web, un analyste de données, un rédacteur, un exécuteur de code, un logicien.
>
> Ils fonctionnent **comme une équipe humaine**. Un chef d'orchestre reçoit votre demande, la découpe, et délègue. Et si un spécialiste a besoin d'aide, il peut **lui-même mobiliser d'autres agents** — profondeur illimitée.

---

## P06 — DÉMO 2 · Étude de marché avec c4rbon.group · **2:41 – 3:57**

> Démo plus ambitieuse. J'ouvre l'assistant, je demande une étude de marché complète sur les plateformes iPaaS européennes pour 2026. Deux axes : concurrents et tendances techniques. Aux couleurs de mon client **c4rbon.group**.
>
> Denis me répond mot par mot. Il annonce sa stratégie : trois experts mobilisés en parallèle.
>
> Les canvas apparaissent **directement dans la conversation**. Les agents ne parlent pas juste, ils produisent des artefacts interactifs.
>
> Tim ramène les concurrents : Zapier, Make, n8n, Workato. Ada synthétise les tendances : MCP, RAG, multimodal.
>
> Donald va chercher la charte c4rbon.group, applique les couleurs, la typo, **et télécharge le vrai logo C4RBON depuis leur site**. Il génère l'Excel.
>
> Voici le livrable. Trois onglets, en-tête **C4RBON GROUP** avec leur logo hexagonal officiel, colonnes concurrents, pricing, positionnement. Kinn mis en avant comme l'acteur français. **Moins de deux minutes pour ce qu'un stagiaire ferait en deux jours.**

---

## P07 — Sandbox · **3:57 – 4:22**

> Question naturelle : que se passe-t-il quand un agent rencontre un besoin pour lequel **aucun outil n'existe** ? Par exemple, récupérer la grille tarifaire d'un concurrent qui n'expose pas d'API.
>
> L'agent **écrit du code Python** à la volée et va scraper la page HTML.
>
> Mais tout dans un **environnement isolé et sécurisé** : sortie réseau whitelistée, limites CPU et mémoire, logs audités, détruit après exécution. **Liberté du code, sécurité de l'isolation.**

---

## P08 — Permissions · **4:22 – 4:42**

> Confier vos processus à une IA peut faire peur. Kinn vous laisse **configurer le niveau de contrôle**.
>
> Trois niveaux : **Prudent**, **Équilibré**, **Autonome**.
>
> L'agent détecte qu'il va faire quelque chose d'impactant — ici, envoyer 12 emails à des clients — et **il vous demande la permission**, avec tout le contexte. **Vous gardez la main.**

---

## P09 — Trigger email · Workflow + agent · **4:42 – 5:04**

> Un exemple qui combine tout. Une facture fournisseur arrive à 9h14. Le **trigger Gmail** déclenche le workflow.
>
> Ada lit, comprend, extrait les champs structurés : fournisseur, montant, échéance, référence commande, et **la catégorie comptable** — fait par l'IA, pas par une règle.
>
> Trois actions se déclenchent en parallèle : **Odoo** enregistre, **Slack** alerte l'équipe compta, **Gmail** archive. Trois logiciels, trois actions, zéro humain.

---

## P10 — R&D Confidentialité · **5:04 – 5:32**

> Un mot sur notre **laboratoire R&D**. Je précise d'emblée : **ce qui suit n'est pas encore actif en production**, c'est sur quoi notre équipe travaille.
>
> Nous ne concurrencerons pas OpenAI ou Anthropic sur la puissance pure. Mais nous allons **les utiliser sans leur exposer vos données**.
>
> Un **petit modèle local** détecte les informations sensibles — noms, emails, IBAN, chiffres d'affaires — et les **remplace par des identifiants anonymes**. *"Martin Dupont"* devient *"PER_8a3f"*.
>
> Le modèle puissant raisonne sur les pseudo-identifiants. Au retour, **le modèle local réassocie les vraies valeurs**.
>
> Vous récupérez un livrable complet avec vos vraies données, **sans qu'elles n'aient jamais quitté votre périmètre**.

---

## P11 — Plus-value en entreprise · **5:32 – 6:02**

> Ce que Kinn change concrètement.
>
> Aujourd'hui, une **facture fournisseur** passe entre trois bureaux en 15 minutes. Avec Kinn, c'est 2 minutes sans ressaisie.
>
> Une **carte de visite** commerciale met deux jours à arriver dans le CRM. Avec Kinn, trois secondes.
>
> Un **email support** est routé manuellement. Avec Kinn, instantané.
>
> Une **alerte machine** mobilise trois personnes en 45 minutes. Avec Kinn, 8 minutes et un plan d'action prêt.
>
> Au total : **30 à 60 %** du travail manuel éliminé. **10 heures gagnées** par semaine et par collaborateur. **Moins d'un mois** pour voir les premiers résultats.

---

## P12 — Closing · **6:02 – 6:17**

> Trois piliers. **Connecter** 60+ logiciels. **Automatiser** avec des workflows visuels. **Déléguer** aux agents IA.
>
> Une plateforme **française et souveraine**, pour les équipes qui veulent automatiser sans perdre le contrôle de leurs données.
>
> Rendez-vous sur **kinn.fr** pour une démo.
>
> Je prends vos questions.

---

*Phrases-clés à bien marquer :*
> *"aucune action humaine"* · *"vous gardez la main"* · *"sans qu'elles n'aient jamais quitté votre périmètre"* · *"en R&D, pas encore actif"*
