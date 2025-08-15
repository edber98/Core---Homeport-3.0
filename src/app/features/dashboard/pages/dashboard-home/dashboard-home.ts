import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DynamicForm } from '../../../../modules/dynamic-form/dynamic-form';
import { JsonSchemaViewerComponent } from '../../../../modules/json-schema-viewer/json-schema-viewer';
import { ExpressionEditorComponent } from '../../../../modules/expression-editor/expression-editor';

@Component({
  selector: 'app-dashboard-home',
  imports: [CommonModule, FormsModule, DynamicForm, JsonSchemaViewerComponent, ExpressionEditorComponent],
  templateUrl: './dashboard-home.html',
  styleUrl: './dashboard-home.scss'
})
export class DashboardHome {
  viewerData = {
    payload: {
      id: 'salut',
      obj: { name: 'velo', qty: 2, nested: { flag: true } },
      arr: [ { code: 'A', price: 12.5 }, { code: 'B', price: 8 } ],
      now: new Date().toISOString()
    }
  };
  exprCtx = { payload: this.viewerData.payload, $env: {}, $node: {}, $now: new Date() };
  expr = 'Bonjour {{ payload.obj.name }}!';
  schema: any = {
    title: 'Onboarding client',
    ui: { layout: 'horizontal', labelCol: { span: 7 }, controlCol: { span: 17 }, widthPx: 1000 },
    fields: [

      {
        title: 'Identité',
        type: 'section',
        fields: [
          {
            title: 'Intro',
            type: 'section_array',
            key: 'introItems',
            array: {
              initialItems: 1, minItems: 0, controls: {
                add: {
                  text: 'Ajouter'
                }, remove: { text: 'Supprimer' }
              }
            },
            grid: { gutter: 16 },
            ui: {
              layout: 'vertical', labelCol: { span: 24 }, controlCol: {
                span: 24
              }
            },
            fields: [
              {
                type: 'textblock', textHtml: '<h4>Bienvenue</h4><p>Merci de renseigner vos informations.</p>', col: { xs: 24 }
              },
              {
                key: 'country', type: 'select', label: 'Pays',
                options: [{ label: 'France', value: 'FR' }, { label: 'Suisse', value: 'CH' }, { label: 'Belgique', value: 'BE' }],
                default: 'FR', validators: [{ type: 'required' }], col: { xs: 24, md: 12 }
              },
                      {
                key: 'countrye', type: 'select', label: 'Pays',
                options: [{ label: 'France', value: 'FR' }, { label: 'Suisse', value: 'CH' }, { label: 'Belgique', value: 'BE' }],
                default: 'FR', validators: [{ type: 'required' }], col: { xs: 24, md: 12 }
              },
            ]
          },
          {
            title: 'Coordonnées',
            type: 'section',
            grid: { gutter: 16 },
            fields: [
              {
                key: 'companyType', type: 'radio', label: 'Type',
                options: [{ label: 'Particulier', value: 'perso' }, { label: 'Professionnel', value: 'pro' }],
                default: 'pro', col: { xs: 24, md: 12 }
              },
              {
                key: 'country', type: 'select', label: 'Pays',
                options: [{ label: 'France', value: 'FR' }, { label: 'Suisse', value: 'CH' }, { label: 'Belgique', value: 'BE' }],
                default: 'FR', validators: [{ type: 'required' }], col: { xs: 24, md: 12 }
              },
              {
                key: 'siret', type: 'text', label: 'SIRET', placeholder: '14 chiffres',
                visibleIf: { all: [{ '==': [{ var: 'country' }, 'FR'] }, { '==': [{ var: 'companyType' }, 'pro'] }] },
                requiredIf: { '==': [{ var: 'companyType' }, 'pro'] },
                validators: [{ type: 'pattern', value: '^\\d{14}$' }],
                col: { xs: 24, md: 12 }
              },
              {
                key: 'turnover', type: 'number', label: 'CA annuel (€)',
                validators: [{ type: 'min', value: 0 }], col: { xs: 24, md: 12 }
              }
            ]
          }
        ]
      }/* ,
      {
        title: 'Fiscal',
        visibleIf: { '==': [ { var: 'companyType' }, 'pro' ] },
                    type: 'section',

        fields: [
          {
            title: 'TVA',
                        type: 'section',

            fields: [
              {
                key: 'vatNumber', type: 'text', label: 'N° TVA',
                visibleIf: { any: [ { '==': [ { var: 'companyType' }, 'pro' ] }, { '>': [ { var: 'turnover' }, 50000 ] } ] },
                disabledIf: { '==': [ { var: 'country' }, 'CH' ] },
                col: { xs: 24, md: 12 }
              },
              { key: 'comments', type: 'textarea', label: 'Commentaires', col: { xs: 24 } }
            ]
          }
        ]
      } */
    ]
  };

  testing: any =  {"title":"Nouveau formulaire","fields":[{"type":"section","title":"Les conditions","mode":"array","key":"items","array":{"initialItems":1,"minItems":0,"controls":{"add":{"kind":"text","text":"Ajouter"},"remove":{"kind":"text","text":"Supprimer"}}},"fields":[{"type":"text","key":"name","label":"Name","col":{"xs":24,"sm":24,"md":12,"lg":12,"xl":12},"default":"","expression":{"allow":true}},{"type":"text","key":"condtion","label":"Condtion","col":{"xs":24,"sm":24,"md":12,"lg":12,"xl":12},"default":"","expression":{"allow":true}}],"col":{"xs":24,"sm":24,"md":24,"lg":24,"xl":24},"description":"Choisir les conditions","grid":{"gutter":16},"ui":{"layout":"vertical"}}]}


  accounts: any = {
    "title": "Ouverture de compte",
    "ui": { "layout": "horizontal", labelsOnTop: false, "labelCol": { "span": 8 }, "controlCol": { "span": 16 }, "widthPx": 960 },
    "summary": {
      "enabled": true,
      "title": "Vérification finale",
      "includeHidden": false,
      "dateFormat": "dd/MM/yyyy"
    },
    "steps": [
      {
        "title": "Identité",
        "sections": [
          {
            "title": "Coordonnées",
            "fields": [
              { "key": "firstName", "type": "text", "label": "Prénom", "validators": [{ "type": "required" }] },
              { "key": "lastName", "type": "text", "label": "Nom" },
              {
                "key": "country", "type": "select", "label": "Pays",
                "options": [
                  { "label": "France", "value": "FR" },
                  { "label": "Suisse", "value": "CH" }
                ],
                "default": "FR"
              },
              { "type": "textblock", "textHtml": "<em>Merci de vérifier vos informations.</em>" }
            ]
          }
        ]
      },
      {
        "title": "Profil",
        "sections": [
          {
            "title": "Préférences",
            "fields": [
              { "key": "newsletter", "type": "checkbox", "label": "S'abonner à la newsletter", "default": true },
              { "key": "birthDate", "type": "date", "label": "Date de naissance" }
            ]
          }
        ]
      }
    ]
  }


  // --- Exemple 2 : SECTIONS directes + texte
  /*   schemaSections: any = {
      title: 'Contact rapide',
      ui: { layout: 'vertical', widthPx: 700, labelsOnTop: false  },
      sections: [
        {
          title: 'Informations',
          fields: [
            { type: 'textblock', textHtml: '<p>Veuillez remplir les champs ci-dessous.</p>' },
            { key: 'firstName', type: 'text', label: 'Prénom', validators: [{ type: 'required' }], col: { xs: 24, md: 12 } },
            { key: 'lastName', type: 'text', label: 'Nom', validators: [{ type: 'required' }], col: { xs: 24, md: 12 } },
            { key: 'email', type: 'text', label: 'Email', validators: [{ type: 'required' }, { type: 'pattern', value: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' }], col: { xs: 24, md: 12 } },
            { key: 'newsletter', type: 'checkbox', label: 'S’abonner à la newsletter', col: { xs: 24 } }
          ]
        }
      ]
    }; */

  schemaSections: any = {
    title: 'Contact rapide',
    ui: { layout: 'vertical', widthPx: 700, labelsOnTop: false },
    fields: [
      {
        title: 'Informations',
        type: 'section',
        fields: [
          { type: 'textblock', textHtml: '<p>Veuillez remplir les champs ci-dessous.</p>' },
          { key: 'firstName', type: 'text', label: 'Prénom', validators: [{ type: 'required' }], col: { xs: 24, md: 12 } },
          { key: 'firstName', type: 'text', label: 'Prénom', validators: [{ type: 'required' }], col: { xs: 24, md: 12 } },
          { key: 'lastName', type: 'text', label: 'Nom', validators: [{ type: 'required' }], col: { xs: 24, md: 12 } },
          { key: 'email', type: 'text', label: 'Email', validators: [{ type: 'required' }, { type: 'pattern', value: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' }], col: { xs: 24, md: 12 } },
          {
            key: 'companyType', type: 'radio', label: 'Type',
            options: [{ label: 'Particulier', value: 'perso' }, { label: 'Professionnel', value: 'pro' }],
            default: 'pro', col: { xs: 24, md: 24 }
          },
/*          { key: 'newsletter', type: 'checkbox', label: 'S’abonner à la newsletter', col: { xs: 24 , md: 24 } }
 */         ]
      }
    ]
  };

  valueSections = {
    firstName: 'Alice'
    // lastName/email omis -> '' ; newsletter omis -> false
  };

  // --- Exemple 3 : FLAT + inline
  schemaFlat: any = {
    title: 'Recherche',
    ui: { layout: 'inline', widthPx: 1000, labelAlign: 'left' },
    fields: [
      { key: 'q', type: 'text', label: 'Mot-clé', placeholder: 'Rechercher…', col: { xs: 24, md: 8 } },
      {
        key: 'country', type: 'select', label: 'Pays', options: [
          { label: 'Tous', value: null }, { label: 'France', value: 'FR' }, { label: 'Suisse', value: 'CH' }
        ], default: null, col: { xs: 24, md: 6 }
      },
      { key: 'hasVat', type: 'checkbox', label: 'TVA', col: { xs: 24, md: 4 } },
      { type: 'textblock', textHtml: '<em style="color:#64748b">Astuce : utilisez des mots précis.</em>', col: { xs: 24 } }
    ]
  };
}
