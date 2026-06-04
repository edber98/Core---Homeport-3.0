const { toSnake, titleCase } = require('./bulk-utils');

const SEGMENT_LABELS = {
  id: 'Identifiant',
  email: 'E-mail',
  firstname: 'Prénom',
  lastname: 'Nom',
  phone: 'Téléphone',
  status: 'Statut',
  stage: 'Étape',
  title: 'Titre',
  description: 'Description',
  note: 'Note',
  body: 'Contenu',
  html: 'HTML',
  text: 'Texte',
  value: 'Valeur',
  fieldvalue: 'Valeur',
  fieldcurrency: 'Devise',
  currency: 'Devise',
  fieldlabel: 'Libellé du champ',
  fieldtype: 'Type de champ',
  fieldoptions: 'Options du champ',
  fielddefault: 'Valeur par défaut',
  fielddefaultcurrency: 'Devise par défaut',
  customfieldid: 'Identifiant du champ personnalisé',
  customeraccountid: 'Identifiant du compte client',
  schemaid: 'Identifiant du schéma',
  fieldid: 'Identifiant du champ',
  fieldrelid: 'Identifiant de la relation de champ',
  ecomorderid: 'Identifiant de la commande e-commerce',
  dealid: 'Identifiant de l’opportunité',
  contact: 'Contact',
  contactid: 'Identifiant du contact',
  contacts: 'Contacts',
  account: 'Compte',
  accounturl: 'URL du compte',
  orgid: 'Identifiant du compte',
  group: 'Groupe',
  groupid: 'Identifiant du groupe',
  group_id: 'Identifiant du groupe',
  groups: 'Groupes',
  user: 'Utilisateur',
  users: 'Utilisateurs',
  userid: 'Identifiant utilisateur',
  owner: 'Propriétaire',
  list: 'Liste',
  listid: 'Identifiant de la liste',
  automation: 'Automatisation',
  automationid: 'Identifiant de l’automatisation',
  sourceid: 'Identifiant source',
  tag: 'Tag',
  tagtype: 'Type de tag',
  event: 'Événement',
  eventdata: 'Données de l’événement',
  eventname: 'Nom de l’événement',
  enabled: 'Activé',
  disabled: 'Désactivé',
  key: 'Clé',
  actid: 'Identifiant du compte ActiveCampaign',
  visit: 'Identifiant de visite',
  global: 'Globale',
  company_name: 'Nom de l’entreprise',
  address_1: 'Adresse ligne 1',
  address_2: 'Adresse ligne 2',
  city: 'Ville',
  state: 'État ou région',
  zip: 'Code postal',
  district: 'Quartier',
  country: 'Pays',
  allgroup: 'Tous les groupes',
  allgroups: 'Tous les groupes',
  allusers: 'Tous les utilisateurs',
  autoassign: 'Attribution automatique',
  is_default: 'Par défaut',
  isformvisible: 'Visible dans le formulaire',
  displayorder: 'Ordre d’affichage',
  sitename: 'Nom du site',
  sitelogo: 'Logo du site',
  sitelogosmall: 'Petit logo du site',
  headertextvalue: 'Texte d’en-tête',
  headerhtmlvalue: 'HTML d’en-tête',
  footertextvalue: 'Texte de pied de page',
  footerhtmlvalue: 'HTML de pied de page',
  copyright: 'Copyright',
  version: 'Version',
  license: 'Licence',
  links: 'Liens',
  help: 'Aide',
  favicon: 'Favicon',
  admintemplatehtm: 'Template admin HTML',
  admintemplatecss: 'Template admin CSS',
  publictemplatehtm: 'Template public HTML',
  publictemplatecss: 'Template public CSS',
  service: 'Service',
  externalid: 'Identifiant externe',
  externalcheckoutid: 'Identifiant externe du panier',
  externalcreateddate: 'Date de création externe',
  externalupdateddate: 'Date de mise à jour externe',
  logourl: 'URL du logo',
  linkurl: 'URL du lien',
  name: 'Nom',
  deleted: 'Supprimé',
  fieldvalues: 'Valeurs de champs',
  field: 'Champ',
  role: 'Rôle',
  source: 'Source',
  orderproducts: 'Produit',
  orderdiscounts: 'Remise',
  category: 'Catégorie',
  producturl: 'URL du produit',
  imageurl: 'URL de l’image',
  sku: 'Référence SKU',
  quantity: 'Quantité',
  price: 'Prix',
  totalprice: 'Montant total',
  shippingamount: 'Montant de livraison',
  taxamount: 'Montant de taxe',
  discountamount: 'Montant de remise',
  connectionid: 'Identifiant de la connexion',
  customerid: 'Identifiant du client',
  orderurl: 'URL de la commande',
  abandoneddate: 'Date d’abandon',
  shippingmethod: 'Mode de livraison',
  ordernumber: 'Numéro de commande',
  acceptsmarketing: 'Accepte le marketing',
  notification: 'Notification',
  ownertype: 'Type de propriétaire',
  rel_id: 'Identifiant lié',
  relid: 'Identifiant lié',
  reltype: 'Type de liaison',
  duedate: 'Date d’échéance',
  dealtasktype: 'Type de tâche',
  dealtask: 'Tâche d’opportunité',
  deals: 'Opportunités',
  assignee: 'Assigné à',
  triggerautomationoncreate: 'Déclencher l’automatisation à la création',
  doneautomation: 'Automatisation de clôture',
  outcomeid: 'Identifiant du résultat',
  outcomeinfo: 'Détail du résultat',
  sentiment: 'Sentiment',
  interval: 'Intervalle',
  fromname: 'Nom de l’expéditeur',
  fromemail: 'E-mail de l’expéditeur',
  reply2: 'E-mail de réponse',
  subject: 'Sujet',
  preheader_text: 'Pré-en-tête',
  stringid: 'Identifiant texte',
  sender_url: 'URL de l’expéditeur',
  sender_reminder: 'Rappel expéditeur',
  send_last_broadcast: 'Envoyer la dernière campagne',
  carboncopy: 'Copie carbone',
  subscription_notify: 'Notification d’abonnement',
  unsubscription_notify: 'Notification de désabonnement',
  channel: 'Canal',
  slug: 'Slug',
  labels: 'Libellés',
  singular: 'Libellé singulier',
  plural: 'Libellé pluriel',
  appid: 'Identifiant d’application',
  fields: 'Champs',
  relationships: 'Relations',
  namespace: 'Espace de nommage',
  hasmany: 'Relation multiple',
  default: 'Valeur par défaut',
  icons: 'Icônes',
  cardregion1: 'Zone de carte 1',
  cardregion2: 'Zone de carte 2',
  cardregion3: 'Zone de carte 3',
  cardregion4: 'Zone de carte 4',
  cardregion5: 'Zone de carte 5',
  color: 'Couleur',
  width: 'Largeur',
  order: 'Ordre',
  dealorder: 'Ordre des opportunités',
  percent: 'Pourcentage',
  webhook: 'Webhook',
  webhooks: 'Webhooks',
  url: 'URL',
  sources: 'Sources',
  username: 'Nom d’utilisateur',
  password: 'Mot de passe'
};

const CONTEXT_LABELS = {
  account: 'du compte',
  contact: 'du contact',
  deal: 'de l’opportunité',
  field: 'du champ',
  fieldvalue: 'de la valeur de champ',
  accountcontact: 'de l’association compte-contact',
  accountcustomfielddatum: 'de la valeur de champ de compte',
  accountcustomfieldmetum: 'du champ personnalisé de compte',
  address: 'de l’adresse',
  branding: 'du branding',
  calendar: 'du calendrier',
  connection: 'de la connexion',
  contactautomation: 'de l’automatisation du contact',
  contactdeal: 'de l’association contact-opportunité',
  contactlist: 'de l’inscription à la liste',
  contacttag: 'du tag du contact',
  dealcustomfielddatum: 'de la valeur de champ d’opportunité',
  dealcustomfieldmetum: 'du champ personnalisé d’opportunité',
  dealgroup: 'du pipeline',
  dealstage: 'de l’étape',
  dealtask: 'de la tâche',
  dealtasktype: 'du type de tâche',
  ecomcustomer: 'du client e-commerce',
  ecomorder: 'de la commande e-commerce',
  orderproducts: 'du produit',
  orderdiscounts: 'de la remise',
  eventtracking: 'du suivi d’événement',
  eventtrackingevent: 'de l’événement de suivi',
  fieldrel: 'de la relation de champ',
  group: 'du groupe',
  groupmember: 'du membre de groupe',
  list: 'de la liste',
  listgroup: 'de l’autorisation de liste',
  message: 'du message',
  note: 'de la note',
  record: 'de l’enregistrement',
  savedresponse: 'de la réponse enregistrée',
  schema: 'du schéma',
  sitetracking: 'du suivi de site',
  sitetrackingdomain: 'du domaine suivi',
  tag: 'du tag',
  user: 'de l’utilisateur',
  webhook: 'du webhook'
};

function prettifyToken(token) {
  const normalized = toSnake(token);
  if (!normalized) return '';
  if (SEGMENT_LABELS[normalized]) return SEGMENT_LABELS[normalized];
  return titleCase(normalized);
}

function isContainerSegment(segment) {
  return !!CONTEXT_LABELS[toSnake(segment)];
}

function humanizeFieldLabel({ key, bodyPath = [], in: location } = {}) {
  const path = Array.isArray(bodyPath) ? bodyPath.map((part) => toSnake(part)).filter(Boolean) : [];
  const normalizedKey = toSnake(key);

  if ((location === 'path' || location === 'query') && normalizedKey === 'id') return 'Identifiant';
  if (path.length === 1) return prettifyToken(path[0]) || prettifyToken(normalizedKey);

  if (path.length >= 2) {
    const leaf = path[path.length - 1];
    const parent = path[path.length - 2];
    const root = path[0];
    const leafLabel = prettifyToken(leaf);
    const parentContext = CONTEXT_LABELS[parent] || CONTEXT_LABELS[root];

    if (path.length === 2 && isContainerSegment(root) && leafLabel) {
      if (leaf === root) {
        if (leaf === 'tag') return 'Nom du tag';
        if (leaf === 'note') return 'Contenu de la note';
        if (leaf === 'event') return 'Nom de l’événement';
      }
      return leafLabel;
    }

    if (leaf === parent || leaf === root) {
      if (leaf === 'tag') return 'Nom du tag';
      if (leaf === 'note') return 'Contenu de la note';
      if (leaf === 'event') return 'Nom de l’événement';
    }

    if (parentContext && !['fields', 'relationships', 'labels', 'icons'].includes(parent)) {
      if (/^Identifiant\b/.test(leafLabel) || /^URL\b/.test(leafLabel)) return leafLabel;
      if (leafLabel === 'Valeur' && /valeur de champ/.test(parentContext)) return 'Valeur du champ';
      if (leafLabel === 'Devise' && /valeur de champ/.test(parentContext)) return 'Devise du champ';
      if (leafLabel === 'Montant de remise' && /remise/.test(parentContext)) return 'Montant de la remise';
      if (['Nom', 'Titre', 'Description', 'Statut', 'Type', 'Valeur', 'Devise', 'Couleur', 'Largeur', 'Quantité', 'Prix'].includes(leafLabel)) {
        return `${leafLabel} ${parentContext}`;
      }
      return `${leafLabel} ${parentContext}`;
    }

    if (isContainerSegment(root) && leafLabel) return leafLabel;
  }

  if (normalizedKey) {
    if (SEGMENT_LABELS[normalizedKey]) return SEGMENT_LABELS[normalizedKey];
    const parts = normalizedKey.split('_').filter(Boolean);
    const last = parts[parts.length - 1];
    return prettifyToken(last || normalizedKey);
  }

  return 'Champ';
}

function humanizeFieldDescription({ key, bodyPath = [], description, in: location } = {}) {
  if (description) return description;
  const label = humanizeFieldLabel({ key, bodyPath, in: location });
  if (location === 'path') return `Renseignez ${label.toLowerCase()}.`;
  if (location === 'query') return `Filtre ou option: ${label.toLowerCase()}.`;
  return `Renseignez ${label.toLowerCase()}.`;
}

module.exports = {
  humanizeFieldLabel,
  humanizeFieldDescription
};
