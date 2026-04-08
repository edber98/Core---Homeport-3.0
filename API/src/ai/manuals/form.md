# Manuel de référence — Form Builder

Ce document est le manuel de référence pour le mode AI form builder.
Il couvre les types de champs, la structure, la mise en page, la validation,
la visibilité conditionnelle, les styles et les bonnes pratiques.

<!-- @topic:field_types -->
## Types de champs disponibles

| Type | Description |
|------|-------------|
| text | Texte court (une ligne) |
| textarea | Texte long (plusieurs lignes) |
| number | Nombre (entier ou décimal) |
| email | Adresse email (validation format) |
| url | URL / lien web |
| tel | Numéro de téléphone |
| password | Mot de passe (masqué) |
| select | Liste déroulante (un seul choix) |
| radio | Boutons radio (un seul choix, tous visibles) |
| checkbox | Case à cocher (oui/non) |
| boolean | Interrupteur vrai/faux |
| date | Sélecteur de date |
| color | Sélecteur de couleur |
| rate | Notation par étoiles (0 à 5) |
| file | Upload de fichier |
| tags | Liste de tags (étiquettes libres) |
| text_array | Liste de textes (ajout/suppression) |
| code | Éditeur de code |
| expression | Expression / formule |
| cron | Expression cron (planification) |
| json | Éditeur JSON |
| schema_builder | Constructeur de schéma |
| html | Éditeur HTML |
| hidden | Champ caché |
| section | Section (groupe visuel de champs) |
| section_array | Tableau dynamique (lignes ajout/suppression) |

### Notes sur les types spécialisés

- **email** : Active le clavier email sur mobile et la validation navigateur. Utiliser pour les adresses email (pas text).
- **tel** : Active le clavier numérique sur mobile. Utiliser pour les numéros de téléphone (pas text).
- **color** : Utilise nz-color-picker. Options : `color: { showText: true, allowClear: false }`.
- **rate** : Utilise nz-rate avec 5 étoiles. Options : `rate: { allowHalf: false }`.
- **schema_builder** : Formulaire dans le formulaire pour construire un schéma dynamique. Col pleine largeur (`xs: 24`), `defaultValue: null`.
- **tags** : Liste d'étiquettes libres. Options : `tags: { itemType: "text" }`. `defaultValue: []`.

<!-- @topic:field_structure -->
## Structure d'un champ

Chaque champ est un objet JSON avec les propriétés suivantes :

```json
{
  "key": "identifiant_unique",
  "type": "text",
  "label": "Libellé affiché",
  "description": "Description ou texte d'aide",
  "defaultValue": "",
  "placeholder": "Texte placeholder",
  "col": { "xs": 24, "sm": 24, "md": 12 },
  "validators": [{ "type": "required" }],
  "visibleIf": { "field": "autre_champ", "value": "oui" },
  "requiredIf": { "field": "urgence", "value": "haute" },
  "options": [{ "label": "Option 1", "value": "opt1" }]
}
```

### Propriétés principales

- **key** : Identifiant unique du champ (snake_case recommandé). Doit être unique dans tout le formulaire.
- **type** : Type du champ (voir la table des types disponibles).
- **label** : Libellé affiché à l'utilisateur.
- **description** : Texte d'aide optionnel affiché sous le champ.
- **defaultValue** : Valeur par défaut du champ.
- **placeholder** : Texte indicatif affiché quand le champ est vide.
- **col** : Configuration de la grille responsive (voir système de colonnes).
- **validators** : Tableau de règles de validation.
- **visibleIf** : Condition de visibilité (voir visibilité conditionnelle).
- **requiredIf** : Condition d'obligation (voir obligation conditionnelle).
- **disabledIf** : Condition de désactivation (voir désactivation conditionnelle).
- **options** : Tableau d'options pour select, radio (objets `{ label, value }`).

<!-- @topic:columns -->
## Système de colonnes

- Grille 24 colonnes responsive.
- 24 = pleine largeur, 12 = moitié, 8 = tiers.
- Breakpoints : `xs` (mobile), `sm` (tablette), `md` (desktop), `lg` (large), `xl` (extra-large).
- Défaut recommandé : `{ xs: 24, sm: 24, md: 12 }` (pleine largeur mobile, moitié desktop).
- `textarea`, `html`, `code` : utiliser `md: 24` (pleine largeur).

### Exemples courants

| Disposition | col |
|-------------|-----|
| Pleine largeur | `{ xs: 24 }` |
| Moitié | `{ xs: 24, sm: 24, md: 12 }` |
| Tiers | `{ xs: 24, sm: 12, md: 8 }` |
| Quart | `{ xs: 24, sm: 12, md: 6 }` |

<!-- @topic:sections -->
## Sections

### section (groupe visuel)

Le type `section` crée un groupe visuel de champs avec un titre et une description.
Les champs enfants sont ajoutés avec `add_field(sectionKey="...")`.

### section_array (tableau dynamique)

Le type `section_array` crée un tableau dynamique. L'utilisateur peut ajouter et supprimer des lignes.
Les champs de la section deviennent les colonnes du tableau.

Exemple : un tableau "Contacts" avec colonnes nom, email, téléphone.

### Style des sections (via update_section)

- **titleStyle** : `{ color: "#1677ff", fontSize: "16px" }`
- **descriptionStyle** : `{ color: "#64748b", fontSize: "13px" }`
- **itemStyle** : `{ borderWidth: "1px", borderColor: "#e2e8f0", borderRadius: "8px", paddingTop: "16px", paddingBottom: "16px", paddingLeft: "16px", paddingRight: "16px" }`

<!-- @topic:visibleIf -->
## Visibilité conditionnelle (visibleIf)

Permet d'afficher ou masquer un champ selon la valeur d'un autre champ.

### Condition simple

```json
{ "field": "type_demande", "value": "urgente" }
```

Le champ est visible uniquement quand `type_demande === "urgente"`.

### Condition avec opérateur

```json
{ "field": "quantite", "operator": "gt", "value": 10 }
```

Le champ est visible uniquement quand `quantite > 10`.

### Opérateurs disponibles

| Opérateur | Description |
|-----------|-------------|
| eq ou absent | Égal à (défaut) |
| neq | Différent de |
| gt | Supérieur à |
| gte | Supérieur ou égal |
| lt | Inférieur à |
| lte | Inférieur ou égal |
| contains | Contient (texte) |
| not_empty | Non vide (pas besoin de value) |
| empty | Vide (pas besoin de value) |

### Conditions multiples (logique AND/OR)

```json
{
  "logic": "all",
  "conditions": [
    { "field": "type", "value": "maintenance" },
    { "field": "urgence", "operator": "neq", "value": "basse" }
  ]
}
```

- `logic: "all"` = ET (toutes les conditions doivent être vraies)
- `logic: "any"` = OU (au moins une condition doit être vraie)

<!-- @topic:requiredIf -->
## Obligation conditionnelle (requiredIf)

Rend un champ obligatoire seulement si une condition est remplie.

```json
{ "field": "urgence", "value": "critique" }
```

Le champ devient obligatoire uniquement quand `urgence === "critique"`.

Supporte la même syntaxe que `visibleIf` : condition simple, avec opérateur, ou conditions multiples avec `logic`.

<!-- @topic:disabledIf -->
## Désactivation conditionnelle (disabledIf)

Désactive un champ selon une condition. Le champ est grisé et non modifiable.

```json
{ "field": "mode", "value": "automatique" }
```

Le champ est désactivé quand `mode === "automatique"`.

Supporte la même syntaxe que `visibleIf` : condition simple, avec opérateur, ou conditions multiples avec `logic`.

<!-- @topic:validators -->
## Validation

### Validators disponibles

| Validator | Description | Exemple |
|-----------|-------------|---------|
| required | Champ obligatoire | `{ "type": "required" }` |
| minLength | Longueur minimale | `{ "type": "minLength", "value": 3 }` |
| maxLength | Longueur maximale | `{ "type": "maxLength", "value": 500 }` |
| pattern | Expression régulière | `{ "type": "pattern", "value": "^[A-Z]" }` |

### Exemples d'utilisation

Champ obligatoire avec longueur minimale :
```json
"validators": [
  { "type": "required" },
  { "type": "minLength", "value": 2 }
]
```

Validation par regex (code postal français) :
```json
"validators": [
  { "type": "pattern", "value": "^[0-9]{5}$" }
]
```

<!-- @topic:update_field -->
## Modification partielle de champs

`update_field` permet de modifier UN SEUL attribut d'un champ sans toucher les autres.
Seules les propriétés fournies sont modifiées, le reste est conservé.

### Exemples

- Changer le label : `update_field({ key: "nom", label: "Nom complet" })`
- Rendre obligatoire : `update_field({ key: "email", required: true })`
- Changer le type : `update_field({ key: "notes", type: "textarea" })`
- Ajouter des options : `update_field({ key: "statut", options: [{ label: "Actif", value: "active" }, { label: "Inactif", value: "inactive" }] })`
- Changer le placeholder : `update_field({ key: "ville", placeholder: "Ex: Paris" })`
- Modifier la largeur : `update_field({ key: "description", col: { xs: 24, md: 24 } })`

<!-- @topic:form_settings -->
## Paramètres globaux du formulaire

`update_form_settings` modifie les propriétés du formulaire entier.

### Propriétés disponibles

| Propriété | Description | Défaut |
|-----------|-------------|--------|
| title | Titre affiché en haut du formulaire | — |
| description | Description affichée sous le titre | — |
| displayTitle | Afficher/masquer le titre | true |
| displayDescription | Afficher/masquer la description | true |
| centerTitle | Centrer le titre | false |
| centerDescription | Centrer la description | false |
| layout | Disposition : "vertical", "horizontal", "inline" | "vertical" |
| labelsOnTop | Labels au-dessus (true) ou à côté (false) des champs | true |

### DISTINCTION CRITIQUE

- **TITRE du formulaire** → `update_form_settings({ title: "..." })`
- **LABEL d'une section** → `update_section({ key: "...", label: "..." })`

Ne pas confondre les deux. Le titre est global, le label est propre à une section.

<!-- @topic:styles -->
## Style des champs

`update_field` supporte les propriétés de style suivantes :

### labelStyle

Style du libellé du champ :
```json
{ "color": "#333", "fontSize": "14px" }
```

### itemStyle

Style du conteneur du champ :
```json
{
  "borderWidth": "1px",
  "borderColor": "#d9d9d9",
  "borderRadius": "6px",
  "paddingTop": "8px",
  "marginBottom": "12px"
}
```

### Propriétés CSS supportées

- Texte : `color`, `fontSize`
- Bordure : `borderWidth`, `borderColor`, `borderRadius`
- Ombre : `boxShadow`
- Marges extérieures : `marginTop`, `marginRight`, `marginBottom`, `marginLeft`
- Marges intérieures : `paddingTop`, `paddingRight`, `paddingBottom`, `paddingLeft`

<!-- @topic:ordering -->
## Positionnement et ordre logique

### Ordre logique recommandé

- **Identité** : prénom → nom → email → téléphone
- **Adresse** : rue → code postal → ville → pays
- **Dates** : date de début → date de fin → durée
- **Choix** : question principale → sous-questions conditionnelles

### Insertion positionnelle

Utiliser `afterKey` ou `beforeKey` dans `add_field` pour insérer à la bonne position :
```
add_field({ key: "prenom", ..., beforeKey: "nom" })
```

### Réorganisation

`reorder_fields(sectionKey=...)` pour réorganiser les champs dans une section.

<!-- @topic:save_policy -->
## Politique de sauvegarde

### Mode builder (sideEvents)

En mode builder, les modifications sont envoyées en temps réel via les sideEvents.
**NE PAS appeler `save_form` automatiquement.** L'utilisateur sauvegarde manuellement via le bouton du builder.

### Mode chat direct

En mode chat direct (hors builder), appeler `save_form` à la fin des modifications pour persister les changements.

<!-- @topic:builder_mode -->
## Mode builder (formulaire existant)

Si tu es en mode formulaire (form builder), le formulaire est **DÉJÀ CHARGÉ**.

### Règles

- **NE DEMANDE JAMAIS** "quel formulaire ?" — c'est celui qui est ouvert.
- Commencer par `get_form_schema` pour voir l'état actuel.
- **NE PAS** appeler `search_forms`, `load_form` ni `create_form`.
- Modifier directement avec `add_section`, `add_field`, `update_field`, `remove_field`.

### Flux de travail type

1. `get_form_schema` → examiner la structure existante
2. Appliquer les modifications demandées
3. Ne pas sauvegarder (le builder gère ça)

<!-- @topic:new_form -->
## Créer un nouveau formulaire

### Étapes

1. `create_form` → Crée le formulaire. Le titre et la description sont automatiquement dans le schéma.
2. Organiser en sections avec `add_section` (titre + description **OBLIGATOIRES**).
3. Ajouter **CHAQUE champ UN PAR UN** avec `add_field(sectionKey="...")`.
4. `save_form` → Sauvegarder le formulaire.

### Bonnes pratiques

- Toujours structurer en sections logiques.
- Utiliser des clés descriptives en snake_case.
- Respecter les accents français dans les labels et descriptions.
- Mettre les majuscules uniquement sur le premier mot (sauf noms propres).

<!-- @topic:modify_existing -->
## Modifier un formulaire existant (hors builder)

### Étapes

1. `search_forms` → Trouver le formulaire par nom ou description.
2. `load_form` → **OBLIGATOIRE** avant toute modification.
3. `get_form_schema` → Voir le schéma complet si besoin.
4. Appliquer les modifications : `update_field`, `remove_field`, `add_field`, `add_section`, `update_section`, `update_form_settings`, `reorder_fields`.
5. `save_form` → Sauvegarder.

### IMPORTANT

Sans `load_form`, les outils `add_field`, `update_field`, `remove_field` **refuseront de fonctionner**.
Le formulaire doit être chargé en mémoire avant toute opération de modification.
