// Casting des agents — nom, emoji, couleur, biographie courte par type de subagent.
// Zéro impact fonctionnel : les types (research, general, ...) restent les clés
// internes. Le roster ajoute juste une couche cosmétique affichée dans l'UI.

const ROSTER = {
  research: {
    name: 'Tim',
    emoji: '🌐',
    color: '#1890ff',
    tagline: 'explore le web',
    figure: 'Tim Berners-Lee',
    years: '1955 – ',
    field: 'Informatique · Web',
    bio: 'Inventeur du World Wide Web au CERN en 1989. A donné le web au monde gratuitement. Tim part fouiller internet pour trouver des sources fiables et les synthétiser.',
  },
  file_analyzer: {
    name: 'Ada',
    emoji: '📊',
    color: '#13c2c2',
    tagline: 'décode tes données',
    figure: 'Ada Lovelace',
    years: '1815 – 1852',
    field: 'Mathématiques · Programmation',
    bio: "Comtesse et mathématicienne, elle rédige en 1843 le premier algorithme destiné à être exécuté par une machine. Considérée comme la première programmeuse de l'histoire. Ada analyse tes fichiers et en extrait la structure.",
  },
  doc_writer: {
    name: 'Donald',
    emoji: '✒️',
    color: '#722ed1',
    tagline: 'rédige tes documents',
    figure: 'Donald Knuth',
    years: '1938 – ',
    field: 'Informatique · Typographie',
    bio: "Auteur de The Art of Computer Programming et créateur du système de composition typographique TeX. Obsédé par la beauté du texte imprimé. Donald soigne chaque ligne de tes livrables.",
  },
  general: {
    name: 'Denis',
    emoji: '📚',
    color: '#e61982',
    tagline: 'synthétise tout',
    figure: 'Denis Diderot',
    years: '1713 – 1784',
    field: 'Philosophie · Encyclopédie',
    bio: "Philosophe des Lumières, co-directeur de l'Encyclopédie (28 volumes, 20 ans). A voulu rassembler tout le savoir humain en un seul ouvrage. Denis consolide les travaux des autres agents en livrables cohérents.",
  },
  memory_extractor: {
    name: 'Van',
    emoji: '🧠',
    color: '#fa8c16',
    tagline: 'archive ta mémoire',
    figure: 'Vannevar Bush',
    years: '1890 – 1974',
    field: 'Ingénierie · Systèmes documentaires',
    bio: "Ingénieur et visionnaire américain, concepteur en 1945 du Memex — une machine imaginaire qui stocke et relie tous les documents d'une vie. Précurseur de l'hypertexte. Van capte les faits importants de tes conversations.",
  },
  project_doc_writer: {
    name: 'Hypatie',
    emoji: '🏛️',
    color: '#52c41a',
    tagline: 'garde le savoir du projet',
    figure: "Hypatie d'Alexandrie",
    years: '~355 – 415',
    field: 'Mathématiques · Astronomie',
    bio: "Mathématicienne, astronome et philosophe néoplatonicienne, dernière grande savante de la bibliothèque d'Alexandrie. Figure symbolique de la transmission du savoir. Hypatie tient la mémoire vivante de ton projet.",
  },
  code_runner: {
    name: 'Alan',
    emoji: '⚙️',
    color: '#2f54eb',
    tagline: 'exécute ton code',
    figure: 'Alan Turing',
    years: '1912 – 1954',
    field: 'Informatique · Logique',
    bio: "Père de l'informatique théorique, inventeur de la machine universelle (1936) qui définit ce qu'est un ordinateur. A aussi brisé Enigma pendant la guerre. Alan exécute ton code Python/JS dans la sandbox.",
  },
  logician: {
    name: 'René',
    emoji: '🧩',
    color: '#595959',
    tagline: 'raisonne avec méthode',
    figure: 'René Descartes',
    years: '1596 – 1650',
    field: 'Philosophie · Mathématiques',
    bio: "Philosophe, mathématicien et physicien français. Auteur du Discours de la méthode (1637) et inventeur de la géométrie analytique. Cogito ergo sum. René vérifie la cohérence logique de tes plans et décisions.",
  },
  security_auditor: {
    name: 'Claude',
    emoji: '🔒',
    color: '#434343',
    tagline: 'audite la sécurité',
    figure: 'Claude Shannon',
    years: '1916 – 2001',
    field: 'Mathématiques · Cryptographie',
    bio: "Père de la théorie de l'information (1948) et fondateur de la cryptographie moderne. A posé les bases mathématiques de toute la communication numérique. Claude traque les vulnérabilités dans ton code et tes configs.",
  },
  vision_analyst: {
    name: 'Hedy',
    emoji: '👁️',
    color: '#eb2f96',
    tagline: 'comprend les images',
    figure: 'Hedy Lamarr',
    years: '1914 – 2000',
    field: 'Ingénierie · Télécommunications',
    bio: "Actrice hollywoodienne et inventrice autrichienne. Co-invente en 1942 le spread-spectrum, technologie qui rend possibles le Wi-Fi, le Bluetooth et le GPS. Hedy lit et interprète les images, schémas et PDFs visuels.",
  },
  voice_handler: {
    name: 'Graham',
    emoji: '🎤',
    color: '#d46b08',
    tagline: 'transcrit et parle',
    figure: 'Alexander Graham Bell',
    years: '1847 – 1922',
    field: 'Invention · Télécommunications',
    bio: "Inventeur du téléphone (1876), a consacré sa vie à la transmission de la parole humaine. A aussi travaillé sur l'éducation des sourds. Graham transcrit les fichiers audio et synthétise la voix.",
  },
  data_scientist: {
    name: 'Marie',
    emoji: '🔬',
    color: '#cf1322',
    tagline: 'analyse tes chiffres',
    figure: 'Marie Curie',
    years: '1867 – 1934',
    field: 'Physique · Chimie',
    bio: "Physicienne et chimiste franco-polonaise. Double prix Nobel (physique 1903, chimie 1911), seule personne distinguée dans deux sciences différentes. Pionnière de la radioactivité. Marie fait parler tes chiffres par l'analyse statistique.",
  },
  dataviz: {
    name: 'Florence',
    emoji: '📈',
    color: '#ff70a6',
    tagline: 'visualise tes données',
    figure: 'Florence Nightingale',
    years: '1820 – 1910',
    field: 'Statistiques · Santé publique',
    bio: "Infirmière et statisticienne britannique. Invente en 1858 le diagramme polaire (rose des vents) pour prouver au Parlement que plus de soldats mouraient de maladies que de blessures. Pionnière de la dataviz qui sauve des vies. Florence transforme tes chiffres en graphiques parlants.",
  },
  automation_architect: {
    name: 'Isaac',
    emoji: '🤖',
    color: '#531dab',
    tagline: 'orchestre les agents',
    figure: 'Isaac Asimov',
    years: '1920 – 1992',
    field: 'Littérature · Science-fiction',
    bio: "Écrivain de science-fiction, auteur prolifique (500+ livres). Invente les Trois Lois de la Robotique (1942) qui inspirent l'éthique des IA d'aujourd'hui. Visionnaire des sociétés de robots. Isaac conçoit des pipelines multi-agents complexes.",
  },
  math_proof: {
    name: 'Kurt',
    emoji: '∑',
    color: '#1d39c4',
    tagline: 'prouve les théorèmes',
    figure: 'Kurt Gödel',
    years: '1906 – 1978',
    field: 'Logique mathématique',
    bio: "Logicien austro-hongrois puis américain. Ses théorèmes d'incomplétude (1931) démontrent qu'il existe en mathématiques des vérités qu'on ne peut prouver. Ami d'Einstein à Princeton. Kurt manipule sympy, z3 et formalise tes démonstrations.",
  },
  expert_system: {
    name: 'Marvin',
    emoji: '🧭',
    color: '#7e57c2',
    tagline: 'raisonne sur les règles',
    figure: 'Marvin Minsky',
    years: '1927 – 2016',
    field: 'Intelligence artificielle',
    bio: "Co-fondateur du laboratoire d'IA du MIT (1959), auteur de The Society of Mind (1986) qui décrit l'intelligence comme une société d'agents simples coopérant. Pionnier des réseaux de neurones. Marvin construit et interroge ton graphe de connaissances projet.",
  },
};

function getAgent(type) {
  if (!type) return null;
  return ROSTER[String(type).trim()] || null;
}

function listAgents() {
  return Object.entries(ROSTER).map(([type, info]) => ({ type, ...info }));
}

/**
 * Enrichit un objet (event, task, rapport) avec les champs agent* du roster.
 * Non destructif : si le type n'existe pas, renvoie l'objet tel quel.
 */
function enrichWithAgent(obj, subagentType) {
  const info = getAgent(subagentType);
  if (!obj || !info) return obj;
  return {
    ...obj,
    agentName: info.name,
    agentEmoji: info.emoji,
    agentColor: info.color,
    agentTagline: info.tagline,
    agentFigure: info.figure,
  };
}

module.exports = { ROSTER, getAgent, listAgents, enrichWithAgent };
