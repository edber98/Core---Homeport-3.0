
---

## 📄 Documentation — Form Builder Angular Dynamic

### 1️⃣ Structure générale

Le schéma JSON accepté par le moteur a **3 modes** possibles :

#### Mode 1 : **Stepper**

```json
{
  "title": "Titre global du formulaire",
  "ui": { ... },
  "steps": [
    {
      "title": "Titre du step",
      "visibleIf": { "==": [ { "var": "country" }, "FR" ] }, 
      "sections": [
        {
          "title": "Titre de la section",
          "description": "Texte descriptif",
          "grid": { "gutter": 16 },
          "fields": [ ... ]
        }
      ]
    }
  ]
}
```

#### Mode 2 : **Sections directes**

```json
{
  "title": "Titre global du formulaire",
  "ui": { ... },
  "sections": [
    {
      "title": "Informations",
      "description": "Texte explicatif",
      "fields": [ ... ]
    }
  ]
}
```

#### Mode 3 : **Flat (liste simple de champs)**

```json
{
  "title": "Formulaire rapide",
  "ui": { ... },
  "fields": [ ... ]
}
```

---

### 2️⃣ Objet `ui` (layout & style)

La clé `ui` permet de définir la mise en page générale.

```json
"ui": {
  "layout": "horizontal",       // "horizontal", "vertical", "inline"
  "labelAlign": "left",         // "left" ou "right"
  "labelCol": { "span": 8 },    // largeur colonne label (1-24)
  "controlCol": { "span": 16 }, // largeur colonne contrôle (1-24)
  "widthPx": 1040                // largeur max du formulaire en pixels
}
```

* **layout** :

  * `"horizontal"` : labels à gauche, contrôles à droite (desktop)
  * `"vertical"` : labels au-dessus (mobile-friendly)
  * `"inline"` : tout sur une seule ligne (utile pour barres de recherche)
* **labelCol** / **controlCol** : système de grille [ng-zorro](https://ng.ant.design/components/grid/en)
  Total = 24 colonnes (ex : 8 + 16)
* **widthPx** : largeur max du conteneur (centré)

---

### 3️⃣ Définition des champs (`fields`)

Chaque élément de `fields` est un **FieldConfig** avec :

| Clé           | Type       | Description                                         |
| ------------- | ---------- | --------------------------------------------------- |
| `type`        | string     | Type du champ (voir tableau ci-dessous)             |
| `key`         | string     | Nom du contrôle (obligatoire sauf pour `textblock`) |
| `label`       | string     | Libellé affiché                                     |
| `placeholder` | string     | Texte indicatif                                     |
| `description` | string     | Texte supplémentaire                                |
| `default`     | any        | Valeur par défaut si `value` absent                 |
| `validators`  | array      | Liste de validateurs                                |
| `options`     | array      | Pour `select` / `radio` : `{ label, value }`        |
| `visibleIf`   | JSON-logic | Condition de visibilité                             |
| `requiredIf`  | JSON-logic | Condition de caractère obligatoire                  |
| `disabledIf`  | JSON-logic | Condition de désactivation                          |
| `col`         | object     | Largeur responsive `{ xs, sm, md, lg, xl }`         |
| `textHtml`    | string     | HTML pour `textblock`                               |

---

### 4️⃣ Types de `field.type`

| Type        | Rendu ng-zorro          | Remarques                        |
| ----------- | ----------------------- | -------------------------------- |
| `text`      | `<input nz-input>`      | Texte simple                     |
| `textarea`  | `<textarea nz-input>`   | Zone multi-ligne                 |
| `number`    | `<input type="number">` | Valeur numérique                 |
| `select`    | `<nz-select>`           | Options définies dans `options`  |
| `radio`     | `<nz-radio-group>`      | Boutons radio                    |
| `checkbox`  | `<label nz-checkbox>`   | Case à cocher                    |
| `date`      | `<nz-date-picker>`      | Sélecteur de date                |
| `textblock` | `<div [innerHTML]>`     | Bloc HTML statique, pas de `key` |

---

### 5️⃣ Responsive avec `col`

Exemple :

```json
"col": { "xs": 24, "md": 12 }
```

* `xs: 24` → prend 100% sur mobile
* `md: 12` → prend 50% à partir du breakpoint `md` (≥ 768px)

---

### 6️⃣ Conditions (`visibleIf`, `requiredIf`, `disabledIf`)

Format basé sur **JSON-logic light**.

#### Opérateurs supportés :

* `==`, `!=`, `>`, `>=`, `<`, `<=`
* `all` (tous vrais), `any` (au moins un vrai), `not` (négation)
* `var` (valeur d’un autre champ)

#### Exemple :

```json
"visibleIf": { "==": [ { "var": "country" }, "FR" ] }
```

→ Visible seulement si `country === "FR"`

```json
"requiredIf": {
  "all": [
    { "==": [ { "var": "country" }, "FR" ] },
    { "==": [ { "var": "companyType" }, "pro" ] }
  ]
}
```

→ Obligatoire si pays = France **ET** type = professionnel

---

### 7️⃣ Exemple complet — Stepper + conditions

```json
{
  "title": "Onboarding client",
  "ui": { "layout": "horizontal", "labelCol": { "span": 7 }, "controlCol": { "span": 17 }, "widthPx": 1000 },
  "steps": [
    {
      "title": "Identité",
      "sections": [
        {
          "title": "Coordonnées",
          "grid": { "gutter": 16 },
          "fields": [
            {
              "key": "companyType",
              "type": "radio",
              "label": "Type",
              "options": [
                { "label": "Particulier", "value": "perso" },
                { "label": "Professionnel", "value": "pro" }
              ],
              "default": "pro",
              "col": { "xs": 24, "md": 12 }
            },
            {
              "key": "country",
              "type": "select",
              "label": "Pays",
              "options": [
                { "label": "France", "value": "FR" },
                { "label": "Suisse", "value": "CH" }
              ],
              "default": "FR",
              "validators": [{ "type": "required" }],
              "col": { "xs": 24, "md": 12 }
            },
            {
              "key": "siret",
              "type": "text",
              "label": "SIRET",
              "placeholder": "14 chiffres",
              "visibleIf": {
                "all": [
                  { "==": [ { "var": "country" }, "FR" ] },
                  { "==": [ { "var": "companyType" }, "pro" ] }
                ]
              },
              "requiredIf": { "==": [ { "var": "companyType" }, "pro" ] },
              "validators": [{ "type": "pattern", "value": "^\\d{14}$" }],
              "col": { "xs": 24, "md": 12 }
            }
          ]
        }
      ]
    },
    {
      "title": "Fiscal",
      "visibleIf": { "==": [ { "var": "companyType" }, "pro" ] },
      "sections": [
        {
          "title": "TVA",
          "fields": [
            {
              "key": "vatNumber",
              "type": "text",
              "label": "N° TVA",
              "visibleIf": { "any": [
                { "==": [ { "var": "companyType" }, "pro" ] },
                { ">": [ { "var": "turnover" }, 50000 ] }
              ]},
              "disabledIf": { "==": [ { "var": "country" }, "CH" ] },
              "col": { "xs": 24, "md": 12 }
            }
          ]
        }
      ]
    }
  ]
}
```

---

