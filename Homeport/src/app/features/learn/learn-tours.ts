// ─── Tour Definitions ────────────────────────────────────────────

export interface TourStepAction {
  /** Type of action the user must perform */
  type: 'click' | 'navigate' | 'dom';
  /** click: CSS selector of the element to click (defaults to step element) */
  clickTarget?: string;
  /** navigate: substring to detect in the URL */
  urlMatch?: string;
  /** dom: CSS selector to wait for in the DOM */
  domSelector?: string;
  /** Safety timeout in ms (default 60s) */
  timeout?: number;
  /** Hint text displayed in a yellow box */
  hint?: string;
}

export interface TourStep {
  /** CSS selector or lazy function returning the element to spotlight */
  element: string | (() => Element | null);
  /** Popover title */
  title: string;
  /** Popover description (supports HTML) */
  description: string;
  /** Popover position relative to element */
  side?: 'top' | 'bottom' | 'left' | 'right';
  /** Skip this step if element not found in DOM */
  optional?: boolean;
  /** Interactive action the user must perform before advancing */
  action?: TourStepAction;
  /** Delay (ms) before displaying this step (e.g. after navigation) */
  preDelay?: number;
}

export interface TourDefinition {
  id: string;
  title: string;
  description: string;
  /** Route to navigate to before starting (null = stay on current page) */
  targetRoute: string | null;
  /** Delay (ms) after navigation before starting the tour */
  navigationDelay: number;
  /** Module this tour belongs to */
  module: string;
  steps: TourStep[];
}

// ═══════════════════════════════════════════════════════════════════
// Tour 1 — Découvrir l'interface
// ═══════════════════════════════════════════════════════════════════
const tourInterface: TourDefinition = {
  id: 'tour-interface',
  title: 'Découvrir l\'interface',
  description: 'Faites le tour de l\'interface principale de Kinn.',
  targetRoute: null,
  navigationDelay: 300,
  module: 'getting-started',
  steps: [
    {
      element: 'nz-sider',
      title: 'La sidebar',
      description: 'Votre menu de navigation principal. Accédez à toutes les sections de Kinn depuis ici : flows, formulaires, credentials, IA…',
      side: 'right',
    },
    {
      element: '.logo',
      title: 'Le logo Kinn',
      description: 'Cliquez sur le logo pour revenir au dashboard à tout moment.',
      side: 'right',
      optional: true,
    },
    {
      element: 'ul[nz-menu]',
      title: 'Le menu de navigation',
      description: 'Chaque entrée correspond à une section de la plateforme. L\'élément actif est mis en surbrillance.',
      side: 'right',
    },
    {
      element: '.hp-header',
      title: 'Le header',
      description: 'Le header contient la recherche et les actions rapides.',
      side: 'bottom',
    },
    {
      element: '.cmd-search',
      title: 'La recherche',
      description: 'Trouvez rapidement vos flows et formulaires en tapant quelques lettres.',
      side: 'bottom',
      optional: true,
    },
    {
      element: '.ai-btn',
      title: 'L\'assistant IA',
      description: 'Ouvrez le panneau IA pour poser des questions ou demander de l\'aide pour construire vos automatisations.',
      side: 'bottom',
      optional: true,
    },
    {
      element: '.hdr-actions',
      title: 'Actions rapides',
      description: 'Notifications, paramètres et gestion de votre profil.',
      side: 'bottom',
      optional: true,
    },
    {
      element: 'nz-content',
      title: 'La zone de contenu',
      description: 'C\'est ici que s\'affiche le contenu de la page active : dashboard, éditeur de flow, formulaires…',
      side: 'top',
    },
    {
      element: 'nz-sider .ant-menu-item:first-child',
      title: 'C\'est parti !',
      description: 'Vous connaissez maintenant l\'interface. Explorez les autres visites guidées pour découvrir chaque section en détail.',
      side: 'right',
      optional: true,
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════
// Tour 2 — La liste des flows
// ═══════════════════════════════════════════════════════════════════
const tourFlowList: TourDefinition = {
  id: 'tour-flow-list',
  title: 'La liste des flows',
  description: 'Découvrez la page de gestion de vos workflows.',
  targetRoute: '/flows',
  navigationDelay: 600,
  module: 'flows',
  steps: [
    {
      element: '.list-page',
      title: 'La page des flows',
      description: 'Cette page liste tous vos workflows. Vous pouvez les rechercher, filtrer et organiser.',
      side: 'bottom',
    },
    {
      element: '.page-header',
      title: 'L\'en-tête de page',
      description: 'Titre de la section, barre de recherche et bouton de création.',
      side: 'bottom',
      optional: true,
    },
    {
      element: '.page-header .ant-btn-primary',
      title: 'Créer un flow',
      description: 'Cliquez ici pour créer un nouveau workflow. Un dialogue vous demandera le nom et la description.',
      side: 'bottom',
      optional: true,
    },
    {
      element: '.list-page .grid',
      title: 'La grille des flows',
      description: 'Vos flows s\'affichent ici sous forme de cartes. Cliquez sur une carte pour ouvrir l\'éditeur.',
      side: 'top',
      optional: true,
    },
    {
      element: '.list-page .grid .ant-card:first-child',
      title: 'Une carte de flow',
      description: 'Chaque carte affiche le nom, la description, le statut et la date de dernière modification du flow.',
      side: 'right',
      optional: true,
    },
    {
      element: '.list-page',
      title: 'À vous de jouer !',
      description: 'Créez votre premier flow ou ouvrez-en un existant pour découvrir le Flow Builder.',
      side: 'top',
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════
// Tour 3 — Le Flow Builder
// ═══════════════════════════════════════════════════════════════════
const tourFlowBuilder: TourDefinition = {
  id: 'tour-flow-builder',
  title: 'Le Flow Builder',
  description: 'Explorez l\'éditeur visuel de workflows.',
  targetRoute: '/flows',
  navigationDelay: 600,
  module: 'flows',
  steps: [
    {
      element: '.grid',
      title: 'Vos flows',
      description: 'Voici la liste de vos workflows. Cliquez sur un flow pour ouvrir l\'éditeur visuel.',
      side: 'bottom',
      optional: true,
    },
    {
      element: '.grid .ant-card:first-child',
      title: 'Ouvrez un flow',
      description: 'Cliquez sur un flow pour entrer dans le Flow Builder.',
      side: 'right',
      optional: true,
      action: {
        type: 'navigate',
        urlMatch: '/flow-builder',
        timeout: 120000,
        hint: 'Cliquez sur un flow pour continuer',
      },
    },
    {
      element: () => document.querySelector('.canvas-host'),
      title: 'Le canvas',
      description: 'Votre espace de travail visuel. Glissez, zoomez et connectez vos nœuds ici.',
      side: 'left',
      optional: true,
      preDelay: 1000,
    },
    {
      element: () => document.querySelector('.left-bar'),
      title: 'La barre latérale',
      description: 'Accès rapide aux paramètres du flow, à la palette de nœuds et aux options d\'affichage.',
      side: 'right',
      optional: true,
    },
    {
      element: () => document.querySelector('.left-panel'),
      title: 'Le panneau gauche',
      description: 'Affiche les détails du nœud sélectionné : configuration, arguments et informations.',
      side: 'right',
      optional: true,
    },
    {
      element: () => document.querySelector('.right-panel'),
      title: 'Le panneau droit',
      description: 'Panneau d\'inspection et de configuration avancée du nœud sélectionné.',
      side: 'left',
      optional: true,
    },
    {
      element: () => document.querySelector('.bottom-bar'),
      title: 'La barre d\'outils',
      description: 'Zoom, minimap et outils de canvas. Contrôlez la vue de votre flow.',
      side: 'top',
      optional: true,
    },
    {
      element: () => document.querySelector('.run-btn'),
      title: 'Exécuter',
      description: 'Lance l\'exécution réelle du flow. Chaque nœud sera traité séquentiellement.',
      side: 'top',
      optional: true,
    },
    {
      element: () => document.querySelector('.deploy-btn'),
      title: 'Déployer',
      description: 'Sauvegardez et déployez votre flow pour qu\'il soit prêt à être déclenché automatiquement.',
      side: 'top',
      optional: true,
    },
    {
      element: () => document.querySelector('.panel-toggle-fab.ai-chat-fab'),
      title: 'L\'assistant IA',
      description: 'Ouvrez le panneau IA pour demander de l\'aide ou générer des nœuds automatiquement.',
      side: 'left',
      optional: true,
    },
    {
      element: () => document.querySelector('.canvas-host'),
      title: 'Prêt à construire !',
      description: 'Ajoutez des nœuds depuis la palette, connectez-les et configurez chaque étape de votre automatisation.',
      side: 'bottom',
      optional: true,
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════
// Tour 4 — Le Form Builder
// ═══════════════════════════════════════════════════════════════════
const tourFormBuilder: TourDefinition = {
  id: 'tour-form-builder',
  title: 'Le Form Builder',
  description: 'Découvrez l\'éditeur de formulaires dynamiques.',
  targetRoute: '/forms',
  navigationDelay: 600,
  module: 'forms',
  steps: [
    {
      element: '.grid',
      title: 'Vos formulaires',
      description: 'Voici la liste de vos formulaires. Cliquez sur un formulaire pour ouvrir l\'éditeur.',
      side: 'bottom',
      optional: true,
    },
    {
      element: '.grid .ant-card:first-child',
      title: 'Ouvrez un formulaire',
      description: 'Cliquez sur un formulaire pour entrer dans le Form Builder.',
      side: 'right',
      optional: true,
      action: {
        type: 'navigate',
        urlMatch: '/dynamic-form',
        timeout: 120000,
        hint: 'Cliquez sur un formulaire pour continuer',
      },
    },
    {
      element: () => document.querySelector('.builder'),
      title: 'L\'éditeur',
      description: 'Le Form Builder vous permet de créer des formulaires dynamiques avec un éditeur visuel.',
      side: 'bottom',
      optional: true,
      preDelay: 800,
    },
    {
      element: () => document.querySelector('.builder > .left'),
      title: 'La palette de champs',
      description: 'Tous les types de champs disponibles : texte, nombre, email, sélection, checkbox, date…',
      side: 'right',
      optional: true,
    },
    {
      element: () => document.querySelector('.actions-grid'),
      title: 'Les types de champs',
      description: 'Cliquez sur un type pour l\'ajouter au formulaire. Les champs sont organisés par catégorie.',
      side: 'right',
      optional: true,
    },
    {
      element: () => document.querySelector('.builder > .center'),
      title: 'La zone de prévisualisation',
      description: 'Votre formulaire prend forme ici en temps réel. Glissez les champs pour les réorganiser.',
      side: 'left',
      optional: true,
    },
    {
      element: () => document.querySelector('.preview-frame'),
      title: 'L\'aperçu',
      description: 'Visualisez le rendu final tel que vos utilisateurs le verront.',
      side: 'left',
      optional: true,
    },
    {
      element: () => document.querySelector('.builder > .right'),
      title: 'La configuration du champ',
      description: 'Sélectionnez un champ pour configurer ses propriétés : label, placeholder, validation, visibleIf…',
      side: 'left',
      optional: true,
    },
    {
      element: () => document.querySelector('.history-bar'),
      title: 'L\'historique',
      description: 'Annulez et rétablissez vos modifications avec l\'historique intégré.',
      side: 'top',
      optional: true,
    },
    {
      element: () => document.querySelector('.builder'),
      title: 'À vous de créer !',
      description: 'Ajoutez des champs, configurez-les et prévisualisez votre formulaire en temps réel.',
      side: 'top',
      optional: true,
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════
// Tour 5 — L'assistant IA
// ═══════════════════════════════════════════════════════════════════
const tourAi: TourDefinition = {
  id: 'tour-ai',
  title: 'L\'assistant IA',
  description: 'Découvrez votre copilote intelligent.',
  targetRoute: '/ai',
  navigationDelay: 600,
  module: 'ai',
  steps: [
    {
      element: 'ai-fullpage',
      title: 'La page IA',
      description: 'L\'interface complète de l\'assistant IA avec sidebar de conversations et zone de chat.',
      side: 'bottom',
      optional: true,
    },
    {
      element: '.fp-sidebar',
      title: 'Vos conversations',
      description: 'Toutes vos conversations sont listées ici. Créez-en une nouvelle ou reprenez une ancienne.',
      side: 'right',
      optional: true,
    },
    {
      element: '.sidebar-agent-select',
      title: 'Choix de l\'agent',
      description: 'Sélectionnez un agent spécialisé (Odoo, Google…) ou gardez l\'agent général pour des questions variées.',
      side: 'bottom',
      optional: true,
    },
    {
      element: '.new-thread-btn',
      title: 'Créer une conversation',
      description: 'Commencez une nouvelle conversation avec l\'assistant IA.',
      side: 'right',
      optional: true,
      action: {
        type: 'click',
        timeout: 60000,
        hint: 'Cliquez sur le bouton pour créer une conversation',
      },
    },
    {
      element: () => document.querySelector('.fp-chat'),
      title: 'La zone de chat',
      description: 'Posez vos questions, demandez de l\'aide pour construire des flows ou remplir des formulaires.',
      side: 'left',
      optional: true,
      preDelay: 500,
      action: {
        type: 'dom',
        domSelector: '.input-bar',
        timeout: 10000,
      },
    },
    {
      element: () => document.querySelector('.input-bar'),
      title: 'Zone de saisie',
      description: 'Tapez votre message ici. L\'assistant comprend le français et le contexte de votre projet.',
      side: 'top',
      optional: true,
    },
    {
      element: () => document.querySelector('.chat-send-btn'),
      title: 'Envoyer',
      description: 'Envoyez votre message à l\'assistant IA.',
      side: 'top',
      optional: true,
      action: {
        type: 'click',
        timeout: 60000,
        hint: 'Envoyez un message pour continuer',
      },
    },
    {
      element: () => document.querySelector('.messages'),
      title: 'Les messages',
      description: 'Attendez la réponse de l\'assistant IA. Il analyse votre contexte pour vous donner la meilleure aide possible.',
      side: 'left',
      optional: true,
      action: {
        type: 'dom',
        domSelector: '.ai-msg',
        timeout: 15000,
      },
    },
    {
      element: () => document.querySelector('.fp-chat-header'),
      title: 'En-tête de conversation',
      description: 'Le titre de la conversation et les options de configuration.',
      side: 'bottom',
      optional: true,
    },
    {
      element: '.sidebar-bottom',
      title: 'Paramètres',
      description: 'Accédez aux paramètres de l\'assistant IA : choix du modèle, niveau d\'autonomie…',
      side: 'top',
      optional: true,
    },
    {
      element: 'ai-fullpage',
      title: 'Votre copilote est prêt !',
      description: 'Essayez de lui demander : « Crée-moi un flow qui envoie un email de bienvenue ».',
      side: 'top',
      optional: true,
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════
// Tour 6 — Les credentials
// ═══════════════════════════════════════════════════════════════════
const tourCredentials: TourDefinition = {
  id: 'tour-credentials',
  title: 'Les credentials',
  description: 'Gérez vos identifiants de connexion aux services externes.',
  targetRoute: '/credentials',
  navigationDelay: 600,
  module: 'providers',
  steps: [
    {
      element: '.list-page',
      title: 'La page des credentials',
      description: 'Cette page liste tous vos identifiants de connexion, organisés par type de service.',
      side: 'bottom',
    },
    {
      element: '.page-header',
      title: 'L\'en-tête',
      description: 'Recherchez un credential existant ou créez-en un nouveau.',
      side: 'bottom',
      optional: true,
    },
    {
      element: '.page-header .ant-btn-primary',
      title: 'Ajouter un credential',
      description: 'Cliquez ici pour ajouter un nouvel identifiant. Choisissez le type (OAuth, API Key…) puis remplissez les champs requis.',
      side: 'bottom',
      optional: true,
    },
    {
      element: '.list-page .grid',
      title: 'Vos credentials',
      description: 'Chaque carte représente un identifiant. Les credentials sont chiffrés et isolés par workspace.',
      side: 'top',
      optional: true,
    },
    {
      element: '.list-page',
      title: 'Sécurité assurée',
      description: 'Vos credentials sont chiffrés en base de données et jamais exposés dans les logs. Ajoutez vos premiers identifiants pour connecter vos services.',
      side: 'top',
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════════════════════════

export const TOURS: TourDefinition[] = [
  tourInterface,
  tourFlowList,
  tourFlowBuilder,
  tourFormBuilder,
  tourAi,
  tourCredentials,
];

export function getTourById(id: string): TourDefinition | undefined {
  return TOURS.find(t => t.id === id);
}
