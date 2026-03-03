// ─── Types ──────────────────────────────────────────────────────────

export interface LearnModule {
  id: string;
  title: string;
  icon: string;
  description: string;
  lessons: LearnLesson[];
}

export interface LearnLesson {
  id: string;
  title: string;
  estimatedMinutes: number;
  blocks: LearnBlock[];
}

export type LearnBlock = TheoryBlock | TipBlock | ImageBlock | ExerciseBlock;

export interface TheoryBlock  { type: 'theory'; markdown: string; }
export interface TipBlock     { type: 'tip'; markdown: string; }
export interface ImageBlock   { type: 'image'; src: string; alt: string; caption?: string; }

export interface ExerciseBlock {
  type: 'exercise';
  exerciseType: 'quiz' | 'expression' | 'drag-match' | 'fill-blank' | 'ordering';
  id: string;
  title: string;
  data: QuizData | ExpressionData | DragMatchData | FillBlankData | OrderingData;
}

// ─── Exercise data types ────────────────────────────────────────────

export interface QuizData {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export interface ExpressionData {
  instruction: string;
  context: Record<string, any>;
  expectedOutput: string;
  hint?: string;
}

export interface DragMatchData {
  instruction: string;
  pairs: { left: string; right: string }[];
}

export interface FillBlankData {
  instruction: string;
  /** Use {{BLANK}} as placeholder */
  template: string;
  blanks: { answer: string; alternatives?: string[] }[];
}

export interface OrderingData {
  instruction: string;
  /** Items in correct order */
  correctOrder: string[];
}

// ─── Module → Tour mapping ──────────────────────────────────────────

export const MODULE_TOUR_MAP: Record<string, string[]> = {
  'getting-started': ['tour-interface'],
  'flows': ['tour-flow-list', 'tour-flow-builder'],
  'forms': ['tour-form-builder'],
  'providers': ['tour-credentials'],
  'ai': ['tour-ai'],
};

// ─── Curriculum ─────────────────────────────────────────────────────

export const CURRICULUM: LearnModule[] = [

  // ═══════════════════════════════════════════════════════════════════
  // MODULE 1 — Premiers pas
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'getting-started',
    title: 'Premiers pas',
    icon: 'rocket',
    description: 'Découvrez l\'interface de Kinn et créez votre premier flow.',
    lessons: [
      {
        id: 'gs-welcome',
        title: 'Bienvenue sur Kinn',
        estimatedMinutes: 5,
        blocks: [
          { type: 'theory', markdown: `# Bienvenue sur Kinn

Kinn est une plateforme d'automatisation qui vous permet de connecter vos applications, traiter des données et créer des workflows visuels — **sans écrire de code**.

## Ce que vous pouvez faire

- **Automatiser** des tâches répétitives entre vos outils (CRM, email, bases de données…)
- **Créer des formulaires** dynamiques pour collecter et traiter des données
- **Utiliser l'IA** pour vous assister dans la construction de vos automatisations
- **Connecter 60+ services** via des providers pré-configurés

## L'interface en un coup d'œil

L'application se compose de plusieurs zones :

1. **La sidebar** (à gauche) — navigation principale entre les sections
2. **Le header** — sélection du workspace, notifications, recherche
3. **La zone centrale** — le contenu de la page active
4. **Le panel IA** — accessible depuis le header pour poser des questions` },
          { type: 'tip', markdown: `Vous pouvez accéder à l'assistant IA à tout moment en cliquant sur l'icône robot dans le header. Il peut vous aider à construire des flows et remplir des formulaires.` },
          {
            type: 'exercise', exerciseType: 'quiz', id: 'gs-welcome-q1',
            title: 'Vérifiez votre compréhension',
            data: {
              question: 'Quel est le rôle principal de Kinn ?',
              options: [
                'Écrire du code backend',
                'Automatiser des tâches entre applications',
                'Gérer des serveurs',
                'Créer des sites e-commerce'
              ],
              correctIndex: 1,
              explanation: 'Kinn est une plateforme d\'automatisation visuelle qui connecte vos applications entre elles.'
            } as QuizData
          },
          {
            type: 'exercise', exerciseType: 'drag-match', id: 'gs-welcome-dm1',
            title: 'Associez chaque zone à sa fonction',
            data: {
              instruction: 'Glissez chaque zone de l\'interface vers sa description.',
              pairs: [
                { left: 'Sidebar', right: 'Navigation entre les sections' },
                { left: 'Header', right: 'Workspace, notifications, recherche' },
                { left: 'Zone centrale', right: 'Contenu de la page active' },
                { left: 'Panel IA', right: 'Assistant pour construire des flows' }
              ]
            } as DragMatchData
          }
        ]
      },
      {
        id: 'gs-workspaces',
        title: 'Comprendre les workspaces',
        estimatedMinutes: 5,
        blocks: [
          { type: 'theory', markdown: `# Les workspaces

Un **workspace** est un espace de travail isolé. Chaque workspace possède ses propres :

- Flows
- Formulaires
- Credentials (identifiants)
- Exécutions
- Fichiers et notifications

## Pourquoi des workspaces ?

Les workspaces permettent d'**isoler les données** entre différents projets ou clients. Par exemple :
- Un workspace « Production » pour les automatisations en service
- Un workspace « Test » pour expérimenter sans risque

## Changer de workspace

Le sélecteur de workspace se trouve dans le **header** (visible si vous avez accès à 2+ workspaces). Quand vous changez de workspace, toutes les données affichées changent.` },
          { type: 'tip', markdown: `Un administrateur peut créer et gérer les workspaces depuis le menu **Workspaces** dans la sidebar.` },
          {
            type: 'exercise', exerciseType: 'quiz', id: 'gs-ws-q1',
            title: 'Les workspaces',
            data: {
              question: 'Que se passe-t-il quand vous changez de workspace ?',
              options: [
                'Rien, c\'est juste un label',
                'Toutes les données affichées changent (flows, forms, credentials…)',
                'Seuls les flows changent',
                'Vous êtes déconnecté'
              ],
              correctIndex: 1,
              explanation: 'Les workspaces isolent complètement les données : flows, formulaires, credentials, exécutions, fichiers et notifications.'
            } as QuizData
          }
        ]
      },
      {
        id: 'gs-navigation',
        title: 'Naviguer dans l\'application',
        estimatedMinutes: 4,
        blocks: [
          { type: 'theory', markdown: `# Navigation dans Kinn

## La sidebar

La sidebar contient les liens vers toutes les sections principales :

| Section | Description |
|---------|------------|
| **Dashboard** | Vue d'ensemble de vos activités |
| **Assistant IA** | Page complète de l'assistant |
| **Flows** | Liste et gestion des workflows |
| **Formulaires** | Formulaires dynamiques |
| **Sites web** | Éditeur de sites intégrés |
| **Templates de nœuds** | Catalogue des opérations disponibles |
| **Credentials** | Gestion des identifiants |
| **Apps / Providers** | Catalogue des applications connectables |

## La sidebar peut se réduire

Cliquez sur le bouton de collapse (flèche) pour réduire la sidebar et gagner de l'espace. Sur tablette, elle est réduite par défaut.

## Recherche

Le champ de recherche dans le header permet de trouver rapidement vos flows et formulaires.` },
          {
            type: 'exercise', exerciseType: 'ordering', id: 'gs-nav-ord1',
            title: 'Remettez dans l\'ordre',
            data: {
              instruction: 'Classez ces actions dans l\'ordre logique pour accéder à un flow existant.',
              correctOrder: [
                'Se connecter à Kinn',
                'Vérifier le workspace actif',
                'Cliquer sur « Flows » dans la sidebar',
                'Cliquer sur le flow dans la liste'
              ]
            } as OrderingData
          }
        ]
      },
      {
        id: 'gs-first-flow',
        title: 'Votre premier flow en 5 minutes',
        estimatedMinutes: 6,
        blocks: [
          { type: 'theory', markdown: `# Créer votre premier flow

Un **flow** est une séquence d'opérations automatisées. Chaque opération est représentée par un **nœud** sur un canvas visuel.

## Étapes pour créer un flow

1. Allez dans **Flows** via la sidebar
2. Cliquez sur **Créer un flow**
3. Donnez-lui un nom (ex: « Mon premier flow »)
4. Vous arrivez sur le **Flow Builder** — un canvas vierge avec un nœud « Start »
5. Cliquez sur le **+** pour ajouter un nœud
6. Choisissez une opération dans la palette (ex: « HTTP Request »)
7. Configurez le nœud (URL, méthode, etc.)
8. Reliez les nœuds en tirant un câble de la sortie vers l'entrée
9. Cliquez sur **Exécuter** pour tester

## Le résultat

Après l'exécution, chaque nœud affiche son résultat. Vous pouvez cliquer dessus pour voir les données détaillées.` },
          { type: 'tip', markdown: `Utilisez la **simulation** (bouton « Simuler ») pour tester votre flow sans l'exécuter réellement. C'est parfait pour vérifier la structure avant de lancer.` },
          {
            type: 'exercise', exerciseType: 'ordering', id: 'gs-first-ord1',
            title: 'Les étapes de création',
            data: {
              instruction: 'Remettez dans l\'ordre les étapes pour créer et tester un flow.',
              correctOrder: [
                'Aller dans la section Flows',
                'Cliquer sur « Créer un flow »',
                'Ajouter des nœuds depuis la palette',
                'Configurer chaque nœud',
                'Relier les nœuds entre eux',
                'Exécuter le flow'
              ]
            } as OrderingData
          },
          {
            type: 'exercise', exerciseType: 'quiz', id: 'gs-first-q1',
            title: 'Le Flow Builder',
            data: {
              question: 'Quel nœud est toujours présent par défaut quand vous créez un nouveau flow ?',
              options: ['HTTP Request', 'Start', 'Condition', 'End'],
              correctIndex: 1,
              explanation: 'Chaque flow commence avec un nœud « Start » qui définit le point d\'entrée de l\'exécution.'
            } as QuizData
          }
        ]
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════
  // MODULE 2 — Les flows
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'flows',
    title: 'Les flows',
    icon: 'branches',
    description: 'Maîtrisez la création et la gestion des workflows automatisés.',
    lessons: [
      {
        id: 'fl-anatomy',
        title: 'Anatomie d\'un flow',
        estimatedMinutes: 5,
        blocks: [
          { type: 'theory', markdown: `# Anatomie d'un flow

Un flow est composé de trois éléments fondamentaux :

## 1. Le canvas

Le canvas est la zone de travail visuelle. Vous pouvez :
- **Zoomer** avec la molette ou les boutons +/-
- **Se déplacer** en glissant le fond
- **Sélectionner** des nœuds en cliquant dessus

## 2. Les nœuds

Chaque nœud représente une **opération** (envoyer un email, requête HTTP, condition…). Un nœud possède :
- Un **type** (function, condition, loop…)
- Des **arguments** (le formulaire de configuration)
- Des **handles** d'entrée et de sortie (les points de connexion)

## 3. Les connexions (edges)

Les connexions relient la sortie d'un nœud à l'entrée d'un autre. Les données circulent le long de ces connexions, de gauche à droite.` },
          {
            type: 'exercise', exerciseType: 'drag-match', id: 'fl-anat-dm1',
            title: 'Associez les éléments',
            data: {
              instruction: 'Associez chaque élément du flow à sa description.',
              pairs: [
                { left: 'Canvas', right: 'Zone de travail visuelle' },
                { left: 'Nœud', right: 'Opération individuelle' },
                { left: 'Handle', right: 'Point de connexion entrée/sortie' },
                { left: 'Edge', right: 'Connexion entre deux nœuds' }
              ]
            } as DragMatchData
          }
        ]
      },
      {
        id: 'fl-node-types',
        title: 'Les types de nœuds',
        estimatedMinutes: 6,
        blocks: [
          { type: 'theory', markdown: `# Les types de nœuds

Kinn propose plusieurs types de nœuds, chacun avec un rôle spécifique :

## Nœuds de déclenchement
- **start** — Point d'entrée du flow (exécution manuelle ou API)
- **start_form** — Déclenché par la soumission d'un formulaire
- **event** — Déclenché par un événement externe (webhook, cron…)

## Nœuds d'action
- **function** — Exécute une opération (le type le plus courant)

## Nœuds de contrôle
- **condition** — Branche le flow selon des conditions (if/else)
- **loop** — Itère sur une liste d'éléments

## Nœuds IA
- **agent** — Appelle un agent IA avec des outils
- **memory** — Gère la mémoire contextuelle de l'IA
- **tool_ai** — Définit un outil accessible par l'agent IA` },
          {
            type: 'exercise', exerciseType: 'drag-match', id: 'fl-types-dm1',
            title: 'Catégories de nœuds',
            data: {
              instruction: 'Associez chaque nœud à sa catégorie.',
              pairs: [
                { left: 'start_form', right: 'Déclenchement' },
                { left: 'function', right: 'Action' },
                { left: 'condition', right: 'Contrôle' },
                { left: 'agent', right: 'IA' }
              ]
            } as DragMatchData
          },
          {
            type: 'exercise', exerciseType: 'quiz', id: 'fl-types-q1',
            title: 'Types de nœuds',
            data: {
              question: 'Quel type de nœud permet de créer des branches conditionnelles (if/else) ?',
              options: ['function', 'loop', 'condition', 'event'],
              correctIndex: 2,
              explanation: 'Le nœud « condition » évalue des conditions et dirige le flux vers différentes branches.'
            } as QuizData
          }
        ]
      },
      {
        id: 'fl-configure',
        title: 'Configurer un nœud',
        estimatedMinutes: 6,
        blocks: [
          { type: 'theory', markdown: `# Configurer un nœud

Quand vous cliquez sur un nœud, un **panneau de configuration** s'ouvre. Il contient :

## Le formulaire d'arguments

Chaque nœud a ses propres champs de configuration. Par exemple, un nœud HTTP Request demande :
- **URL** — l'adresse à appeler
- **Méthode** — GET, POST, PUT, DELETE…
- **Headers** — en-têtes personnalisés
- **Body** — le corps de la requête

## Les sections

Les champs sont organisés en **sections** dépliables. Les sections avancées sont masquées par défaut pour simplifier l'interface.

## Les credentials

Certains nœuds nécessitent des **identifiants** (credentials). Par exemple, un nœud « Envoyer un email Gmail » demande un credential Google. Le sélecteur de credential apparaît automatiquement.

## Les expressions

Vous pouvez utiliser des **expressions** dans presque tous les champs texte. Elles permettent d'injecter des données dynamiques : \`{{ incoming.data.email }}\`` },
          { type: 'tip', markdown: `Les champs obligatoires sont marqués d'un astérisque (*). Le flow ne pourra pas s'exécuter si un champ obligatoire est vide.` },
          {
            type: 'exercise', exerciseType: 'fill-blank', id: 'fl-conf-fb1',
            title: 'Complétez la phrase',
            data: {
              instruction: 'Complétez les phrases sur la configuration des nœuds.',
              template: 'Pour injecter des données dynamiques dans un champ, on utilise des {{BLANK}}. Les identifiants de connexion aux services externes s\'appellent des {{BLANK}}.',
              blanks: [
                { answer: 'expressions', alternatives: ['expression'] },
                { answer: 'credentials', alternatives: ['credential', 'identifiants'] }
              ]
            } as FillBlankData
          }
        ]
      },
      {
        id: 'fl-connections',
        title: 'Connexions et flux de données',
        estimatedMinutes: 5,
        blocks: [
          { type: 'theory', markdown: `# Connexions et flux de données

## Créer une connexion

Pour connecter deux nœuds :
1. Survolez le **handle de sortie** (point à droite du nœud source)
2. **Glissez** vers le **handle d'entrée** (point à gauche du nœud cible)
3. Relâchez — la connexion est créée

## Handles multiples

Certains nœuds ont **plusieurs handles de sortie**. Par exemple :
- Un nœud **condition** a un handle par branche (Vrai, Faux, etc.)
- Un nœud avec **output_array_field** a un handle par élément de la liste

## Données entre nœuds

Les données circulent le long des connexions. Dans le nœud suivant, vous accédez aux données du nœud précédent via :
- \`incoming.data\` — les données de sortie du nœud connecté
- \`incoming.byHandle['handleId']\` — les données d'un handle spécifique (quand il y en a plusieurs)` },
          {
            type: 'exercise', exerciseType: 'ordering', id: 'fl-conn-ord1',
            title: 'Créer une connexion',
            data: {
              instruction: 'Remettez dans l\'ordre les étapes pour connecter deux nœuds.',
              correctOrder: [
                'Survoler le handle de sortie du nœud source',
                'Cliquer et maintenir le bouton de la souris',
                'Glisser vers le handle d\'entrée du nœud cible',
                'Relâcher le bouton de la souris'
              ]
            } as OrderingData
          },
          {
            type: 'exercise', exerciseType: 'quiz', id: 'fl-conn-q1',
            title: 'Flux de données',
            data: {
              question: 'Comment accède-t-on aux données du nœud précédent ?',
              options: [
                'Via la variable « previous »',
                'Via « incoming.data »',
                'Via « output.result »',
                'Via « node.parent »'
              ],
              correctIndex: 1,
              explanation: 'Les données du nœud précédent sont accessibles via « incoming.data » dans les expressions.'
            } as QuizData
          }
        ]
      },
      {
        id: 'fl-simulate',
        title: 'Simuler et tester',
        estimatedMinutes: 5,
        blocks: [
          { type: 'theory', markdown: `# Simuler et tester

Kinn offre deux modes pour tester vos flows :

## La simulation

La **simulation** parcourt votre flow sans exécuter réellement les opérations. Elle utilise des données factices pour :
- Vérifier la **structure** du flow (connexions valides)
- Prévisualiser les **schémas de données** entre les nœuds
- Tester les **conditions** et les branches

## L'exécution réelle

L'**exécution** lance réellement les opérations. Chaque nœud :
1. Reçoit les données d'entrée
2. Exécute son handler
3. Retourne un résultat

## L'exec viewer

Après une exécution, cliquez sur un nœud pour ouvrir l'**exec viewer** qui affiche :
- Le **statut** (succès, erreur)
- Les **données d'entrée** reçues
- Les **données de sortie** produites
- Les **logs** éventuels` },
          {
            type: 'exercise', exerciseType: 'drag-match', id: 'fl-sim-dm1',
            title: 'Simulation vs Exécution',
            data: {
              instruction: 'Associez chaque caractéristique au bon mode.',
              pairs: [
                { left: 'Données factices', right: 'Simulation' },
                { left: 'Opérations réelles', right: 'Exécution' },
                { left: 'Vérifier la structure', right: 'Simulation' },
                { left: 'Résultats concrets', right: 'Exécution' }
              ]
            } as DragMatchData
          }
        ]
      },
      {
        id: 'fl-save',
        title: 'Sauvegarder et versionner',
        estimatedMinutes: 4,
        blocks: [
          { type: 'theory', markdown: `# Sauvegarder et versionner

## Sauvegarde

Le flow est sauvegardé quand vous cliquez sur le bouton **Sauvegarder** (ou Ctrl+S). À chaque sauvegarde, le système :
1. **Valide** le graph (connexions correctes, champs obligatoires remplis)
2. Stocke les **erreurs de validation** éventuelles
3. Met à jour le **statut** du flow

## Validation automatique

Le système vérifie :
- Que chaque nœud référence un **template valide**
- Que les **checksums** correspondent (détection des templates modifiés)
- Que les **champs obligatoires** sont remplis

## Statuts

Un flow peut avoir plusieurs statuts :
- **Brouillon** — en cours de construction
- **Valide** — prêt à être exécuté
- **Invalide** — contient des erreurs de validation` },
          {
            type: 'exercise', exerciseType: 'ordering', id: 'fl-save-ord1',
            title: 'Processus de sauvegarde',
            data: {
              instruction: 'Classez les étapes du processus de sauvegarde.',
              correctOrder: [
                'Cliquer sur Sauvegarder (ou Ctrl+S)',
                'Le système valide le graph',
                'Les erreurs sont stockées si nécessaire',
                'Le statut du flow est mis à jour'
              ]
            } as OrderingData
          }
        ]
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════
  // MODULE 3 — Les formulaires
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'forms',
    title: 'Les formulaires',
    icon: 'form',
    description: 'Créez des formulaires dynamiques pour collecter et traiter des données.',
    lessons: [
      {
        id: 'fo-create',
        title: 'Créer un formulaire',
        estimatedMinutes: 6,
        blocks: [
          { type: 'theory', markdown: `# Créer un formulaire

Les formulaires de Kinn sont des **formulaires dynamiques** qui peuvent servir à :
- Collecter des données utilisateur
- Déclencher des flows
- Configurer des opérations

## Le Form Builder

Le Form Builder est l'éditeur visuel de formulaires. Il offre :

1. **Types de champs** — texte, nombre, email, sélection, checkbox, date, fichier…
2. **Layout en grille** — système de 24 colonnes pour positionner les champs
3. **Sections** — regrouper les champs logiquement
4. **Prévisualisation** — voir le rendu en temps réel

## Ajouter un champ

1. Cliquez sur **Ajouter un champ**
2. Choisissez le type (text, select, date…)
3. Renseignez le label et le key (identifiant unique)
4. Ajustez les options (obligatoire, placeholder, valeur par défaut…)` },
          {
            type: 'exercise', exerciseType: 'quiz', id: 'fo-create-q1',
            title: 'Le Form Builder',
            data: {
              question: 'Quel système est utilisé pour positionner les champs dans le formulaire ?',
              options: [
                'Un système de 12 colonnes',
                'Un système de 24 colonnes',
                'Un positionnement libre (drag & drop)',
                'Un système de flexbox'
              ],
              correctIndex: 1,
              explanation: 'Kinn utilise un système de grille à 24 colonnes (comme Ant Design) pour le layout des formulaires.'
            } as QuizData
          },
          {
            type: 'exercise', exerciseType: 'drag-match', id: 'fo-create-dm1',
            title: 'Types de champs',
            data: {
              instruction: 'Associez chaque type de champ à son usage.',
              pairs: [
                { left: 'text', right: 'Saisie de texte simple' },
                { left: 'select', right: 'Choix dans une liste déroulante' },
                { left: 'checkbox', right: 'Case à cocher (oui/non)' },
                { left: 'date', right: 'Sélection d\'une date' }
              ]
            } as DragMatchData
          }
        ]
      },
      {
        id: 'fo-advanced',
        title: 'Champs avancés',
        estimatedMinutes: 6,
        blocks: [
          { type: 'theory', markdown: `# Champs avancés

Au-delà des champs basiques, Kinn propose des types avancés :

## section_array

Le **section_array** permet de créer des **listes dynamiques**. L'utilisateur peut ajouter/supprimer des lignes, chaque ligne contenant un ensemble de champs.

Cas d'usage : liste de produits, contacts multiples, étapes d'un processus.

## file

Le champ **file** permet d'uploader des fichiers. Il supporte :
- Images (avec prévisualisation)
- Documents (PDF, Word…)
- Tout type de fichier

## tags / text_array

Les **tags** permettent de saisir plusieurs valeurs sous forme de puces. Idéal pour : mots-clés, emails multiples, catégories.

## schema_builder

Le **schema_builder** permet de définir un schéma de données visuellement. Utilisé pour configurer les sorties de certains nœuds avancés.` },
          { type: 'tip', markdown: `Le type **section_array** est très puissant : chaque ligne peut contenir n'importe quel type de champ, y compris d'autres champs avancés.` },
          {
            type: 'exercise', exerciseType: 'fill-blank', id: 'fo-adv-fb1',
            title: 'Champs avancés',
            data: {
              instruction: 'Complétez les phrases.',
              template: 'Pour créer une liste dynamique de lignes, on utilise le type {{BLANK}}. Pour uploader des fichiers, on utilise le type {{BLANK}}.',
              blanks: [
                { answer: 'section_array' },
                { answer: 'file', alternatives: ['fichier'] }
              ]
            } as FillBlankData
          }
        ]
      },
      {
        id: 'fo-visible-if',
        title: 'Logique conditionnelle',
        estimatedMinutes: 5,
        blocks: [
          { type: 'theory', markdown: `# Logique conditionnelle — visibleIf

La propriété **visibleIf** permet d'afficher ou masquer un champ en fonction de la valeur d'un autre champ.

## Syntaxe

\`\`\`
visibleIf: "type === 'email'"
\`\`\`

Le champ n'apparaît que si le champ « type » a la valeur « email ».

## Exemples courants

| visibleIf | Signification |
|-----------|---------------|
| \`method === 'POST'\` | Visible si la méthode est POST |
| \`advanced === true\` | Visible si la case « avancé » est cochée |
| \`count > 0\` | Visible si le compteur est supérieur à 0 |

## Cas d'usage

- Afficher le champ « Body » seulement pour les requêtes POST/PUT
- Afficher les options avancées quand une checkbox est cochée
- Masquer des sections non pertinentes selon le contexte` },
          {
            type: 'exercise', exerciseType: 'quiz', id: 'fo-vis-q1',
            title: 'visibleIf',
            data: {
              question: 'Quelle expression visibleIf affiche un champ uniquement quand « mode » vaut « avancé » ?',
              options: [
                'visibleIf: "mode = avancé"',
                'visibleIf: "mode === \'avancé\'"',
                'visibleIf: "if mode avancé"',
                'visibleIf: "mode == avancé"'
              ],
              correctIndex: 1,
              explanation: 'La syntaxe correcte utilise le triple égal (===) et les guillemets simples échappés autour de la valeur.'
            } as QuizData
          },
          {
            type: 'exercise', exerciseType: 'ordering', id: 'fo-vis-ord1',
            title: 'Logique conditionnelle',
            data: {
              instruction: 'Classez du plus simple au plus complexe.',
              correctOrder: [
                'Afficher un champ toujours (pas de visibleIf)',
                'Afficher si une checkbox est cochée',
                'Afficher selon la valeur d\'un select',
                'Afficher selon une combinaison de conditions'
              ]
            } as OrderingData
          }
        ]
      },
      {
        id: 'fo-public',
        title: 'Formulaires publics',
        estimatedMinutes: 5,
        blocks: [
          { type: 'theory', markdown: `# Formulaires publics

Les formulaires publics permettent de **collecter des données** depuis une URL accessible sans connexion.

## Comment ça marche

1. Créez un flow avec un nœud **start_form**
2. Configurez le formulaire dans les arguments du nœud
3. Le système génère une **URL publique**
4. Partagez cette URL — toute personne peut soumettre le formulaire
5. Chaque soumission **déclenche le flow**

## Cas d'usage

- Formulaire de contact sur un site web
- Demande de devis
- Inscription à un événement
- Collecte de feedback` },
          { type: 'tip', markdown: `L'URL publique d'un formulaire suit le format : \`/public/form/{flowId}/{nodeId}\`. Elle est accessible sans authentification.` },
          {
            type: 'exercise', exerciseType: 'fill-blank', id: 'fo-pub-fb1',
            title: 'Formulaires publics',
            data: {
              instruction: 'Complétez les phrases.',
              template: 'Pour créer un formulaire public, on utilise un nœud de type {{BLANK}}. Chaque soumission du formulaire {{BLANK}} le flow.',
              blanks: [
                { answer: 'start_form' },
                { answer: 'déclenche', alternatives: ['lance', 'exécute'] }
              ]
            } as FillBlankData
          },
          {
            type: 'exercise', exerciseType: 'ordering', id: 'fo-pub-ord1',
            title: 'Créer un formulaire public',
            data: {
              instruction: 'Remettez dans l\'ordre.',
              correctOrder: [
                'Créer un flow',
                'Ajouter un nœud start_form',
                'Configurer les champs du formulaire',
                'Sauvegarder le flow',
                'Partager l\'URL publique'
              ]
            } as OrderingData
          }
        ]
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════
  // MODULE 4 — Expressions et templating
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'expressions',
    title: 'Expressions et templating',
    icon: 'code',
    description: 'Maîtrisez les expressions pour injecter des données dynamiques.',
    lessons: [
      {
        id: 'ex-intro',
        title: 'Introduction aux expressions',
        estimatedMinutes: 6,
        blocks: [
          { type: 'theory', markdown: `# Introduction aux expressions

Les **expressions** sont le mécanisme central de Kinn pour injecter des données dynamiques dans les champs de configuration.

## Syntaxe de base

Les expressions sont entourées de doubles accolades :

\`\`\`
{{ incoming.data.email }}
\`\`\`

Ceci insère la valeur du champ « email » des données entrantes.

## Le contexte

Dans une expression, vous avez accès à :

| Variable | Contenu |
|----------|---------|
| \`incoming\` | Données provenant des nœuds connectés |
| \`incoming.data\` | Objet de données du nœud précédent |
| \`msg\` | Message global du flow (métadonnées) |
| \`env\` | Variables d'environnement |

## Exemples

\`\`\`
Bonjour {{ incoming.data.prenom }} !
L'email est : {{ incoming.data.email }}
Date du jour : {{ now | date }}
\`\`\`` },
          {
            type: 'exercise', exerciseType: 'expression', id: 'ex-intro-exp1',
            title: 'Première expression',
            data: {
              instruction: 'Écrivez une expression qui affiche le nom de famille depuis les données entrantes.\n\nLe contexte contient : `incoming.data.nom` = "Dupont"',
              context: { incoming: { data: { nom: 'Dupont' } } },
              expectedOutput: 'Dupont',
              hint: 'Utilisez {{ incoming.data.nom }}'
            } as ExpressionData
          },
          {
            type: 'exercise', exerciseType: 'fill-blank', id: 'ex-intro-fb1',
            title: 'Syntaxe des expressions',
            data: {
              instruction: 'Complétez les phrases.',
              template: 'Les expressions sont entourées de {{BLANK}} accolades. Pour accéder aux données du nœud précédent, on utilise {{BLANK}}.',
              blanks: [
                { answer: 'doubles', alternatives: ['double', '2'] },
                { answer: 'incoming.data', alternatives: ['incoming'] }
              ]
            } as FillBlankData
          }
        ]
      },
      {
        id: 'ex-filters',
        title: 'Filtres et transformations',
        estimatedMinutes: 6,
        blocks: [
          { type: 'theory', markdown: `# Filtres et transformations

Les **filtres** transforment les données dans une expression. Ils s'appliquent avec le symbole **pipe** (\`|\`) :

\`\`\`
{{ incoming.data.name | upper }}
\`\`\`

## Filtres disponibles

| Filtre | Description | Exemple |
|--------|-------------|---------|
| \`upper\` | Majuscules | \`"hello"\` → \`"HELLO"\` |
| \`lower\` | Minuscules | \`"HELLO"\` → \`"hello"\` |
| \`json\` | Sérialise en JSON | \`{a:1}\` → \`'{"a":1}'\` |
| \`default(val)\` | Valeur par défaut | \`null\` → \`val\` |
| \`first\` | Premier élément | \`[1,2,3]\` → \`1\` |
| \`last\` | Dernier élément | \`[1,2,3]\` → \`3\` |
| \`length\` | Taille | \`[1,2,3]\` → \`3\` |
| \`join(sep)\` | Joindre une liste | \`["a","b"]\` → \`"a, b"\` |
| \`trim\` | Supprimer espaces | \`" hi "\` → \`"hi"\` |

## Enchaîner les filtres

On peut enchaîner plusieurs filtres :

\`\`\`
{{ incoming.data.tags | join(', ') | upper }}
\`\`\`` },
          {
            type: 'exercise', exerciseType: 'expression', id: 'ex-filt-exp1',
            title: 'Utiliser un filtre',
            data: {
              instruction: 'Écrivez une expression qui affiche le nom en majuscules.\n\n`incoming.data.name` = "dupont"',
              context: { incoming: { data: { name: 'dupont' } } },
              expectedOutput: 'DUPONT',
              hint: 'Utilisez le filtre | upper'
            } as ExpressionData
          },
          {
            type: 'exercise', exerciseType: 'fill-blank', id: 'ex-filt-fb1',
            title: 'Les filtres',
            data: {
              instruction: 'Complétez les phrases.',
              template: 'Les filtres s\'appliquent avec le symbole {{BLANK}}. Pour convertir du texte en majuscules, on utilise le filtre {{BLANK}}.',
              blanks: [
                { answer: '|', alternatives: ['pipe', '| (pipe)'] },
                { answer: 'upper' }
              ]
            } as FillBlankData
          }
        ]
      },
      {
        id: 'ex-variables',
        title: 'Variables ($var:name)',
        estimatedMinutes: 5,
        blocks: [
          { type: 'theory', markdown: `# Variables ($var:name)

Les **variables** permettent de définir des schémas de données réutilisables dans vos flows.

## Syntaxe

\`\`\`
$var:nom_client
\`\`\`

## Définition

Les variables sont définies dans les arguments d'un nœud. Elles décrivent la **structure** des données (le schéma), pas les données elles-mêmes.

## Utilisation

Les variables servent principalement à :
1. **Documenter** les données qui circulent dans le flow
2. **Valider** les types attendus
3. **Référencer** un schéma dans plusieurs nœuds sans le dupliquer

## Exemple

Si vous définissez une variable \`$var:contact\` avec le schéma :
\`\`\`json
{ "nom": "string", "email": "string", "telephone": "string" }
\`\`\`

Vous pouvez la référencer dans d'autres nœuds pour indiquer qu'ils produisent ou consomment ce format.` },
          {
            type: 'exercise', exerciseType: 'expression', id: 'ex-var-exp1',
            title: 'Référencer une variable',
            data: {
              instruction: 'Écrivez la syntaxe pour référencer une variable appelée « utilisateur ».',
              context: {},
              expectedOutput: '$var:utilisateur',
              hint: 'Le format est $var: suivi du nom'
            } as ExpressionData
          }
        ]
      },
      {
        id: 'ex-advanced',
        title: 'Expressions avancées',
        estimatedMinutes: 6,
        blocks: [
          { type: 'theory', markdown: `# Expressions avancées

Au-delà des expressions simples, Kinn supporte des **blocs de contrôle** pour du templating plus puissant.

## Conditions

\`\`\`
{% if incoming.data.status === 'active' %}
  Le compte est actif
{% else %}
  Le compte est inactif
{% endif %}
\`\`\`

## Boucles

\`\`\`
{% for item in incoming.data.items %}
  - {{ item.name }} : {{ item.price }}€
{% endfor %}
\`\`\`

## Accès aux données par handle

Quand un nœud a plusieurs connexions entrantes, accédez aux données par handle :

\`\`\`
{{ incoming.byHandle['handle_id'].data.value }}
\`\`\`

## Expressions inline

Pour des calculs simples :

\`\`\`
Total : {{ incoming.data.prix * incoming.data.quantite }}€
\`\`\`` },
          {
            type: 'exercise', exerciseType: 'fill-blank', id: 'ex-adv-fb1',
            title: 'Expressions avancées',
            data: {
              instruction: 'Complétez les blocs de template.',
              template: 'Pour écrire une condition, on utilise {{BLANK}} ... {% endif %}. Pour itérer sur une liste, on utilise {{BLANK}} ... {% endfor %}.',
              blanks: [
                { answer: '{% if ... %}', alternatives: ['{% if %}', '{% if', 'if'] },
                { answer: '{% for ... in ... %}', alternatives: ['{% for %}', '{% for', 'for'] }
              ]
            } as FillBlankData
          },
          {
            type: 'exercise', exerciseType: 'expression', id: 'ex-adv-exp1',
            title: 'Calcul inline',
            data: {
              instruction: 'Écrivez une expression qui calcule le prix total (prix × quantité).\n\n`incoming.data.prix` = 25, `incoming.data.quantite` = 4',
              context: { incoming: { data: { prix: 25, quantite: 4 } } },
              expectedOutput: '100',
              hint: 'Utilisez {{ incoming.data.prix * incoming.data.quantite }}'
            } as ExpressionData
          }
        ]
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════
  // MODULE 5 — Providers et credentials
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'providers',
    title: 'Providers et credentials',
    icon: 'api',
    description: 'Connectez vos applications et gérez les identifiants.',
    lessons: [
      {
        id: 'pr-what',
        title: 'Qu\'est-ce qu\'un provider ?',
        estimatedMinutes: 5,
        blocks: [
          { type: 'theory', markdown: `# Qu'est-ce qu'un provider ?

Un **provider** est un connecteur vers un service externe. Kinn propose plus de **60 providers** pré-configurés.

## Exemples de providers

- **Google** — Gmail, Sheets, Drive, Calendar
- **Slack** — Messages, canaux, réactions
- **Odoo** — Contacts, factures, inventaire
- **HTTP** — Requêtes vers n'importe quelle API
- **Base de données** — MongoDB, PostgreSQL, MySQL

## Ce que contient un provider

Chaque provider fournit :
1. Des **node templates** — les opérations disponibles (ex: « Envoyer un email »)
2. Un type de **credential** — comment s'authentifier (OAuth, API Key…)
3. Une **icône** et un **nom** pour l'identifier dans l'interface

## Le catalogue

Le catalogue est accessible via **Apps / Providers** dans la sidebar. Vous y trouverez tous les providers disponibles, avec la possibilité de filtrer par nom ou catégorie.` },
          {
            type: 'exercise', exerciseType: 'quiz', id: 'pr-what-q1',
            title: 'Les providers',
            data: {
              question: 'Que fournit un provider dans Kinn ?',
              options: [
                'Uniquement une connexion réseau',
                'Des node templates, un type de credential et une icône',
                'Uniquement des credentials',
                'Un serveur dédié'
              ],
              correctIndex: 1,
              explanation: 'Un provider fournit des opérations (node templates), un type de credential pour l\'authentification, et une identité visuelle.'
            } as QuizData
          },
          {
            type: 'exercise', exerciseType: 'drag-match', id: 'pr-what-dm1',
            title: 'Providers et services',
            data: {
              instruction: 'Associez chaque provider à un type d\'opération.',
              pairs: [
                { left: 'Gmail', right: 'Envoyer un email' },
                { left: 'Slack', right: 'Poster un message' },
                { left: 'Google Sheets', right: 'Lire une feuille de calcul' },
                { left: 'HTTP', right: 'Appeler une API externe' }
              ]
            } as DragMatchData
          }
        ]
      },
      {
        id: 'pr-credentials',
        title: 'Configurer des credentials',
        estimatedMinutes: 6,
        blocks: [
          { type: 'theory', markdown: `# Configurer des credentials

Les **credentials** (identifiants) permettent à Kinn de s'authentifier auprès des services externes.

## Types d'authentification

| Type | Description |
|------|-------------|
| **OAuth 2.0** | Connexion via une fenêtre d'autorisation (Google, Slack…) |
| **API Key** | Clé secrète fournie par le service |
| **Basic Auth** | Nom d'utilisateur + mot de passe |
| **Token Bearer** | Jeton d'accès dans le header |

## Créer un credential

1. Allez dans **Credentials** via la sidebar
2. Cliquez sur **Ajouter**
3. Choisissez le **type** (lié au provider)
4. Remplissez les champs requis (clé API, secret, etc.)
5. **Testez** la connexion si disponible
6. Sauvegardez

## Sécurité

Les credentials sont :
- **Chiffrés** en base de données
- **Isolés par workspace** — chaque workspace a ses propres credentials
- **Jamais exposés** dans les logs ou les résultats d'exécution` },
          { type: 'tip', markdown: `Pour OAuth 2.0, le processus est guidé : cliquez sur « Connecter » et une fenêtre d'autorisation s'ouvre. Vous n'avez qu'à accepter.` },
          {
            type: 'exercise', exerciseType: 'ordering', id: 'pr-cred-ord1',
            title: 'Créer un credential',
            data: {
              instruction: 'Remettez dans l\'ordre les étapes de création d\'un credential.',
              correctOrder: [
                'Aller dans la section Credentials',
                'Cliquer sur « Ajouter »',
                'Choisir le type de credential',
                'Remplir les champs requis',
                'Tester la connexion',
                'Sauvegarder'
              ]
            } as OrderingData
          }
        ]
      },
      {
        id: 'pr-templates',
        title: 'Explorer les templates',
        estimatedMinutes: 5,
        blocks: [
          { type: 'theory', markdown: `# Explorer les templates de nœuds

Les **node templates** sont les opérations disponibles pour construire vos flows. Chaque template définit :

## Structure d'un template

- **Nom** — ex: « Créer un contact Odoo »
- **Provider** — le service associé
- **Type** — function, event, condition…
- **Arguments** — le schéma du formulaire de configuration
- **Handles d'entrée/sortie** — les points de connexion

## Filtrer les templates

Dans la section **Templates de nœuds**, vous pouvez :
- **Chercher** par nom
- **Filtrer** par provider
- **Filtrer** par type de nœud

## Comprendre les arguments

Chaque template définit ses propres champs de configuration. Par exemple, « Envoyer un email Gmail » demande :
- Destinataire (obligatoire)
- Sujet
- Corps du message
- Pièces jointes (optionnel)` },
          {
            type: 'exercise', exerciseType: 'drag-match', id: 'pr-tmpl-dm1',
            title: 'Structure d\'un template',
            data: {
              instruction: 'Associez chaque élément d\'un template à sa description.',
              pairs: [
                { left: 'Arguments', right: 'Schéma du formulaire de configuration' },
                { left: 'Handles', right: 'Points de connexion entrée/sortie' },
                { left: 'Provider', right: 'Service associé au template' },
                { left: 'Type', right: 'Catégorie du nœud (function, event…)' }
              ]
            } as DragMatchData
          },
          {
            type: 'exercise', exerciseType: 'quiz', id: 'pr-tmpl-q1',
            title: 'Les templates',
            data: {
              question: 'Où trouve-t-on la liste complète des templates de nœuds ?',
              options: [
                'Dans le dashboard',
                'Dans la section « Templates de nœuds » de la sidebar',
                'Dans les paramètres',
                'Dans la documentation externe'
              ],
              correctIndex: 1,
              explanation: 'La section « Templates de nœuds » dans la sidebar liste tous les templates disponibles avec leurs filtres.'
            } as QuizData
          }
        ]
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════
  // MODULE 6 — Assistant IA
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'ai',
    title: 'Assistant IA',
    icon: 'robot',
    description: 'Utilisez l\'assistant IA pour construire et optimiser vos automatisations.',
    lessons: [
      {
        id: 'ai-discover',
        title: 'Découvrir l\'assistant',
        estimatedMinutes: 5,
        blocks: [
          { type: 'theory', markdown: `# Découvrir l'assistant IA

L'assistant IA de Kinn est un **copilote intelligent** qui vous aide à construire et gérer vos automatisations.

## Deux interfaces

1. **Le panel** — accessible depuis l'icône robot dans le header, il s'ouvre en panneau latéral sur n'importe quelle page
2. **La page complète** — accessible via « Assistant IA » dans la sidebar, interface dédiée avec sidebar de conversations

## Conversations

L'assistant gère des **conversations** (threads). Chaque conversation :
- A un **historique** de messages
- Peut être **liée** à un élément (flow, formulaire)
- Peut être **transférée** vers une nouvelle conversation avec un résumé

## Ce qu'il peut faire

- Répondre à des questions sur Kinn
- Construire des flows étape par étape
- Remplir des formulaires automatiquement
- Suggérer des optimisations` },
          {
            type: 'exercise', exerciseType: 'quiz', id: 'ai-disc-q1',
            title: 'L\'assistant IA',
            data: {
              question: 'Comment accéder au panel IA depuis n\'importe quelle page ?',
              options: [
                'Via la sidebar',
                'Via l\'icône robot dans le header',
                'Via le raccourci Ctrl+I',
                'Via les paramètres'
              ],
              correctIndex: 1,
              explanation: 'Le panel IA est accessible depuis l\'icône robot dans le header, quel que soit la page courante.'
            } as QuizData
          },
          {
            type: 'exercise', exerciseType: 'drag-match', id: 'ai-disc-dm1',
            title: 'Panel vs Page complète',
            data: {
              instruction: 'Associez chaque caractéristique à l\'interface.',
              pairs: [
                { left: 'Panneau latéral', right: 'Panel IA' },
                { left: 'Sidebar de conversations', right: 'Page complète' },
                { left: 'Icône robot du header', right: 'Panel IA' },
                { left: 'Menu sidebar « Assistant IA »', right: 'Page complète' }
              ]
            } as DragMatchData
          }
        ]
      },
      {
        id: 'ai-modes',
        title: 'Les modes',
        estimatedMinutes: 5,
        blocks: [
          { type: 'theory', markdown: `# Les modes de l'assistant

L'assistant fonctionne en **4 modes** selon le contexte :

## 1. Chat

Le mode par défaut. L'assistant répond à vos questions générales sur Kinn, propose des idées et vous guide.

## 2. Workflow

Activé quand vous êtes dans le **Flow Builder**. L'assistant peut :
- Ajouter/modifier des nœuds
- Créer des connexions
- Configurer des arguments
- Expliquer le flow actuel

## 3. Form

Activé dans le **Form Builder**. L'assistant peut :
- Ajouter des champs
- Modifier le layout
- Configurer des règles de validation

## 4. Node Args

Activé quand vous configurez un nœud spécifique. L'assistant peut remplir les champs automatiquement en comprenant votre intention.` },
          {
            type: 'exercise', exerciseType: 'drag-match', id: 'ai-modes-dm1',
            title: 'Les modes',
            data: {
              instruction: 'Associez chaque mode à son contexte d\'activation.',
              pairs: [
                { left: 'Chat', right: 'Mode par défaut, questions générales' },
                { left: 'Workflow', right: 'Dans le Flow Builder' },
                { left: 'Form', right: 'Dans le Form Builder' },
                { left: 'Node Args', right: 'Configuration d\'un nœud' }
              ]
            } as DragMatchData
          }
        ]
      },
      {
        id: 'ai-agents',
        title: 'Agents dynamiques',
        estimatedMinutes: 6,
        blocks: [
          { type: 'theory', markdown: `# Agents dynamiques

L'assistant IA utilise des **agents spécialisés** pour des tâches spécifiques.

## Types d'agents

### Agents système
Générés automatiquement pour chaque **provider**. Par exemple :
- Agent Odoo — connaît toutes les opérations Odoo
- Agent Google — connaît Gmail, Sheets, Drive…

### Agents personnalisés
Créés manuellement avec :
- Un **nom** et une **description**
- Des **providers autorisés** (ex: comptabilité → Odoo + QuickBooks)
- Un niveau d'**autonomie** personnalisé

### Agent général
L'agent par défaut qui a une vue d'ensemble de toutes les fonctionnalités.

## Choisir un agent

Dans la page complète IA, un sélecteur vous permet de choisir l'agent adapté à votre tâche.` },
          {
            type: 'exercise', exerciseType: 'quiz', id: 'ai-agents-q1',
            title: 'Agents dynamiques',
            data: {
              question: 'Comment sont générés les agents système ?',
              options: [
                'Manuellement par l\'administrateur',
                'Automatiquement pour chaque provider',
                'Via une API externe',
                'Par import de fichiers'
              ],
              correctIndex: 1,
              explanation: 'Les agents système sont générés automatiquement pour chaque provider configuré, avec la liste de ses opérations.'
            } as QuizData
          }
        ]
      },
      {
        id: 'ai-autonomy',
        title: 'Niveaux d\'autonomie',
        estimatedMinutes: 5,
        blocks: [
          { type: 'theory', markdown: `# Niveaux d'autonomie

L'assistant IA peut fonctionner avec différents niveaux d'autonomie :

## Prudent
L'assistant **demande confirmation** avant chaque action modifiant le flow ou le formulaire. Idéal pour :
- Les débutants
- Les opérations critiques

## Équilibré (Balanced)
L'assistant effectue les **petites modifications** seul mais demande confirmation pour les changements importants. Un bon compromis.

## Autonome
L'assistant agit **librement** sans demander confirmation. Il effectue les modifications et vous en informe ensuite. Le mode le plus rapide.

## Mémoire

L'assistant dispose de deux types de mémoire :
- **Mémoire globale** — retient vos préférences générales
- **Mémoire de projet** — retient le contexte spécifique à un flow ou formulaire` },
          { type: 'tip', markdown: `Le niveau d'autonomie peut être configuré par agent (dans les paramètres IA) ou par conversation (dans la page complète IA).` },
          {
            type: 'exercise', exerciseType: 'quiz', id: 'ai-auto-q1',
            title: 'Niveaux d\'autonomie',
            data: {
              question: 'Quel niveau d\'autonomie est recommandé pour un débutant ?',
              options: ['Autonome', 'Équilibré', 'Prudent', 'Désactivé'],
              correctIndex: 2,
              explanation: 'Le mode « Prudent » demande confirmation avant chaque action, ce qui permet au débutant de comprendre ce que fait l\'assistant.'
            } as QuizData
          }
        ]
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════
  // MODULE 7 — Déploiement
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'deployment',
    title: 'Déploiement',
    icon: 'cloud-upload',
    description: 'Déployez vos flows en production avec des déclencheurs et du monitoring.',
    lessons: [
      {
        id: 'dp-triggers',
        title: 'Déclencheurs',
        estimatedMinutes: 5,
        blocks: [
          { type: 'theory', markdown: `# Déclencheurs

Un déclencheur définit **quand** et **comment** un flow est lancé.

## Types de déclencheurs

### start
Le nœud **start** est le déclencheur le plus simple. Le flow est lancé :
- Manuellement (bouton « Exécuter »)
- Via l'API
- Par un autre flow

### start_form
Le flow est déclenché par la **soumission d'un formulaire** public ou interne.

### event
Le flow réagit à un **événement externe** :
- Réception d'un webhook
- Déclenchement programmé (cron)
- Événement d'un service connecté

## Choisir le bon déclencheur

| Besoin | Déclencheur |
|--------|-------------|
| Lancer à la demande | start |
| Collecter des données utilisateur | start_form |
| Réagir à un événement externe | event |
| Exécuter périodiquement | event (cron) |` },
          {
            type: 'exercise', exerciseType: 'drag-match', id: 'dp-trig-dm1',
            title: 'Choisir un déclencheur',
            data: {
              instruction: 'Associez chaque besoin au bon type de déclencheur.',
              pairs: [
                { left: 'Lancer manuellement', right: 'start' },
                { left: 'Formulaire de contact', right: 'start_form' },
                { left: 'Réception d\'un webhook', right: 'event' },
                { left: 'Tâche quotidienne', right: 'event (cron)' }
              ]
            } as DragMatchData
          }
        ]
      },
      {
        id: 'dp-webhooks',
        title: 'Webhooks et cron',
        estimatedMinutes: 6,
        blocks: [
          { type: 'theory', markdown: `# Webhooks et cron

## Webhooks

Un **webhook** est une URL qui, lorsqu'elle reçoit une requête HTTP, déclenche votre flow.

Cas d'usage :
- Un service externe notifie Kinn d'un changement
- Un formulaire sur un site tiers envoie des données
- Une application tierce déclenche une automatisation

## Cron (planification)

La syntaxe **cron** permet de planifier des exécutions récurrentes :

\`\`\`
* * * * *
│ │ │ │ │
│ │ │ │ └─ Jour de la semaine (0-7)
│ │ │ └─── Mois (1-12)
│ │ └───── Jour du mois (1-31)
│ └─────── Heure (0-23)
└───────── Minute (0-59)
\`\`\`

## Exemples courants

| Cron | Signification |
|------|--------------|
| \`0 9 * * 1-5\` | Chaque jour ouvré à 9h |
| \`0 */2 * * *\` | Toutes les 2 heures |
| \`0 0 1 * *\` | Le 1er de chaque mois à minuit |
| \`*/15 * * * *\` | Toutes les 15 minutes |` },
          {
            type: 'exercise', exerciseType: 'fill-blank', id: 'dp-cron-fb1',
            title: 'Syntaxe cron',
            data: {
              instruction: 'Complétez les expressions cron.',
              template: 'Pour exécuter un flow tous les jours à 9h, l\'expression cron est {{BLANK}}. Les 5 champs cron représentent : minute, heure, jour du mois, mois et {{BLANK}}.',
              blanks: [
                { answer: '0 9 * * *' },
                { answer: 'jour de la semaine', alternatives: ['jour semaine', 'weekday'] }
              ]
            } as FillBlankData
          },
          {
            type: 'exercise', exerciseType: 'ordering', id: 'dp-cron-ord1',
            title: 'Champs cron',
            data: {
              instruction: 'Remettez les 5 champs cron dans l\'ordre (de gauche à droite).',
              correctOrder: [
                'Minute',
                'Heure',
                'Jour du mois',
                'Mois',
                'Jour de la semaine'
              ]
            } as OrderingData
          }
        ]
      },
      {
        id: 'dp-production',
        title: 'Mettre en production',
        estimatedMinutes: 5,
        blocks: [
          { type: 'theory', markdown: `# Mettre en production

## Statut du flow

Avant de mettre un flow en production, vérifiez son statut :
- **Valide** ✓ — tous les champs obligatoires sont remplis, les templates correspondent
- **Invalide** ✗ — des erreurs de validation empêchent l'exécution

## Checklist de mise en production

1. ✅ Tous les nœuds sont correctement configurés
2. ✅ Les credentials sont en place et testés
3. ✅ Le flow a été simulé avec succès
4. ✅ Le flow a été exécuté en test avec des données réelles
5. ✅ Les erreurs sont gérées (conditions, fallbacks)

## Monitoring

Surveillez vos flows en production via :
- La section **Exécutions** du flow (historique des runs)
- Les **Notifications** (alertes en cas d'erreur)
- Le **dashboard** (vue d'ensemble)

## Notifications

Kinn peut vous notifier en cas de :
- Échec d'une exécution
- Erreur récurrente
- Template modifié (impact sur vos flows)` },
          {
            type: 'exercise', exerciseType: 'ordering', id: 'dp-prod-ord1',
            title: 'Checklist de production',
            data: {
              instruction: 'Classez les étapes de mise en production dans l\'ordre recommandé.',
              correctOrder: [
                'Configurer tous les nœuds',
                'Mettre en place les credentials',
                'Simuler le flow',
                'Tester avec des données réelles',
                'Activer le déclencheur de production'
              ]
            } as OrderingData
          }
        ]
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════
  // MODULE 8 — Fonctionnalités avancées
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'advanced',
    title: 'Fonctionnalités avancées',
    icon: 'experiment',
    description: 'Explorez les fonctionnalités avancées : schémas, sites et plugins.',
    lessons: [
      {
        id: 'ad-schemas',
        title: 'Schémas d\'entrée/sortie',
        estimatedMinutes: 6,
        blocks: [
          { type: 'theory', markdown: `# Schémas d'entrée/sortie

Les schémas permettent de décrire la **structure des données** qui entrent et sortent d'un nœud.

## output_array_field

Le champ **output_array_field** sur un template indique qu'un nœud produit **plusieurs sorties dynamiques**. Par exemple, un nœud « Router » peut diriger les données vers différentes branches selon une valeur.

Fonctionnement :
1. Le template déclare un champ dans ses args qui contient une liste d'options
2. Chaque option génère un **handle de sortie** distinct sur le canvas
3. Le handler retourne \`_output: itemId\` pour indiquer quel handle activer

## output_schema_field

Le champ **output_schema_field** indique qu'un champ du formulaire définit dynamiquement le schéma de sortie.

Exemple : un nœud « Extraction » où l'utilisateur définit les champs à extraire. Le schéma de sortie s'adapte automatiquement au formulaire rempli.

## inputHandles

Les **handles d'entrée** personnalisés permettent à un nœud de recevoir des données de plusieurs sources distinctes, chacune identifiable séparément.` },
          {
            type: 'exercise', exerciseType: 'quiz', id: 'ad-schema-q1',
            title: 'Schémas avancés',
            data: {
              question: 'À quoi sert output_array_field ?',
              options: [
                'À formater la sortie en tableau',
                'À créer plusieurs handles de sortie dynamiques',
                'À valider les données d\'entrée',
                'À limiter le nombre de résultats'
              ],
              correctIndex: 1,
              explanation: 'output_array_field permet de générer des handles de sortie dynamiques à partir d\'une liste d\'options dans les arguments.'
            } as QuizData
          },
          {
            type: 'exercise', exerciseType: 'ordering', id: 'ad-schema-ord1',
            title: 'Multi-output',
            data: {
              instruction: 'Remettez dans l\'ordre le fonctionnement d\'un nœud multi-output.',
              correctOrder: [
                'Le template déclare output_array_field',
                'L\'utilisateur configure les options dans le formulaire',
                'Chaque option génère un handle de sortie',
                'Le handler retourne _output: itemId',
                'L\'engine route vers le bon handle'
              ]
            } as OrderingData
          }
        ]
      },
      {
        id: 'ad-websites',
        title: 'Sites web',
        estimatedMinutes: 5,
        blocks: [
          { type: 'theory', markdown: `# Sites web

Kinn inclut un **éditeur de sites web** intégré pour créer des pages simples liées à vos automatisations.

## L'éditeur

L'éditeur de sites web permet de :
- Créer des **pages** avec un éditeur visuel
- Ajouter des **composants** (texte, images, formulaires…)
- Configurer le **style** (couleurs, polices, layout)

## Cas d'usage

- **Page de formulaire** personnalisée pour collecter des données
- **Dashboard** simple affichant les résultats d'un flow
- **Landing page** pour un projet ou un produit

## Organisation

Les sites sont accessibles via la section **Sites web** dans la sidebar. Chaque site contient :
- Un **nom** et une **description**
- Une ou plusieurs **pages**
- Des **paramètres** globaux (thème, favicon…)` },
          {
            type: 'exercise', exerciseType: 'quiz', id: 'ad-web-q1',
            title: 'Sites web',
            data: {
              question: 'Où accède-t-on à l\'éditeur de sites web ?',
              options: [
                'Via un service externe',
                'Via la section « Sites web » dans la sidebar',
                'Via le dashboard',
                'Via les paramètres'
              ],
              correctIndex: 1,
              explanation: 'Les sites web sont gérés dans la section « Sites web » de la sidebar, avec un éditeur intégré.'
            } as QuizData
          }
        ]
      },
      {
        id: 'ad-plugins',
        title: 'Apps et plugins',
        estimatedMinutes: 6,
        blocks: [
          { type: 'theory', markdown: `# Apps et plugins

Le système de plugins permet d'**étendre** les capacités de Kinn avec de nouvelles opérations.

## Structure d'un plugin

Un plugin est un dossier contenant :
- **manifest.json** — décrit le provider, les node templates et les credentials
- **functions/*.js** — les handlers JavaScript pour chaque opération

## Le manifest

Le manifest définit :
\`\`\`json
{
  "provider": { "name": "Mon Service", "icon": "api" },
  "credentials": { "fields": [...] },
  "nodes": [
    {
      "key": "create_item",
      "title": "Créer un élément",
      "type": "function",
      "args": [...]
    }
  ]
}
\`\`\`

## Le handler

Chaque opération a un handler JavaScript :
\`\`\`javascript
async function create_item(node, msg, inputs, opts) {
  const creds = opts.credentials;
  // ... logique métier
  return { ok: true, data: result };
}
\`\`\`

## Import

Les plugins sont importés via la variable d'environnement \`PLUGIN_IMPORT_ENABLED=1\` au démarrage du serveur.` },
          {
            type: 'exercise', exerciseType: 'ordering', id: 'ad-plug-ord1',
            title: 'Créer un plugin',
            data: {
              instruction: 'Remettez dans l\'ordre les étapes pour créer un plugin.',
              correctOrder: [
                'Créer le dossier du plugin',
                'Écrire le manifest.json',
                'Implémenter les handlers JavaScript',
                'Activer PLUGIN_IMPORT_ENABLED=1',
                'Redémarrer le serveur pour importer'
              ]
            } as OrderingData
          },
          {
            type: 'exercise', exerciseType: 'quiz', id: 'ad-plug-q1',
            title: 'Plugins',
            data: {
              question: 'Quel fichier décrit la structure d\'un plugin (provider, nodes, credentials) ?',
              options: ['package.json', 'manifest.json', 'config.json', 'plugin.json'],
              correctIndex: 1,
              explanation: 'Le fichier manifest.json est le descripteur central d\'un plugin, définissant le provider, les templates et les credentials.'
            } as QuizData
          }
        ]
      }
    ]
  }
];
