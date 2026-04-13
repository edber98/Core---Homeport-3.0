# Prompt pour générer le diaporama PPTX de formation Kinn

Copie ce prompt complet dans une conversation Claude avec l'artefact PowerPoint activé.

---

Génère un diaporama PowerPoint (.pptx) complet de formation pour la plateforme **Kinn** — une plateforme d'automatisation no-code. Le diaporama doit couvrir TOUS les modules ci-dessous, dans cet ordre précis, avec un design professionnel et cohérent.

## Design et style

- **Palette de couleurs** : Bleu principal (#1890ff), accents verts (#52c41a) pour les succès, orange (#faad14) pour les tips, rouge (#ff4d4f) pour les erreurs/attention
- **Police** : Titre en gras (sans-serif), corps en 18-20pt lisible
- **Chaque slide** : titre clair en haut, contenu structuré (bullets, tableaux, schémas textuels)
- **Icônes textuelles** : Utilise des emoji comme icônes (🚀 🔗 📝 🤖 ☁️ ⚙️ ✅ ❌ 💡 🔒 📊 🎯)
- **Langue** : Tout en français

## Structure du diaporama

### SLIDE 1 — Page de titre
- Titre : **Formation Kinn — Plateforme d'automatisation no-code**
- Sous-titre : Guide complet pour maîtriser Kinn de A à Z
- Logo textuel : 🚀 KINN

### SLIDE 2 — Sommaire
Liste numérotée des 8 modules :
1. 🚀 Premiers pas
2. 🔗 Les flows
3. 📝 Les formulaires
4. ⚙️ Expressions et templating
5. 🔒 Providers et credentials
6. 🤖 Assistant IA
7. ☁️ Déploiement
8. 🧪 Fonctionnalités avancées

---

## MODULE 1 — 🚀 Premiers pas (4 leçons)

### SLIDE 3 — Titre du module
**Module 1 : Premiers pas**
Découvrez l'interface de Kinn et créez votre premier flow.

### SLIDE 4 — Bienvenue sur Kinn
Kinn est une plateforme d'automatisation visuelle — sans écrire de code.
Ce que vous pouvez faire :
- **Automatiser** des tâches entre applications (CRM, email, bases de données…)
- **Créer des formulaires** dynamiques
- **Utiliser l'IA** comme copilote
- **Connecter 60+ services** via des providers pré-configurés

### SLIDE 5 — L'interface en un coup d'œil
Schéma de l'interface avec 4 zones :
1. **Sidebar** (gauche) — Navigation principale entre les sections
2. **Header** (haut) — Workspace, recherche, notifications, bouton IA
3. **Zone centrale** — Contenu de la page active
4. **Panel IA** — Accessible via l'icône robot dans le header

💡 **Tip** : L'assistant IA est accessible à tout moment depuis le header.

### SLIDE 6 — Les workspaces
Un **workspace** = un espace de travail isolé contenant :
- Flows, Formulaires, Credentials, Exécutions, Fichiers, Notifications

Pourquoi ? Isoler les données entre projets/clients :
- Workspace « Production » → automatisations en service
- Workspace « Test » → expérimenter sans risque

Changement : via le sélecteur dans le **header** (visible si 2+ workspaces)

### SLIDE 7 — Navigation dans Kinn
Tableau des sections de la sidebar :

| Section | Description |
|---------|------------|
| Dashboard | Vue d'ensemble |
| Assistant IA | Page complète de l'assistant |
| Flows | Gestion des workflows |
| Formulaires | Formulaires dynamiques |
| Sites web | Éditeur intégré |
| Templates de nœuds | Catalogue des opérations |
| Credentials | Identifiants |
| Apps / Providers | Catalogue des applications |

La sidebar peut se réduire (bouton flèche). Recherche rapide dans le header.

### SLIDE 8 — Votre premier flow en 5 minutes
Un **flow** = séquence d'opérations automatisées. Chaque opération = un **nœud** sur un canvas visuel.

Étapes :
1. Aller dans **Flows** → Cliquer sur **Créer un flow**
2. Donner un nom (ex: « Mon premier flow »)
3. Ajouter un nœud **Start** (point d'entrée)
4. Ajouter un nœud **fonction** (ex: Requête HTTP)
5. Configurer le nœud (URL, méthode…)
6. Relier Start → Fonction (câble sortie → entrée)
7. Cliquer sur **Exécuter** pour tester

💡 **Tip** : Utilisez la **simulation** pour tester sans exécuter réellement.

### SLIDE 9 — Quiz Module 1
Questions de vérification :
- Quel est le rôle de Kinn ? → Automatiser des tâches entre applications
- Que se passe-t-il quand on change de workspace ? → Toutes les données changent
- Quel nœud est toujours le premier dans un flow ? → **Start**

---

## MODULE 2 — 🔗 Les flows (6 leçons)

### SLIDE 10 — Titre du module
**Module 2 : Les flows**
Maîtrisez la création et la gestion des workflows automatisés.

### SLIDE 11 — Anatomie d'un flow
3 éléments fondamentaux :

1. **Le canvas** — Zone de travail visuelle (zoom, déplacement, sélection)
2. **Les nœuds** — Chaque nœud = une opération (type, arguments, handles)
3. **Les connexions (edges)** — Relient sortie → entrée, les données circulent de gauche à droite

### SLIDE 12 — Les types de nœuds
Tableau complet :

**Déclenchement :**
- `start` — Exécution manuelle ou API
- `start_form` — Déclenché par soumission de formulaire
- `event` — Webhook, cron, événement externe

**Action :**
- `function` — Exécute une opération (le plus courant)

**Contrôle :**
- `condition` — Branche if/else
- `loop` — Itère sur une liste

**IA :**
- `agent` — Appelle un agent IA avec des outils
- `memory` — Gère la mémoire contextuelle
- `tool_ai` — Définit un outil pour l'agent

### SLIDE 13 — Configurer un nœud
Quand on clique sur un nœud, le panneau de configuration s'ouvre :

- **Formulaire d'arguments** — Champs spécifiques au nœud (URL, méthode, body…)
- **Sections** — Organisées et dépliables (avancées masquées par défaut)
- **Credentials** — Sélecteur automatique si le nœud nécessite une authentification
- **Expressions** — `{{ incoming.data.email }}` pour des données dynamiques

💡 Les champs obligatoires sont marqués d'un astérisque *.

### SLIDE 14 — Connexions et flux de données
Créer une connexion :
1. Survoler le **handle de sortie** (point à droite)
2. **Glisser** vers le **handle d'entrée** (point à gauche)
3. Relâcher → connexion créée

Handles multiples :
- Nœud **condition** → un handle par branche (Vrai, Faux…)
- Nœud avec **output_array_field** → un handle par élément

Accès aux données :
- `incoming.data` → données du nœud précédent
- `incoming.byHandle['handleId']` → données d'un handle spécifique

### SLIDE 15 — Simuler et tester
Deux modes :

| | Simulation | Exécution |
|--|-----------|-----------|
| Données | Factices | Réelles |
| Opérations | Non exécutées | Exécutées |
| Usage | Vérifier la structure | Tester en conditions réelles |

**Exec viewer** : après exécution, cliquez sur un nœud pour voir statut, données d'entrée/sortie, logs.

### SLIDE 16 — Sauvegarder et versionner
Sauvegarde (bouton ou Ctrl+S) :
1. Valide le graph (connexions, champs obligatoires)
2. Stocke les erreurs de validation
3. Met à jour le statut

Statuts :
- **Brouillon** — en construction
- **Valide** ✅ — prêt à exécuter
- **Invalide** ❌ — erreurs de validation

---

## MODULE 3 — 📝 Les formulaires (4 leçons)

### SLIDE 17 — Titre du module
**Module 3 : Les formulaires**
Créez des formulaires dynamiques pour collecter et traiter des données.

### SLIDE 18 — Créer un formulaire
Le Form Builder = éditeur visuel à 3 zones :
- **Gauche** : Palette de champs
- **Centre** : Aperçu en temps réel
- **Droite** : Inspecteur de configuration

Types de champs : texte, nombre, email, sélection, checkbox, date, fichier…
Grille à **24 colonnes** pour le layout.

Ajouter un champ :
1. Cliquer sur le type souhaité dans la palette
2. Renseigner label et key
3. Ajuster options (obligatoire, placeholder, valeur par défaut…)

### SLIDE 19 — Champs avancés
- **section_array** — Listes dynamiques (ajouter/supprimer des lignes)
- **file** — Upload de fichiers (images avec preview, documents)
- **tags / text_array** — Valeurs multiples sous forme de puces
- **schema_builder** — Définir un schéma de données visuellement

💡 section_array peut contenir n'importe quel type de champ, même d'autres champs avancés.

### SLIDE 20 — Logique conditionnelle (visibleIf)
`visibleIf` : afficher/masquer un champ selon la valeur d'un autre.

Exemples :

| Expression | Résultat |
|-----------|---------|
| `method === 'POST'` | Visible si POST |
| `advanced === true` | Visible si checkbox cochée |
| `count > 0` | Visible si compteur > 0 |

Cas d'usage : afficher Body seulement pour POST/PUT, options avancées derrière une checkbox…

### SLIDE 21 — Formulaires publics
Formulaire accessible sans connexion via URL publique.

Flow :
1. Créer un flow avec nœud **start_form**
2. Configurer les champs
3. URL publique générée automatiquement : `/public/form/{flowId}/{nodeId}`
4. Chaque soumission **déclenche le flow**

Cas d'usage : contact, devis, inscription, feedback.

---

## MODULE 4 — ⚙️ Expressions et templating (4 leçons)

### SLIDE 22 — Titre du module
**Module 4 : Expressions et templating**
Maîtrisez les expressions pour injecter des données dynamiques.

### SLIDE 23 — Introduction aux expressions
Syntaxe : doubles accolades `{{ }}`

```
{{ incoming.data.email }}
```

Contexte disponible :

| Variable | Contenu |
|----------|---------|
| `incoming` | Données des nœuds connectés |
| `incoming.data` | Objet de données du nœud précédent |
| `msg` | Message global du flow |
| `env` | Variables d'environnement |

Exemples :
```
Bonjour {{ incoming.data.prenom }} !
L'email est : {{ incoming.data.email }}
```

### SLIDE 24 — Filtres et transformations
Les filtres transforment les données avec le pipe `|` :

| Filtre | Description | Exemple |
|--------|------------|---------|
| `upper` | Majuscules | "hello" → "HELLO" |
| `lower` | Minuscules | "HELLO" → "hello" |
| `json` | Sérialise en JSON | {a:1} → '{"a":1}' |
| `default(val)` | Valeur par défaut | null → val |
| `first` | Premier élément | [1,2,3] → 1 |
| `last` | Dernier élément | [1,2,3] → 3 |
| `length` | Taille | [1,2,3] → 3 |
| `join(sep)` | Joindre | ["a","b"] → "a, b" |
| `trim` | Supprimer espaces | " hi " → "hi" |

Enchaîner : `{{ incoming.data.tags | join(', ') | upper }}`

### SLIDE 25 — Variables ($var:name)
Syntaxe : `$var:nom_variable`

Les variables définissent des **schémas réutilisables** :
- Documenter les données qui circulent
- Valider les types attendus
- Référencer un schéma dans plusieurs nœuds

Exemple :
```json
$var:contact → { "nom": "string", "email": "string", "telephone": "string" }
```

### SLIDE 26 — Expressions avancées
**Conditions** :
```
{% if incoming.data.status === 'active' %}
  Le compte est actif
{% else %}
  Le compte est inactif
{% endif %}
```

**Boucles** :
```
{% for item in incoming.data.items %}
  - {{ item.name }} : {{ item.price }}€
{% endfor %}
```

**Accès par handle** : `{{ incoming.byHandle['handle_id'].data.value }}`
**Calculs** : `{{ incoming.data.prix * incoming.data.quantite }}€`

---

## MODULE 5 — 🔒 Providers et credentials (3 leçons)

### SLIDE 27 — Titre du module
**Module 5 : Providers et credentials**
Connectez vos applications et gérez les identifiants.

### SLIDE 28 — Qu'est-ce qu'un provider ?
Un **provider** = connecteur vers un service externe. 60+ providers pré-configurés.

Exemples : Google (Gmail, Sheets, Drive), Slack, Odoo, HTTP, MongoDB, PostgreSQL…

Chaque provider fournit :
1. Des **node templates** — opérations disponibles
2. Un type de **credential** — authentification
3. Une **icône** et un **nom**

Catalogue accessible via **Apps / Providers** dans la sidebar.

### SLIDE 29 — Configurer des credentials
Types d'authentification :

| Type | Description |
|------|-------------|
| OAuth 2.0 | Fenêtre d'autorisation (Google, Slack…) |
| API Key | Clé secrète du service |
| Basic Auth | Utilisateur + mot de passe |
| Token Bearer | Jeton d'accès |

Étapes : Credentials → Ajouter → Choisir le type → Remplir les champs → Tester → Sauvegarder

🔒 **Sécurité** : chiffrés en BDD, isolés par workspace, jamais dans les logs.

### SLIDE 30 — Explorer les templates
Structure d'un node template :
- **Nom** — ex: « Créer un contact Odoo »
- **Provider** — service associé
- **Type** — function, event, condition…
- **Arguments** — schéma du formulaire de config
- **Handles** — points de connexion entrée/sortie

Section **Templates de nœuds** : recherche par nom, filtre par provider, filtre par type.

---

## MODULE 6 — 🤖 Assistant IA (4 leçons)

### SLIDE 31 — Titre du module
**Module 6 : Assistant IA**
Utilisez l'assistant IA pour construire et optimiser vos automatisations.

### SLIDE 32 — Découvrir l'assistant
Deux interfaces :
1. **Panel IA** — icône robot dans le header, panneau latéral sur n'importe quelle page
2. **Page complète** — via sidebar « Assistant IA », interface dédiée avec sidebar de conversations

Capacités :
- Répondre aux questions sur Kinn
- Construire des flows étape par étape
- Remplir des formulaires automatiquement
- Suggérer des optimisations

### SLIDE 33 — Les 4 modes
| Mode | Contexte | Capacités |
|------|----------|-----------|
| **Chat** | Par défaut | Questions générales, idées, guide |
| **Workflow** | Flow Builder | Ajouter/modifier nœuds, connexions, config |
| **Form** | Form Builder | Ajouter champs, layout, validation |
| **Node Args** | Config d'un nœud | Remplir les champs automatiquement |

### SLIDE 34 — Agents dynamiques
3 types d'agents :

**Agents système** — Générés automatiquement par provider (Agent Odoo, Agent Google…)
**Agents personnalisés** — Créés manuellement avec nom, providers autorisés, autonomie
**Agent général** — Vue d'ensemble de toutes les fonctionnalités

Sélecteur d'agent disponible dans la page complète IA.

### SLIDE 35 — Niveaux d'autonomie
| Niveau | Comportement |
|--------|-------------|
| 🔒 **Prudent** | Demande confirmation avant chaque action |
| ⚖️ **Équilibré** | Petites modifs seul, confirme les grosses |
| 🚀 **Autonome** | Agit librement, informe ensuite |

Mémoire double :
- **Mémoire globale** — préférences générales
- **Mémoire de projet** — contexte par flow/formulaire

💡 Le niveau d'autonomie se configure par agent ou par conversation.

---

## MODULE 7 — ☁️ Déploiement (3 leçons)

### SLIDE 36 — Titre du module
**Module 7 : Déploiement**
Déployez vos flows en production avec des déclencheurs et du monitoring.

### SLIDE 37 — Déclencheurs
| Besoin | Déclencheur | Nœud |
|--------|-------------|------|
| Lancer à la demande | Manuel / API | `start` |
| Collecter des données | Formulaire | `start_form` |
| Réagir à un événement | Webhook | `event` |
| Tâche planifiée | Cron | `event` |

### SLIDE 38 — Webhooks et cron
**Webhook** : URL qui, à la réception d'une requête HTTP, déclenche le flow.

**Cron** — planification récurrente :
```
* * * * *
│ │ │ │ └─ Jour de la semaine (0-7)
│ │ │ └─── Mois (1-12)
│ │ └───── Jour du mois (1-31)
│ └─────── Heure (0-23)
└───────── Minute (0-59)
```

Exemples :
| Cron | Signification |
|------|--------------|
| `0 9 * * 1-5` | Jours ouvrés à 9h |
| `0 */2 * * *` | Toutes les 2h |
| `0 0 1 * *` | 1er du mois à minuit |
| `*/15 * * * *` | Toutes les 15 min |

### SLIDE 39 — Mettre en production
**Checklist** :
1. ✅ Tous les nœuds configurés
2. ✅ Credentials en place et testés
3. ✅ Flow simulé avec succès
4. ✅ Exécuté en test avec données réelles
5. ✅ Erreurs gérées (conditions, fallbacks)

**Monitoring** :
- Section Exécutions (historique des runs)
- Notifications (alertes erreurs)
- Dashboard (vue d'ensemble)

---

## MODULE 8 — 🧪 Fonctionnalités avancées (3 leçons)

### SLIDE 40 — Titre du module
**Module 8 : Fonctionnalités avancées**
Explorez les schémas, sites web et plugins.

### SLIDE 41 — Schémas d'entrée/sortie
**output_array_field** → Plusieurs handles de sortie dynamiques :
1. Template déclare une liste d'options
2. Chaque option → handle de sortie distinct
3. Handler retourne `_output: itemId` → engine route

**output_schema_field** → Schéma de sortie défini par un champ du formulaire (ex: extraction)

**inputHandles** → Entrées multiples identifiables séparément

### SLIDE 42 — Sites web
Éditeur intégré pour créer des pages liées aux automatisations :
- Pages avec éditeur visuel
- Composants : texte, images, formulaires
- Style : couleurs, polices, layout

Cas d'usage : page de formulaire, dashboard simple, landing page.

### SLIDE 43 — Apps et plugins
Structure d'un plugin :
```
mon-plugin/
├── manifest.json    ← Provider, templates, credentials
└── functions/
    ├── create_item.js
    └── list_items.js
```

Le manifest définit :
- Le **provider** (nom, icône)
- Les **credentials** (champs d'authentification)
- Les **nodes** (key, title, type, args)

Import : variable `PLUGIN_IMPORT_ENABLED=1` requise.

### SLIDE 44 — Handlers JavaScript
Signature d'un handler :
```javascript
async function create_item(node, msg, inputs, opts) {
  const creds = opts.credentials;
  const data = inputs.incoming?.data;
  // ... logique métier ...
  return { ok: true, result: { id: '123', name: 'Item créé' } };
}
```

⚠️ Le nom de la fonction **doit** correspondre au `key` du template.

---

### SLIDE 45 — Récapitulatif du parcours
Schéma du parcours complet :

```
🚀 Premiers pas → 🔗 Flows → 📝 Formulaires → ⚙️ Expressions
        ↓              ↓            ↓                ↓
   Interface      Canvas &     Form Builder     {{ data }}
   Workspaces     Nœuds        Champs          Filtres
   Navigation     Connexions   visibleIf       Variables
                  Simulation   Public forms    Avancées

🔒 Providers → 🤖 Assistant IA → ☁️ Déploiement → 🧪 Avancé
      ↓              ↓                ↓               ↓
  Catalogue      4 modes         Déclencheurs    Schémas
  Credentials    Agents          Cron/Webhook    Sites web
  Templates      Autonomie      Production      Plugins
```

### SLIDE 46 — Page de fin
**Vous êtes prêt à automatiser avec Kinn !** 🎉

Ressources :
- 📚 Module « Apprendre » dans l'application (cours interactifs)
- 🤖 Assistant IA disponible 24/7
- 🎯 Visites guidées intégrées dans chaque section

**Prochaine étape** : Créez votre premier flow → Start → Action → Exécuter !
