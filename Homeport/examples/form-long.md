{
  "title": "Nouveau formulaire",
  "fields": [
    {
      "type": "section",
      "title": "Information système",
      "fields": [
        {
          "type": "text",
          "key": "event_id",
          "label": "Event ID",
          "col": {
            "xs": 24,
            "sm": 24,
            "md": 24,
            "lg": 24,
            "xl": 24
          },
          "default": "",
          "expression": {
            "allow": true
          }
        }
      ],
      "col": {
        "xs": 24,
        "sm": 24,
        "md": 24,
        "lg": 24,
        "xl": 24
      },
      "description": "Les ID à renseigner.",
      "grid": {
        "gutter": 16
      },
      "mode": "normal"
    },
    {
      "type": "text",
      "key": "user_id",
      "label": "User ID",
      "col": {
        "xs": 24,
        "sm": 24,
        "md": 24,
        "lg": 24,
        "xl": 24
      },
      "default": "",
      "expression": {
        "allow": true
      }
    },
    {
      "type": "section",
      "title": "Contenu",
      "fields": [
        {
          "type": "checkbox",
          "key": "acr",
          "label": "Accusé de reception",
          "col": {
            "xs": 24,
            "sm": 24,
            "md": 12,
            "lg": 12,
            "xl": 12
          },
          "default": false,
          "expression": {
            "allow": true
          }
        },
        {
          "type": "text",
          "key": "message",
          "label": "Message",
          "col": {
            "xs": 24,
            "sm": 24,
            "md": 24,
            "lg": 24,
            "xl": 24
          },
          "default": "",
          "expression": {
            "allow": true
          }
        },
        {
          "type": "text",
          "key": "subject",
          "label": "Sujet",
          "col": {
            "xs": 24,
            "sm": 24,
            "md": 24,
            "lg": 24,
            "xl": 24
          },
          "default": "",
          "expression": {
            "allow": true
          }
        },
        {
          "type": "text",
          "key": "dest",
          "label": "Dest",
          "col": {
            "xs": 24,
            "sm": 24,
            "md": 24,
            "lg": 24,
            "xl": 24
          },
          "default": "",
          "expression": {
            "allow": true
          }
        }
      ],
      "col": {
        "xs": 24,
        "sm": 24,
        "md": 24,
        "lg": 24,
        "xl": 24
      },
      "description": "Le contenu et destinaire du mail",
      "grid": {
        "gutter": 16
      },
      "mode": "normal"
    },
    {
      "type": "section",
      "title": "Dossier",
      "fields": [
        {
          "type": "text",
          "key": "file",
          "label": "Fichier à envoyer",
          "col": {
            "xs": 24,
            "sm": 24,
            "md": 24,
            "lg": 24,
            "xl": 24
          },
          "default": "",
          "expression": {
            "allow": true
          }
        },
        {
          "type": "text",
          "key": "path",
          "label": "Chemin",
          "col": {
            "xs": 24,
            "sm": 24,
            "md": 24,
            "lg": 24,
            "xl": 24
          },
          "default": "",
          "expression": {
            "allow": true
          }
        },
        {
          "type": "text",
          "key": "value",
          "label": "Valeur",
          "col": {
            "xs": 24,
            "sm": 24,
            "md": 24,
            "lg": 24,
            "xl": 24
          },
          "default": "",
          "expression": {
            "allow": true
          }
        }
      ],
      "col": {
        "xs": 24,
        "sm": 24,
        "md": 24,
        "lg": 24,
        "xl": 24
      },
      "grid": {
        "gutter": 16
      },
      "mode": "normal"
    }
  ],
  "ui": {
    "layout": "vertical",
    "labelAlign": "left",
    "labelsOnTop": true,
    "labelCol": {
      "span": 8
    },
    "controlCol": {
      "span": 16
    },
    "widthPx": 1040,
    "actions": {
      "showReset": false,
      "showCancel": false
    }
  },
  "summary": {
    "enabled": false,
    "includeHidden": false,
    "dateFormat": "dd/MM/yyyy"
  }
}