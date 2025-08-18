import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { UiNode } from '../ui/ui-model.service';

export type WebsiteStatus = 'draft' | 'test' | 'live';
export type PageStatus = 'empty' | 'in_progress' | 'done' | 'error';

export interface WebsiteRoute {
  path: string;
  title?: string;
  status?: PageStatus;
  builderState?: 'none' | 'editing' | 'published' | 'archived';
  updatedAt?: string;
  // UI project wrapper with a single active variant (requested shape)
  ui?: { variant?: UiProject };
}

export interface Website {
  id: string;
  name: string;
  slug: string;
  description?: string;
  tags?: string[];
  status: WebsiteStatus;
  createdAt: string;
  updatedAt: string;
  routes: WebsiteRoute[];
}

export interface UiProject {
  version: number;
  model: UiNode;
  classes: Array<{ name: string; parts?: string[]; styles?: any }>;
  tokens?: Record<string, string>;
  breakpoints?: Array<string | { id: string;label: string; min?: number; max?: number }>;
}

// Reusable design system (classes) used across routes, loaded into Class Manager
const DEFAULT_CLASSES: Array<{ name: string; parts?: string[]; styles: any }> = [
  { name: 'page', parts: ['page'], styles: { base: { base: { maxWidth: '1080px', margin: '0 auto', padding: '16px' } } } },
  { name: 'card', parts: ['card'], styles: { base: { base: { border: '1px solid #ececec', borderRadius: '14px', padding: '16px', backgroundColor: '#ffffff', boxShadow: '0 8px 24px rgba(0,0,0,0.04)', marginBottom: '12px' } } } },
  { name: 'row', parts: ['row'], styles: { base: { base: { display: 'flex', gap: '12px', alignItems: 'center' } } } },
  { name: 'col', parts: ['col'], styles: { base: { base: { flex: '1 1 0', minWidth: '0' } } } },
  { name: 'btn', parts: ['btn'], styles: { base: { base: { display: 'inline-block', padding: '8px 12px', backgroundColor: '#fff', color: '#111', borderRadius: '10px', border: '1px solid #e5e7eb', marginRight: '8px', cursor: 'pointer' } } } },
  { name: 'btn.primary', parts: ['btn', 'primary'], styles: { base: { base: { backgroundColor: '#111', color: '#fff', border: '1px solid #111' } } } },
  { name: 'tag', parts: ['tag'], styles: { base: { base: { display: 'inline-block', padding: '2px 8px', borderRadius: '999px', fontSize: '12px', backgroundColor: '#f5f5f5', color: '#111', border: '1px solid rgba(0,0,0,0.06)', marginRight: '6px' } } } },
  { name: 'tag.blue', parts: ['tag', 'blue'], styles: { base: { base: { backgroundColor: '#eaf4ff', color: '#1d4ed8' } } } },
  { name: 'tag.warn', parts: ['tag', 'warn'], styles: { base: { base: { backgroundColor: '#fef9c3', color: '#92400e' } } } },
  { name: 'title', parts: ['title'], styles: { base: { base: { fontWeight: '600', fontSize: '20px', letterSpacing: '-0.02em', marginBottom: '4px' } } } },
  { name: 'subtitle', parts: ['subtitle'], styles: { base: { base: { color: '#6b7280', fontSize: '12px', marginBottom: '8px' } } } },
  // Tables
  { name: 'table', parts: ['table'], styles: { base: { base: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' } } } },
  { name: 'th', parts: ['th'], styles: { base: { base: { textAlign: 'left', padding: '8px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#fafafa' } } } },
  { name: 'td', parts: ['td'], styles: { base: { base: { padding: '8px', borderBottom: '1px solid #f0f0f0' } } } },
  // Navbar / Hero
  { name: 'navbar', parts: ['navbar'], styles: { base: { base: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid #ececec', background: '#fff', position: 'sticky', top: '0', zIndex: '10' } } } },
  { name: 'brand', parts: ['brand'], styles: { base: { base: { fontWeight: '700', letterSpacing: '-0.02em' } } } },
  { name: 'nav', parts: ['nav'], styles: { base: { base: { display: 'flex', gap: '12px' } } } },
  { name: 'nav-item', parts: ['nav-item'], styles: { base: { base: { padding: '6px 10px', borderRadius: '8px', color: '#374151', border: '1px solid #e5e7eb' } } } },
  { name: 'nav-item.active', parts: ['nav-item', 'active'], styles: { base: { base: { background: '#111', color: '#fff', border: '1px solid #111' } } } },
  { name: 'hero', parts: ['hero'], styles: { base: { base: { padding: '32px 16px', background: 'linear-gradient(180deg,#ffffff, #fafafa)', borderBottom: '1px solid #ececec', textAlign: 'center' } } } },
  // Grid & Media
  { name: 'grid', parts: ['grid'], styles: { base: { base: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: '12px' } } } },
  { name: 'avatar', parts: ['avatar'], styles: { base: { base: { width: '28px', height: '28px', borderRadius: '999px', background: '#f3f4f6', border: '1px solid #e5e7eb', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '600', color: '#111' } } } },
  { name: 'muted', parts: ['muted'], styles: { base: { base: { color: '#9ca3af', fontSize: '12px' } } } },
  { name: 'img', parts: ['img'], styles: { base: { base: { width: '100%', height: '140px', borderRadius: '10px', background: 'linear-gradient(135deg,#eef2ff,#fafafa)', border: '1px solid #e5e7eb', marginBottom: '8px' } } } },
  // Pricing, features
  { name: 'badge', parts: ['badge'], styles: { base: { base: { display: 'inline-block', padding: '2px 8px', borderRadius: '999px', fontSize: '11px', color: '#1d4ed8', background: '#eef2ff', border: '1px solid #e5e7eb', marginBottom: '6px' } } } },
  { name: 'pill', parts: ['pill'], styles: { base: { base: { display: 'inline-block', padding: '4px 10px', borderRadius: '999px', border: '1px solid #e5e7eb', cursor: 'pointer' } } } },
  { name: 'pill.active', parts: ['pill', 'active'], styles: { base: { base: { background: '#111', color: '#fff', border: '1px solid #111' } } } },
  { name: 'price-card', parts: ['price-card'], styles: { base: { base: { position: 'relative' } } } },
  { name: 'price', parts: ['price'], styles: { base: { base: { fontWeight: '700', letterSpacing: '-0.01em' } } } },
  { name: 'feature-list', parts: ['feature-list'], styles: { base: { base: { listStyle: 'none', padding: '0', margin: '8px 0', display: 'flex', flexDirection: 'column', gap: '6px' } } } },
  { name: 'feature', parts: ['feature'], styles: { base: { base: { padding: '4px 0', color: '#374151' } } } },
];

@Injectable({ providedIn: 'root' })
export class WebsiteService {
  private sites: Website[] = [
    {
      id: 'site_demo',
      name: 'Demo Site',
      slug: 'demo-site',
      description: 'Site de démonstration',
      tags: ['demo', 'marketing'],
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      routes: [
        {
          path: '/', title: 'Accueil', status: 'done', builderState: 'published', updatedAt: new Date().toISOString(), ui: {
            variant: {
              "version": 1,
              "model": {
                "id": "root",
                "tag": "div",
                "classes": [
                  "ui-root"
                ],
                "style": {
                  "margin": "0",
                  "padding": "0",
                  "font-family": "system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,\"Helvetica Neue\",Arial",
                  "color": "#111",
                  "background": "#f7f7f9"
                },
                "children": [
                  {
                    "id": "header_gpt65io",
                    "tag": "header",
                    "attrs": {},
                    "classes": [
                      "navbar"
                    ],
                    "style": {
                      "box-sizing": "border-box"
                    },
                    "children": [
                      {
                        "id": "div_f9hcemw",
                        "tag": "div",
                        "attrs": {},
                        "classes": [
                          "inner"
                        ],
                        "style": {
                          "box-sizing": "border-box",
                          "display": "flex",
                          "align-items": "center",
                          "gap": "12px",
                          "padding": "10px 20px",
                          "max-width": "1080px",
                          "margin": "auto"
                        },
                        "children": [
                          {
                            "id": "div_x3m8lyc",
                            "tag": "div",
                            "attrs": {},
                            "classes": [
                              "brand"
                            ],
                            "style": {
                              "box-sizing": "border-box"
                            },
                            "children": [
                              {
                                "id": "span_1lf0mz5",
                                "tag": "span",
                                "attrs": {
                                  "aria-hidden": "true"
                                },
                                "classes": [
                                  "dot"
                                ],
                                "style": {
                                  "box-sizing": "border-box",
                                  "width": "10px",
                                  "height": "10px",
                                  "border-radius": "2px",
                                  "background": "#111",
                                  "display": "inline-block"
                                },
                                "children": []
                              },
                              {
                                "id": "span_3x5mq8x",
                                "tag": "span",
                                "attrs": {
                                  "aria-label": "Marque"
                                },
                                "classes": [],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "svg_lpklydw",
                                    "tag": "svg",
                                    "attrs": {
                                      "width": "24",
                                      "height": "24",
                                      "viewBox": "0 0 24 24",
                                      "aria-hidden": "true"
                                    },
                                    "classes": [],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "rect_rm33c6a",
                                        "tag": "rect",
                                        "attrs": {
                                          "x": "2",
                                          "y": "2",
                                          "width": "20",
                                          "height": "20",
                                          "rx": "4",
                                          "fill": "#111"
                                        },
                                        "classes": [],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": []
                                      },
                                      {
                                        "id": "text_y3zgbcg",
                                        "tag": "text",
                                        "attrs": {
                                          "x": "12",
                                          "y": "15",
                                          "text-anchor": "middle",
                                          "font-size": "10",
                                          "fill": "#fff",
                                          "font-weight": "700"
                                        },
                                        "classes": [],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_3k48wsf",
                                            "tag": "#text",
                                            "text": "i55",
                                            "children": []
                                          }
                                        ]
                                      }
                                    ]
                                  }
                                ]
                              },
                              {
                                "id": "#text_e112blt",
                                "tag": "#text",
                                "text": "\n      Suite Entreprise\n    ",
                                "children": []
                              }
                            ]
                          },
                          {
                            "id": "nav_9fg3f9z",
                            "tag": "nav",
                            "attrs": {
                              "aria-label": "Principale"
                            },
                            "classes": [
                              "nav"
                            ],
                            "style": {
                              "box-sizing": "border-box"
                            },
                            "children": [
                              {
                                "id": "a_x48poxz",
                                "tag": "a",
                                "attrs": {
                                  "href": "#"
                                },
                                "classes": [
                                  "nav-item",
                                  "active"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "#text_whnd663",
                                    "tag": "#text",
                                    "text": "Aperçu",
                                    "children": []
                                  }
                                ]
                              },
                              {
                                "id": "a_xhehqxn",
                                "tag": "a",
                                "attrs": {
                                  "href": "#catalogue"
                                },
                                "classes": [
                                  "nav-item"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "#text_t1d571l",
                                    "tag": "#text",
                                    "text": "Catalogue",
                                    "children": []
                                  }
                                ]
                              },
                              {
                                "id": "a_on1lxhs",
                                "tag": "a",
                                "attrs": {
                                  "href": "#commandes"
                                },
                                "classes": [
                                  "nav-item"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "#text_y3edu8e",
                                    "tag": "#text",
                                    "text": "Commandes",
                                    "children": []
                                  }
                                ]
                              },
                              {
                                "id": "a_ojc76w8",
                                "tag": "a",
                                "attrs": {
                                  "href": "#equipe"
                                },
                                "classes": [
                                  "nav-item"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "#text_vkfd3eh",
                                    "tag": "#text",
                                    "text": "Équipe",
                                    "children": []
                                  }
                                ]
                              },
                              {
                                "id": "a_701b3wn",
                                "tag": "a",
                                "attrs": {
                                  "href": "#faq"
                                },
                                "classes": [
                                  "nav-item"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "#text_g3gxk0t",
                                    "tag": "#text",
                                    "text": "FAQ",
                                    "children": []
                                  }
                                ]
                              }
                            ]
                          },
                          {
                            "id": "div_7x5n49k",
                            "tag": "div",
                            "attrs": {},
                            "classes": [],
                            "style": {
                              "margin-left": "auto",
                              "display": "flex",
                              "align-items": "center",
                              "gap": "8px",
                              "box-sizing": "border-box"
                            },
                            "children": [
                              {
                                "id": "input_mlcjh70",
                                "tag": "input",
                                "attrs": {
                                  "placeholder": "Recherche…"
                                },
                                "classes": [
                                  "form-control"
                                ],
                                "style": {
                                  "max-width": "220px",
                                  "box-sizing": "border-box"
                                },
                                "children": []
                              },
                              {
                                "id": "span_7ccd4st",
                                "tag": "span",
                                "attrs": {},
                                "classes": [
                                  "avatar",
                                  "lg"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "#text_82u2uwj",
                                    "tag": "#text",
                                    "text": "P",
                                    "children": []
                                  }
                                ]
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  },
                  {
                    "id": "main_afrex0l",
                    "tag": "main",
                    "attrs": {},
                    "classes": [
                      "page"
                    ],
                    "style": {
                      "box-sizing": "border-box"
                    },
                    "children": [
                      {
                        "id": "nav_dch45rn",
                        "tag": "nav",
                        "attrs": {
                          "aria-label": "Fil d’Ariane"
                        },
                        "classes": [
                          "mb-3"
                        ],
                        "style": {
                          "box-sizing": "border-box"
                        },
                        "children": [
                          {
                            "id": "span_7h7sqxl",
                            "tag": "span",
                            "attrs": {},
                            "classes": [
                              "meta"
                            ],
                            "style": {
                              "box-sizing": "border-box"
                            },
                            "children": [
                              {
                                "id": "#text_k9f7tbp",
                                "tag": "#text",
                                "text": "Accueil",
                                "children": []
                              }
                            ]
                          },
                          {
                            "id": "#text_5o7let9",
                            "tag": "#text",
                            "text": " /\n    ",
                            "children": []
                          },
                          {
                            "id": "span_byb06as",
                            "tag": "span",
                            "attrs": {},
                            "classes": [
                              "meta"
                            ],
                            "style": {
                              "box-sizing": "border-box"
                            },
                            "children": [
                              {
                                "id": "#text_iuetg6c",
                                "tag": "#text",
                                "text": "Aperçu",
                                "children": []
                              }
                            ]
                          }
                        ]
                      },
                      {
                        "id": "div_ky15ufa",
                        "tag": "div",
                        "attrs": {},
                        "classes": [
                          "banner",
                          "mb-3",
                          "between"
                        ],
                        "style": {
                          "box-sizing": "border-box"
                        },
                        "children": [
                          {
                            "id": "div_if1dal3",
                            "tag": "div",
                            "attrs": {},
                            "classes": [],
                            "style": {
                              "box-sizing": "border-box"
                            },
                            "children": [
                              {
                                "id": "strong_6yzei0o",
                                "tag": "strong",
                                "attrs": {},
                                "classes": [],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "#text_o9jvbji",
                                    "tag": "#text",
                                    "text": "Mise à jour",
                                    "children": []
                                  }
                                ]
                              },
                              {
                                "id": "#text_hhicy5f",
                                "tag": "#text",
                                "text": " — Nouveaux modèles de fiche produit & tableau de spécifications.\n    ",
                                "children": []
                              }
                            ]
                          },
                          {
                            "id": "span_2728qpp",
                            "tag": "span",
                            "attrs": {},
                            "classes": [
                              "badge"
                            ],
                            "style": {
                              "box-sizing": "border-box"
                            },
                            "children": [
                              {
                                "id": "#text_it2ha79",
                                "tag": "#text",
                                "text": "Nouveau",
                                "children": []
                              }
                            ]
                          }
                        ]
                      },
                      {
                        "id": "section_hgi8hxi",
                        "tag": "section",
                        "attrs": {},
                        "classes": [
                          "row",
                          "mb-3"
                        ],
                        "style": {
                          "box-sizing": "border-box"
                        },
                        "children": [
                          {
                            "id": "article_p87of3z",
                            "tag": "article",
                            "attrs": {},
                            "classes": [
                              "card",
                              "col"
                            ],
                            "style": {
                              "box-sizing": "border-box"
                            },
                            "children": [
                              {
                                "id": "div_gwzvqb3",
                                "tag": "div",
                                "attrs": {},
                                "classes": [
                                  "between"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "div_k0atc5r",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "div_q2gimtj",
                                        "tag": "div",
                                        "attrs": {},
                                        "classes": [
                                          "subtitle"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_sst2xex",
                                            "tag": "#text",
                                            "text": "Revenu (M)",
                                            "children": []
                                          }
                                        ]
                                      },
                                      {
                                        "id": "div_rr4365b",
                                        "tag": "div",
                                        "attrs": {},
                                        "classes": [
                                          "price"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_vfwp3y3",
                                            "tag": "#text",
                                            "text": "€ 128 000",
                                            "children": []
                                          }
                                        ]
                                      },
                                      {
                                        "id": "div_amluxj2",
                                        "tag": "div",
                                        "attrs": {},
                                        "classes": [
                                          "state",
                                          "success"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_yw5tuo8",
                                            "tag": "#text",
                                            "text": "▲ +8.2% vs. mois-1",
                                            "children": []
                                          }
                                        ]
                                      }
                                    ]
                                  },
                                  {
                                    "id": "div_8cm94n6",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [],
                                    "style": {
                                      "min-width": "160px",
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "div_nwg6fd0",
                                        "tag": "div",
                                        "attrs": {},
                                        "classes": [
                                          "meta",
                                          "mb-1"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_jo16rs4",
                                            "tag": "#text",
                                            "text": "Objectif 200k",
                                            "children": []
                                          }
                                        ]
                                      },
                                      {
                                        "id": "div_bghw8yi",
                                        "tag": "div",
                                        "attrs": {},
                                        "classes": [
                                          "progress"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "span_1otz36n",
                                            "tag": "span",
                                            "attrs": {},
                                            "classes": [],
                                            "style": {
                                              "width": "60%",
                                              "box-sizing": "border-box",
                                              "display": "block",
                                              "height": "100%",
                                              "background": "#111"
                                            },
                                            "children": []
                                          }
                                        ]
                                      }
                                    ]
                                  }
                                ]
                              }
                            ]
                          },
                          {
                            "id": "article_2zseex7",
                            "tag": "article",
                            "attrs": {},
                            "classes": [
                              "card",
                              "col"
                            ],
                            "style": {
                              "box-sizing": "border-box"
                            },
                            "children": [
                              {
                                "id": "div_2vbiu3o",
                                "tag": "div",
                                "attrs": {},
                                "classes": [
                                  "between"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "div_ckjt6a8",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "div_v4qa45z",
                                        "tag": "div",
                                        "attrs": {},
                                        "classes": [
                                          "subtitle"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_d067id3",
                                            "tag": "#text",
                                            "text": "Commandes",
                                            "children": []
                                          }
                                        ]
                                      },
                                      {
                                        "id": "div_p6kl78h",
                                        "tag": "div",
                                        "attrs": {},
                                        "classes": [
                                          "price"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_djn8beo",
                                            "tag": "#text",
                                            "text": "842",
                                            "children": []
                                          }
                                        ]
                                      },
                                      {
                                        "id": "div_be9rluo",
                                        "tag": "div",
                                        "attrs": {},
                                        "classes": [
                                          "meta"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_zouca6d",
                                            "tag": "#text",
                                            "text": "Taux retour: 1.1%",
                                            "children": []
                                          }
                                        ]
                                      }
                                    ]
                                  },
                                  {
                                    "id": "div_bl4tfgr",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [],
                                    "style": {
                                      "min-width": "160px",
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "div_zuzw5eg",
                                        "tag": "div",
                                        "attrs": {},
                                        "classes": [
                                          "meta",
                                          "mb-1"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_q5x91z2",
                                            "tag": "#text",
                                            "text": "SLA expédition",
                                            "children": []
                                          }
                                        ]
                                      },
                                      {
                                        "id": "div_bqaeotk",
                                        "tag": "div",
                                        "attrs": {},
                                        "classes": [
                                          "progress"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "span_4kyka8v",
                                            "tag": "span",
                                            "attrs": {},
                                            "classes": [],
                                            "style": {
                                              "width": "60%",
                                              "box-sizing": "border-box",
                                              "display": "block",
                                              "height": "100%",
                                              "background": "#111"
                                            },
                                            "children": []
                                          }
                                        ]
                                      }
                                    ]
                                  }
                                ]
                              }
                            ]
                          },
                          {
                            "id": "article_69noq3v",
                            "tag": "article",
                            "attrs": {},
                            "classes": [
                              "card",
                              "col"
                            ],
                            "style": {
                              "box-sizing": "border-box"
                            },
                            "children": [
                              {
                                "id": "div_3zf1g7z",
                                "tag": "div",
                                "attrs": {},
                                "classes": [
                                  "between"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "div_k5c6spp",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "div_m2pw2qj",
                                        "tag": "div",
                                        "attrs": {},
                                        "classes": [
                                          "subtitle"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_atu5b6c",
                                            "tag": "#text",
                                            "text": "Tickets ouverts",
                                            "children": []
                                          }
                                        ]
                                      },
                                      {
                                        "id": "div_4kbv6zf",
                                        "tag": "div",
                                        "attrs": {},
                                        "classes": [
                                          "price"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_0mk5npf",
                                            "tag": "#text",
                                            "text": "17",
                                            "children": []
                                          }
                                        ]
                                      },
                                      {
                                        "id": "div_18qyn90",
                                        "tag": "div",
                                        "attrs": {},
                                        "classes": [
                                          "state",
                                          "warn"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_m29i3zr",
                                            "tag": "#text",
                                            "text": "• stable",
                                            "children": []
                                          }
                                        ]
                                      }
                                    ]
                                  },
                                  {
                                    "id": "div_mxgygh1",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [],
                                    "style": {
                                      "min-width": "160px",
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "div_4a3jocn",
                                        "tag": "div",
                                        "attrs": {},
                                        "classes": [
                                          "meta",
                                          "mb-1"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_p3tm5ls",
                                            "tag": "#text",
                                            "text": "Résolution 24h",
                                            "children": []
                                          }
                                        ]
                                      },
                                      {
                                        "id": "div_ofc9k3j",
                                        "tag": "div",
                                        "attrs": {},
                                        "classes": [
                                          "progress"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "span_ahokjau",
                                            "tag": "span",
                                            "attrs": {},
                                            "classes": [],
                                            "style": {
                                              "width": "60%",
                                              "box-sizing": "border-box",
                                              "display": "block",
                                              "height": "100%",
                                              "background": "#111"
                                            },
                                            "children": []
                                          }
                                        ]
                                      }
                                    ]
                                  }
                                ]
                              }
                            ]
                          },
                          {
                            "id": "article_uummon3",
                            "tag": "article",
                            "attrs": {},
                            "classes": [
                              "card",
                              "col"
                            ],
                            "style": {
                              "box-sizing": "border-box"
                            },
                            "children": [
                              {
                                "id": "div_4f2zuit",
                                "tag": "div",
                                "attrs": {},
                                "classes": [
                                  "between"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "div_xkrfwyl",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "div_z66r8c6",
                                        "tag": "div",
                                        "attrs": {},
                                        "classes": [
                                          "subtitle"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_404iog4",
                                            "tag": "#text",
                                            "text": "Satisfaction",
                                            "children": []
                                          }
                                        ]
                                      },
                                      {
                                        "id": "div_rerm0hz",
                                        "tag": "div",
                                        "attrs": {},
                                        "classes": [
                                          "price"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_0mvbeed",
                                            "tag": "#text",
                                            "text": "4.6/5",
                                            "children": []
                                          }
                                        ]
                                      },
                                      {
                                        "id": "div_j051vmd",
                                        "tag": "div",
                                        "attrs": {},
                                        "classes": [
                                          "meta"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_p6j9qve",
                                            "tag": "#text",
                                            "text": "1 243 avis",
                                            "children": []
                                          }
                                        ]
                                      }
                                    ]
                                  },
                                  {
                                    "id": "div_ja0h08d",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [
                                      "badge-row"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "span_f7t2ta8",
                                        "tag": "span",
                                        "attrs": {},
                                        "classes": [
                                          "tag",
                                          "blue"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_imy7tnh",
                                            "tag": "#text",
                                            "text": "Premium",
                                            "children": []
                                          }
                                        ]
                                      },
                                      {
                                        "id": "span_kj5ujtm",
                                        "tag": "span",
                                        "attrs": {},
                                        "classes": [
                                          "tag"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_jpcmsrp",
                                            "tag": "#text",
                                            "text": "ISO 27001",
                                            "children": []
                                          }
                                        ]
                                      }
                                    ]
                                  }
                                ]
                              }
                            ]
                          }
                        ]
                      },
                      {
                        "id": "div_jjd9nel",
                        "tag": "div",
                        "attrs": {},
                        "classes": [
                          "between",
                          "mb-3"
                        ],
                        "style": {
                          "box-sizing": "border-box"
                        },
                        "children": [
                          {
                            "id": "div_bfh5j9v",
                            "tag": "div",
                            "attrs": {
                              "role": "tablist"
                            },
                            "classes": [
                              "tabs"
                            ],
                            "style": {
                              "box-sizing": "border-box"
                            },
                            "children": [
                              {
                                "id": "a_8kbm9j6",
                                "tag": "a",
                                "attrs": {
                                  "href": "#catalogue",
                                  "aria-current": "page"
                                },
                                "classes": [
                                  "imp-8ntbdq"
                                ],
                                "style": {
                                  "box-sizing": "border-box",
                                  "padding": ".45rem .7rem",
                                  "border-radius": "9999px",
                                  "border": "1px solid var(--border)",
                                  "background": "#fff"
                                },
                                "children": [
                                  {
                                    "id": "#text_xo47acs",
                                    "tag": "#text",
                                    "text": "Catalogue",
                                    "children": []
                                  }
                                ]
                              },
                              {
                                "id": "a_fdd7tko",
                                "tag": "a",
                                "attrs": {
                                  "href": "#fiche"
                                },
                                "classes": [
                                  "imp-8ntbdq"
                                ],
                                "style": {
                                  "box-sizing": "border-box",
                                  "padding": ".45rem .7rem",
                                  "border-radius": "9999px",
                                  "border": "1px solid var(--border)"
                                },
                                "children": [
                                  {
                                    "id": "#text_ya7wdrt",
                                    "tag": "#text",
                                    "text": "Fiche produit",
                                    "children": []
                                  }
                                ]
                              },
                              {
                                "id": "a_5y6r846",
                                "tag": "a",
                                "attrs": {
                                  "href": "#fichiers"
                                },
                                "classes": [
                                  "imp-8ntbdq"
                                ],
                                "style": {
                                  "box-sizing": "border-box",
                                  "padding": ".45rem .7rem",
                                  "border-radius": "9999px",
                                  "border": "1px solid var(--border)"
                                },
                                "children": [
                                  {
                                    "id": "#text_ftc0jl4",
                                    "tag": "#text",
                                    "text": "Fichiers",
                                    "children": []
                                  }
                                ]
                              },
                              {
                                "id": "a_do916lh",
                                "tag": "a",
                                "attrs": {
                                  "href": "#kanban"
                                },
                                "classes": [
                                  "imp-8ntbdq"
                                ],
                                "style": {
                                  "box-sizing": "border-box",
                                  "padding": ".45rem .7rem",
                                  "border-radius": "9999px",
                                  "border": "1px solid var(--border)"
                                },
                                "children": [
                                  {
                                    "id": "#text_vprn54s",
                                    "tag": "#text",
                                    "text": "Kanban",
                                    "children": []
                                  }
                                ]
                              },
                              {
                                "id": "a_jgw3bkh",
                                "tag": "a",
                                "attrs": {
                                  "href": "#timeline"
                                },
                                "classes": [
                                  "imp-8ntbdq"
                                ],
                                "style": {
                                  "box-sizing": "border-box",
                                  "padding": ".45rem .7rem",
                                  "border-radius": "9999px",
                                  "border": "1px solid var(--border)"
                                },
                                "children": [
                                  {
                                    "id": "#text_0zryzbt",
                                    "tag": "#text",
                                    "text": "Timeline",
                                    "children": []
                                  }
                                ]
                              }
                            ]
                          },
                          {
                            "id": "div_3ty65tl",
                            "tag": "div",
                            "attrs": {},
                            "classes": [
                              "pill-group"
                            ],
                            "style": {
                              "box-sizing": "border-box"
                            },
                            "children": [
                              {
                                "id": "span_gsfjsrp",
                                "tag": "span",
                                "attrs": {},
                                "classes": [
                                  "pill",
                                  "active"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "#text_cnfxkpk",
                                    "tag": "#text",
                                    "text": "Mensuel",
                                    "children": []
                                  }
                                ]
                              },
                              {
                                "id": "span_ndm64c7",
                                "tag": "span",
                                "attrs": {},
                                "classes": [
                                  "pill"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "#text_1xgqbt3",
                                    "tag": "#text",
                                    "text": "Annuel",
                                    "children": []
                                  }
                                ]
                              }
                            ]
                          }
                        ]
                      },
                      {
                        "id": "section_mrk7l19",
                        "tag": "section",
                        "attrs": {
                          "id": "catalogue"
                        },
                        "classes": [
                          "grid",
                          "mb-3"
                        ],
                        "style": {
                          "box-sizing": "border-box"
                        },
                        "children": [
                          {
                            "id": "article_toiqsb8",
                            "tag": "article",
                            "attrs": {},
                            "classes": [
                              "card"
                            ],
                            "style": {
                              "box-sizing": "border-box"
                            },
                            "children": [
                              {
                                "id": "div_vb7sf2t",
                                "tag": "div",
                                "attrs": {
                                  "aria-hidden": "true"
                                },
                                "classes": [
                                  "img"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": []
                              },
                              {
                                "id": "div_la2033t",
                                "tag": "div",
                                "attrs": {},
                                "classes": [
                                  "between",
                                  "mt-2"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "div_w8t5x9k",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [
                                      "title",
                                      "mb-0"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "#text_q0iypfc",
                                        "tag": "#text",
                                        "text": "Routeur Industriel XR-200",
                                        "children": []
                                      }
                                    ]
                                  },
                                  {
                                    "id": "span_r4j6jr2",
                                    "tag": "span",
                                    "attrs": {},
                                    "classes": [
                                      "badge"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "#text_zirybsc",
                                        "tag": "#text",
                                        "text": "En stock",
                                        "children": []
                                      }
                                    ]
                                  }
                                ]
                              },
                              {
                                "id": "div_jlykgqt",
                                "tag": "div",
                                "attrs": {},
                                "classes": [
                                  "subtitle"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "#text_4h162ex",
                                    "tag": "#text",
                                    "text": "Gigabit | OPC UA | -20°C / +60°C",
                                    "children": []
                                  }
                                ]
                              },
                              {
                                "id": "div_qeyao6d",
                                "tag": "div",
                                "attrs": {},
                                "classes": [
                                  "between",
                                  "mt-2"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "div_z0i7sfu",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [
                                      "price"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "#text_ylxajml",
                                        "tag": "#text",
                                        "text": "€ 1 290",
                                        "children": []
                                      }
                                    ]
                                  },
                                  {
                                    "id": "div_mapdzp3",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [
                                      "gap-2"
                                    ],
                                    "style": {
                                      "display": "flex",
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "span_tju6plp",
                                        "tag": "span",
                                        "attrs": {},
                                        "classes": [
                                          "tag"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_k0k9f3n",
                                            "tag": "#text",
                                            "text": "PoE",
                                            "children": []
                                          }
                                        ]
                                      },
                                      {
                                        "id": "span_5qamfsh",
                                        "tag": "span",
                                        "attrs": {},
                                        "classes": [
                                          "tag",
                                          "blue"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_aetwhhd",
                                            "tag": "#text",
                                            "text": "Nouveau",
                                            "children": []
                                          }
                                        ]
                                      }
                                    ]
                                  }
                                ]
                              },
                              {
                                "id": "div_1ic2wl2",
                                "tag": "div",
                                "attrs": {},
                                "classes": [
                                  "mt-2",
                                  "feature-list"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "div_0pm0hp0",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [
                                      "feature"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "span_kckxyjv",
                                        "tag": "span",
                                        "attrs": {},
                                        "classes": [
                                          "dot"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box",
                                          "width": ".5rem",
                                          "height": ".5rem",
                                          "border-radius": "50%",
                                          "background": "#D1D5DB",
                                          "margin-top": ".5rem",
                                          "flex": "0 0 auto"
                                        },
                                        "children": []
                                      },
                                      {
                                        "id": "#text_zpgav49",
                                        "tag": "#text",
                                        "text": " Redondance double SIM",
                                        "children": []
                                      }
                                    ]
                                  },
                                  {
                                    "id": "div_xgv02w1",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [
                                      "feature"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "span_spyv5ie",
                                        "tag": "span",
                                        "attrs": {},
                                        "classes": [
                                          "dot"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box",
                                          "width": ".5rem",
                                          "height": ".5rem",
                                          "border-radius": "50%",
                                          "background": "#D1D5DB",
                                          "margin-top": ".5rem",
                                          "flex": "0 0 auto"
                                        },
                                        "children": []
                                      },
                                      {
                                        "id": "#text_p8zq0ic",
                                        "tag": "#text",
                                        "text": " VPN, pare-feu intégré",
                                        "children": []
                                      }
                                    ]
                                  }
                                ]
                              },
                              {
                                "id": "div_2dexc8o",
                                "tag": "div",
                                "attrs": {},
                                "classes": [
                                  "mt-2"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "button_v1z1vg1",
                                    "tag": "button",
                                    "attrs": {},
                                    "classes": [
                                      "btn",
                                      "primary"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "#text_ggto3bu",
                                        "tag": "#text",
                                        "text": "Ajouter",
                                        "children": []
                                      }
                                    ]
                                  },
                                  {
                                    "id": "button_sum3g7a",
                                    "tag": "button",
                                    "attrs": {},
                                    "classes": [
                                      "btn"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "#text_cahez7l",
                                        "tag": "#text",
                                        "text": "Détails",
                                        "children": []
                                      }
                                    ]
                                  }
                                ]
                              }
                            ]
                          },
                          {
                            "id": "article_9577679",
                            "tag": "article",
                            "attrs": {},
                            "classes": [
                              "card"
                            ],
                            "style": {
                              "box-sizing": "border-box"
                            },
                            "children": [
                              {
                                "id": "div_fr3p12x",
                                "tag": "div",
                                "attrs": {},
                                "classes": [
                                  "img"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": []
                              },
                              {
                                "id": "div_77ga90s",
                                "tag": "div",
                                "attrs": {},
                                "classes": [
                                  "between",
                                  "mt-2"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "div_m5jq67j",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [
                                      "title",
                                      "mb-0"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "#text_w5n50ma",
                                        "tag": "#text",
                                        "text": "Capteur Temp. TX-18",
                                        "children": []
                                      }
                                    ]
                                  },
                                  {
                                    "id": "span_zck0fl7",
                                    "tag": "span",
                                    "attrs": {},
                                    "classes": [
                                      "tag",
                                      "warn"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "#text_g854cbe",
                                        "tag": "#text",
                                        "text": "Rupture",
                                        "children": []
                                      }
                                    ]
                                  }
                                ]
                              },
                              {
                                "id": "div_07sghtr",
                                "tag": "div",
                                "attrs": {},
                                "classes": [
                                  "subtitle"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "#text_s9q8sg2",
                                    "tag": "#text",
                                    "text": "PT1000 | IP67 | 4–20 mA",
                                    "children": []
                                  }
                                ]
                              },
                              {
                                "id": "div_7fdbtif",
                                "tag": "div",
                                "attrs": {},
                                "classes": [
                                  "between",
                                  "mt-2"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "div_j9e78ur",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [
                                      "price"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "#text_ylwffct",
                                        "tag": "#text",
                                        "text": "€ 159",
                                        "children": []
                                      }
                                    ]
                                  },
                                  {
                                    "id": "span_p37q7pq",
                                    "tag": "span",
                                    "attrs": {},
                                    "classes": [
                                      "meta"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "#text_xueg42k",
                                        "tag": "#text",
                                        "text": "Réassort: 12/09",
                                        "children": []
                                      }
                                    ]
                                  }
                                ]
                              },
                              {
                                "id": "div_q2jmp0l",
                                "tag": "div",
                                "attrs": {},
                                "classes": [
                                  "mt-2"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "button_n9xa037",
                                    "tag": "button",
                                    "attrs": {},
                                    "classes": [
                                      "btn"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "#text_4s9an6g",
                                        "tag": "#text",
                                        "text": "Alerter",
                                        "children": []
                                      }
                                    ]
                                  },
                                  {
                                    "id": "button_4ruqj7k",
                                    "tag": "button",
                                    "attrs": {},
                                    "classes": [
                                      "btn"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "#text_0wgzo3s",
                                        "tag": "#text",
                                        "text": "Comparer",
                                        "children": []
                                      }
                                    ]
                                  }
                                ]
                              }
                            ]
                          },
                          {
                            "id": "article_hfqkus7",
                            "tag": "article",
                            "attrs": {},
                            "classes": [
                              "card"
                            ],
                            "style": {
                              "box-sizing": "border-box"
                            },
                            "children": [
                              {
                                "id": "div_at6f40j",
                                "tag": "div",
                                "attrs": {},
                                "classes": [
                                  "img"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": []
                              },
                              {
                                "id": "div_9anw2ua",
                                "tag": "div",
                                "attrs": {},
                                "classes": [
                                  "between",
                                  "mt-2"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "div_nkfc3mg",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [
                                      "title",
                                      "mb-0"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "#text_u08vgqw",
                                        "tag": "#text",
                                        "text": "Switch 8p L2 Pro",
                                        "children": []
                                      }
                                    ]
                                  },
                                  {
                                    "id": "span_xnd9exk",
                                    "tag": "span",
                                    "attrs": {},
                                    "classes": [
                                      "tag"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "#text_8le7gfp",
                                        "tag": "#text",
                                        "text": "PoE+",
                                        "children": []
                                      }
                                    ]
                                  }
                                ]
                              },
                              {
                                "id": "div_cpp64z9",
                                "tag": "div",
                                "attrs": {},
                                "classes": [
                                  "subtitle"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "#text_z58ajoz",
                                    "tag": "#text",
                                    "text": "8× RJ45 2.5G | 2× SFP",
                                    "children": []
                                  }
                                ]
                              },
                              {
                                "id": "div_knub4sz",
                                "tag": "div",
                                "attrs": {},
                                "classes": [
                                  "between",
                                  "mt-2"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "div_6imv86c",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [
                                      "price"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "#text_5zk37d5",
                                        "tag": "#text",
                                        "text": "€ 349",
                                        "children": []
                                      }
                                    ]
                                  },
                                  {
                                    "id": "div_dbe40ez",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [
                                      "gap-2"
                                    ],
                                    "style": {
                                      "display": "flex",
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "span_zp1da8i",
                                        "tag": "span",
                                        "attrs": {},
                                        "classes": [
                                          "tag",
                                          "blue"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_tcndtpf",
                                            "tag": "#text",
                                            "text": "Promo",
                                            "children": []
                                          }
                                        ]
                                      },
                                      {
                                        "id": "span_n2eqc8q",
                                        "tag": "span",
                                        "attrs": {},
                                        "classes": [
                                          "tag"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_ppx9lnc",
                                            "tag": "#text",
                                            "text": "Garantie 5 ans",
                                            "children": []
                                          }
                                        ]
                                      }
                                    ]
                                  }
                                ]
                              },
                              {
                                "id": "div_rsa0i4c",
                                "tag": "div",
                                "attrs": {},
                                "classes": [
                                  "mt-2"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "button_p1srxpz",
                                    "tag": "button",
                                    "attrs": {},
                                    "classes": [
                                      "btn",
                                      "primary"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "#text_9ty7f26",
                                        "tag": "#text",
                                        "text": "Ajouter",
                                        "children": []
                                      }
                                    ]
                                  },
                                  {
                                    "id": "button_32twzc2",
                                    "tag": "button",
                                    "attrs": {},
                                    "classes": [
                                      "btn"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "#text_7qzhvrh",
                                        "tag": "#text",
                                        "text": "Détails",
                                        "children": []
                                      }
                                    ]
                                  }
                                ]
                              }
                            ]
                          }
                        ]
                      },
                      {
                        "id": "section_im2w7en",
                        "tag": "section",
                        "attrs": {
                          "id": "fiche"
                        },
                        "classes": [
                          "card",
                          "mb-3"
                        ],
                        "style": {
                          "box-sizing": "border-box"
                        },
                        "children": [
                          {
                            "id": "div_bkywvep",
                            "tag": "div",
                            "attrs": {},
                            "classes": [
                              "between"
                            ],
                            "style": {
                              "box-sizing": "border-box"
                            },
                            "children": [
                              {
                                "id": "div_lqxnhxa",
                                "tag": "div",
                                "attrs": {},
                                "classes": [],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "h2_v2baoq1",
                                    "tag": "h2",
                                    "attrs": {},
                                    "classes": [
                                      "title",
                                      "mb-0"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "#text_t9ncnyo",
                                        "tag": "#text",
                                        "text": "XR-200 — Fiche produit",
                                        "children": []
                                      }
                                    ]
                                  },
                                  {
                                    "id": "div_uiahywy",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [
                                      "subtitle"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "#text_68lv7vs",
                                        "tag": "#text",
                                        "text": "Réf. XR-200-OPCUA",
                                        "children": []
                                      }
                                    ]
                                  }
                                ]
                              },
                              {
                                "id": "div_li7ylkz",
                                "tag": "div",
                                "attrs": {},
                                "classes": [
                                  "badge-row"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "span_i70iw8i",
                                    "tag": "span",
                                    "attrs": {},
                                    "classes": [
                                      "tag",
                                      "blue"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "#text_b0p5xnj",
                                        "tag": "#text",
                                        "text": "Best-seller",
                                        "children": []
                                      }
                                    ]
                                  },
                                  {
                                    "id": "span_51738um",
                                    "tag": "span",
                                    "attrs": {},
                                    "classes": [
                                      "tag"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "#text_tfrrg0t",
                                        "tag": "#text",
                                        "text": "CE",
                                        "children": []
                                      }
                                    ]
                                  },
                                  {
                                    "id": "span_1jvl9th",
                                    "tag": "span",
                                    "attrs": {},
                                    "classes": [
                                      "tag"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "#text_6r1vnql",
                                        "tag": "#text",
                                        "text": "RoHS",
                                        "children": []
                                      }
                                    ]
                                  }
                                ]
                              }
                            ]
                          },
                          {
                            "id": "div_8gfseu4",
                            "tag": "div",
                            "attrs": {},
                            "classes": [
                              "row",
                              "mt-2"
                            ],
                            "style": {
                              "box-sizing": "border-box"
                            },
                            "children": [
                              {
                                "id": "div_m1zybni",
                                "tag": "div",
                                "attrs": {},
                                "classes": [
                                  "col"
                                ],
                                "style": {
                                  "min-width": "280px",
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "div_hmnngw8",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [
                                      "thumb",
                                      "card"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "svg_k4auf1v",
                                        "tag": "svg",
                                        "attrs": {
                                          "viewBox": "0 0 400 240",
                                          "role": "img",
                                          "aria-label": "Router XR-200"
                                        },
                                        "classes": [],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "rect_wb7e3wt",
                                            "tag": "rect",
                                            "attrs": {
                                              "x": "20",
                                              "y": "60",
                                              "width": "360",
                                              "height": "120",
                                              "rx": "14",
                                              "fill": "#111"
                                            },
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box"
                                            },
                                            "children": []
                                          },
                                          {
                                            "id": "rect_g1x46j5",
                                            "tag": "rect",
                                            "attrs": {
                                              "x": "20",
                                              "y": "180",
                                              "width": "360",
                                              "height": "14",
                                              "rx": "4",
                                              "fill": "#333"
                                            },
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box"
                                            },
                                            "children": []
                                          },
                                          {
                                            "id": "circle_5fkxfb8",
                                            "tag": "circle",
                                            "attrs": {
                                              "cx": "60",
                                              "cy": "96",
                                              "r": "6",
                                              "fill": "#10b981"
                                            },
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box"
                                            },
                                            "children": []
                                          },
                                          {
                                            "id": "circle_kunq7km",
                                            "tag": "circle",
                                            "attrs": {
                                              "cx": "80",
                                              "cy": "96",
                                              "r": "6",
                                              "fill": "#10b981"
                                            },
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box"
                                            },
                                            "children": []
                                          },
                                          {
                                            "id": "circle_waxjk3x",
                                            "tag": "circle",
                                            "attrs": {
                                              "cx": "100",
                                              "cy": "96",
                                              "r": "6",
                                              "fill": "#f59e0b"
                                            },
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box"
                                            },
                                            "children": []
                                          },
                                          {
                                            "id": "rect_rikrhrm",
                                            "tag": "rect",
                                            "attrs": {
                                              "x": "220",
                                              "y": "96",
                                              "width": "24",
                                              "height": "32",
                                              "rx": "2",
                                              "fill": "#e5e7eb"
                                            },
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box"
                                            },
                                            "children": []
                                          },
                                          {
                                            "id": "rect_85y2w46",
                                            "tag": "rect",
                                            "attrs": {
                                              "x": "250",
                                              "y": "96",
                                              "width": "24",
                                              "height": "32",
                                              "rx": "2",
                                              "fill": "#e5e7eb"
                                            },
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box"
                                            },
                                            "children": []
                                          },
                                          {
                                            "id": "rect_oh1tbp3",
                                            "tag": "rect",
                                            "attrs": {
                                              "x": "280",
                                              "y": "96",
                                              "width": "24",
                                              "height": "32",
                                              "rx": "2",
                                              "fill": "#e5e7eb"
                                            },
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box"
                                            },
                                            "children": []
                                          },
                                          {
                                            "id": "rect_rampemp",
                                            "tag": "rect",
                                            "attrs": {
                                              "x": "310",
                                              "y": "96",
                                              "width": "24",
                                              "height": "32",
                                              "rx": "2",
                                              "fill": "#e5e7eb"
                                            },
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box"
                                            },
                                            "children": []
                                          },
                                          {
                                            "id": "text_ojy11fn",
                                            "tag": "text",
                                            "attrs": {
                                              "x": "40",
                                              "y": "150",
                                              "fill": "#fff",
                                              "font-weight": "700",
                                              "font-size": "20"
                                            },
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box"
                                            },
                                            "children": [
                                              {
                                                "id": "#text_hfzn5we",
                                                "tag": "#text",
                                                "text": "i55 XR",
                                                "children": []
                                              }
                                            ]
                                          }
                                        ]
                                      }
                                    ]
                                  },
                                  {
                                    "id": "div_l8yu11v",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [
                                      "row",
                                      "mt-2"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "div_m0yis87",
                                        "tag": "div",
                                        "attrs": {},
                                        "classes": [
                                          "col"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "div_morgf2n",
                                            "tag": "div",
                                            "attrs": {},
                                            "classes": [
                                              "thumb"
                                            ],
                                            "style": {
                                              "box-sizing": "border-box"
                                            },
                                            "children": []
                                          }
                                        ]
                                      },
                                      {
                                        "id": "div_x0gr9gu",
                                        "tag": "div",
                                        "attrs": {},
                                        "classes": [
                                          "col"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "div_evkcnc8",
                                            "tag": "div",
                                            "attrs": {},
                                            "classes": [
                                              "thumb"
                                            ],
                                            "style": {
                                              "box-sizing": "border-box"
                                            },
                                            "children": []
                                          }
                                        ]
                                      }
                                    ]
                                  }
                                ]
                              },
                              {
                                "id": "div_f2kz8pl",
                                "tag": "div",
                                "attrs": {},
                                "classes": [
                                  "col"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "div_28t7vj2",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [
                                      "between"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "div_ecoa1fo",
                                        "tag": "div",
                                        "attrs": {},
                                        "classes": [
                                          "price"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_wdejteh",
                                            "tag": "#text",
                                            "text": "€ 1 290",
                                            "children": []
                                          }
                                        ]
                                      },
                                      {
                                        "id": "div_24gjvib",
                                        "tag": "div",
                                        "attrs": {},
                                        "classes": [
                                          "meta"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_qr1edal",
                                            "tag": "#text",
                                            "text": "Livraison 48 h",
                                            "children": []
                                          }
                                        ]
                                      }
                                    ]
                                  },
                                  {
                                    "id": "p_e0gwrfs",
                                    "tag": "p",
                                    "attrs": {},
                                    "classes": [
                                      "mt-2"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "#text_fa7u7gp",
                                        "tag": "#text",
                                        "text": "Routeur industriel Haute dispo, supporte ",
                                        "children": []
                                      },
                                      {
                                        "id": "strong_8ncgcc4",
                                        "tag": "strong",
                                        "attrs": {},
                                        "classes": [],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_fgq9fnk",
                                            "tag": "#text",
                                            "text": "OPC UA",
                                            "children": []
                                          }
                                        ]
                                      },
                                      {
                                        "id": "#text_37352xq",
                                        "tag": "#text",
                                        "text": ", profils VLAN, VPN & pare-feu.",
                                        "children": []
                                      }
                                    ]
                                  },
                                  {
                                    "id": "div_xy0zzau",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [
                                      "table-wrap",
                                      "mt-2"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "table_kk4fy97",
                                        "tag": "table",
                                        "attrs": {
                                          "aria-label": "Spécifications XR-200"
                                        },
                                        "classes": [],
                                        "style": {
                                          "box-sizing": "border-box",
                                          "width": "100%",
                                          "border-collapse": "collapse",
                                          "font-size": "14px"
                                        },
                                        "children": [
                                          {
                                            "id": "tbody_l8efxsr",
                                            "tag": "tbody",
                                            "attrs": {},
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box"
                                            },
                                            "children": [
                                              {
                                                "id": "tr_rr7tja0",
                                                "tag": "tr",
                                                "attrs": {},
                                                "classes": [],
                                                "style": {
                                                  "box-sizing": "border-box"
                                                },
                                                "children": [
                                                  {
                                                    "id": "th_vs50ykc",
                                                    "tag": "th",
                                                    "attrs": {},
                                                    "classes": [],
                                                    "style": {
                                                      "box-sizing": "border-box",
                                                      "padding": ".8rem .9rem",
                                                      "white-space": "nowrap",
                                                      "text-align": "left",
                                                      "color": "#374151",
                                                      "background": "#fafafa",
                                                      "border-bottom": "1px solid var(--border)",
                                                      "position": "sticky",
                                                      "top": "0"
                                                    },
                                                    "children": [
                                                      {
                                                        "id": "#text_asw7qqo",
                                                        "tag": "#text",
                                                        "text": "CPU",
                                                        "children": []
                                                      }
                                                    ]
                                                  },
                                                  {
                                                    "id": "td_3udlm1v",
                                                    "tag": "td",
                                                    "attrs": {},
                                                    "classes": [],
                                                    "style": {
                                                      "box-sizing": "border-box",
                                                      "padding": ".8rem .9rem",
                                                      "white-space": "nowrap"
                                                    },
                                                    "children": [
                                                      {
                                                        "id": "#text_x4u0cg1",
                                                        "tag": "#text",
                                                        "text": "Quad 1.4 GHz",
                                                        "children": []
                                                      }
                                                    ]
                                                  }
                                                ]
                                              },
                                              {
                                                "id": "tr_et74b66",
                                                "tag": "tr",
                                                "attrs": {},
                                                "classes": [],
                                                "style": {
                                                  "box-sizing": "border-box"
                                                },
                                                "children": [
                                                  {
                                                    "id": "th_r7y12e4",
                                                    "tag": "th",
                                                    "attrs": {},
                                                    "classes": [],
                                                    "style": {
                                                      "box-sizing": "border-box",
                                                      "padding": ".8rem .9rem",
                                                      "white-space": "nowrap",
                                                      "text-align": "left",
                                                      "color": "#374151",
                                                      "background": "#fafafa",
                                                      "border-bottom": "1px solid var(--border)",
                                                      "position": "sticky",
                                                      "top": "0"
                                                    },
                                                    "children": [
                                                      {
                                                        "id": "#text_uq1zn42",
                                                        "tag": "#text",
                                                        "text": "RAM",
                                                        "children": []
                                                      }
                                                    ]
                                                  },
                                                  {
                                                    "id": "td_rrwbr3v",
                                                    "tag": "td",
                                                    "attrs": {},
                                                    "classes": [],
                                                    "style": {
                                                      "box-sizing": "border-box",
                                                      "padding": ".8rem .9rem",
                                                      "white-space": "nowrap",
                                                      "border-top": "1px solid var(--border)"
                                                    },
                                                    "children": [
                                                      {
                                                        "id": "#text_m63qpo4",
                                                        "tag": "#text",
                                                        "text": "2 Go",
                                                        "children": []
                                                      }
                                                    ]
                                                  }
                                                ]
                                              },
                                              {
                                                "id": "tr_ed15epq",
                                                "tag": "tr",
                                                "attrs": {},
                                                "classes": [],
                                                "style": {
                                                  "box-sizing": "border-box"
                                                },
                                                "children": [
                                                  {
                                                    "id": "th_sar5kxx",
                                                    "tag": "th",
                                                    "attrs": {},
                                                    "classes": [],
                                                    "style": {
                                                      "box-sizing": "border-box",
                                                      "padding": ".8rem .9rem",
                                                      "white-space": "nowrap",
                                                      "text-align": "left",
                                                      "color": "#374151",
                                                      "background": "#fafafa",
                                                      "border-bottom": "1px solid var(--border)",
                                                      "position": "sticky",
                                                      "top": "0"
                                                    },
                                                    "children": [
                                                      {
                                                        "id": "#text_kugcemc",
                                                        "tag": "#text",
                                                        "text": "Température",
                                                        "children": []
                                                      }
                                                    ]
                                                  },
                                                  {
                                                    "id": "td_e4tjswf",
                                                    "tag": "td",
                                                    "attrs": {},
                                                    "classes": [],
                                                    "style": {
                                                      "box-sizing": "border-box",
                                                      "padding": ".8rem .9rem",
                                                      "white-space": "nowrap",
                                                      "border-top": "1px solid var(--border)"
                                                    },
                                                    "children": [
                                                      {
                                                        "id": "#text_7wgk5ra",
                                                        "tag": "#text",
                                                        "text": "-20°C à +60°C",
                                                        "children": []
                                                      }
                                                    ]
                                                  }
                                                ]
                                              },
                                              {
                                                "id": "tr_3zn60o1",
                                                "tag": "tr",
                                                "attrs": {},
                                                "classes": [],
                                                "style": {
                                                  "box-sizing": "border-box"
                                                },
                                                "children": [
                                                  {
                                                    "id": "th_r3bomza",
                                                    "tag": "th",
                                                    "attrs": {},
                                                    "classes": [],
                                                    "style": {
                                                      "box-sizing": "border-box",
                                                      "padding": ".8rem .9rem",
                                                      "white-space": "nowrap",
                                                      "text-align": "left",
                                                      "color": "#374151",
                                                      "background": "#fafafa",
                                                      "border-bottom": "1px solid var(--border)",
                                                      "position": "sticky",
                                                      "top": "0"
                                                    },
                                                    "children": [
                                                      {
                                                        "id": "#text_3xhskxv",
                                                        "tag": "#text",
                                                        "text": "Réseau",
                                                        "children": []
                                                      }
                                                    ]
                                                  },
                                                  {
                                                    "id": "td_fx76wqn",
                                                    "tag": "td",
                                                    "attrs": {},
                                                    "classes": [],
                                                    "style": {
                                                      "box-sizing": "border-box",
                                                      "padding": ".8rem .9rem",
                                                      "white-space": "nowrap",
                                                      "border-top": "1px solid var(--border)"
                                                    },
                                                    "children": [
                                                      {
                                                        "id": "#text_nae80o6",
                                                        "tag": "#text",
                                                        "text": "4× RJ45 1G, 2× SFP",
                                                        "children": []
                                                      }
                                                    ]
                                                  }
                                                ]
                                              },
                                              {
                                                "id": "tr_zuk3a0v",
                                                "tag": "tr",
                                                "attrs": {},
                                                "classes": [],
                                                "style": {
                                                  "box-sizing": "border-box"
                                                },
                                                "children": [
                                                  {
                                                    "id": "th_qvp9w96",
                                                    "tag": "th",
                                                    "attrs": {},
                                                    "classes": [],
                                                    "style": {
                                                      "box-sizing": "border-box",
                                                      "padding": ".8rem .9rem",
                                                      "white-space": "nowrap",
                                                      "text-align": "left",
                                                      "color": "#374151",
                                                      "background": "#fafafa",
                                                      "border-bottom": "1px solid var(--border)",
                                                      "position": "sticky",
                                                      "top": "0"
                                                    },
                                                    "children": [
                                                      {
                                                        "id": "#text_jluhwy1",
                                                        "tag": "#text",
                                                        "text": "Certifications",
                                                        "children": []
                                                      }
                                                    ]
                                                  },
                                                  {
                                                    "id": "td_vyk6kpe",
                                                    "tag": "td",
                                                    "attrs": {},
                                                    "classes": [],
                                                    "style": {
                                                      "box-sizing": "border-box",
                                                      "padding": ".8rem .9rem",
                                                      "white-space": "nowrap",
                                                      "border-top": "1px solid var(--border)"
                                                    },
                                                    "children": [
                                                      {
                                                        "id": "#text_ybdtbfh",
                                                        "tag": "#text",
                                                        "text": "CE, RoHS, ISO 9001",
                                                        "children": []
                                                      }
                                                    ]
                                                  }
                                                ]
                                              }
                                            ]
                                          }
                                        ]
                                      }
                                    ]
                                  },
                                  {
                                    "id": "div_e2je1j7",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [
                                      "mt-3"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "button_2atfl1y",
                                        "tag": "button",
                                        "attrs": {},
                                        "classes": [
                                          "btn",
                                          "primary"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_lz9xt8f",
                                            "tag": "#text",
                                            "text": "Ajouter au panier",
                                            "children": []
                                          }
                                        ]
                                      },
                                      {
                                        "id": "button_jgp0fhy",
                                        "tag": "button",
                                        "attrs": {},
                                        "classes": [
                                          "btn"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_b5jpmfu",
                                            "tag": "#text",
                                            "text": "Télécharger la fiche PDF",
                                            "children": []
                                          }
                                        ]
                                      }
                                    ]
                                  }
                                ]
                              }
                            ]
                          }
                        ]
                      },
                      {
                        "id": "section_4igrnr8",
                        "tag": "section",
                        "attrs": {},
                        "classes": [
                          "grid",
                          "mb-3"
                        ],
                        "style": {
                          "box-sizing": "border-box"
                        },
                        "children": [
                          {
                            "id": "article_g9656la",
                            "tag": "article",
                            "attrs": {},
                            "classes": [
                              "card"
                            ],
                            "style": {
                              "box-sizing": "border-box"
                            },
                            "children": [
                              {
                                "id": "h2_lvil3a6",
                                "tag": "h2",
                                "attrs": {},
                                "classes": [
                                  "title",
                                  "mb-0"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "#text_am7y8b8",
                                    "tag": "#text",
                                    "text": "Services managés",
                                    "children": []
                                  }
                                ]
                              },
                              {
                                "id": "div_yp1qll3",
                                "tag": "div",
                                "attrs": {},
                                "classes": [
                                  "subtitle"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "#text_6qqsjgx",
                                    "tag": "#text",
                                    "text": "Ce que nous opérons pour vous",
                                    "children": []
                                  }
                                ]
                              },
                              {
                                "id": "div_w0m9v0j",
                                "tag": "div",
                                "attrs": {},
                                "classes": [
                                  "mt-2",
                                  "feature-list"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "div_6mt921k",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [
                                      "feature"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box",
                                      "marginTop": "23px"
                                    },
                                    "children": [
                                      {
                                        "id": "svg_btpsln2",
                                        "tag": "svg",
                                        "attrs": {
                                          "width": "18",
                                          "height": "18",
                                          "viewBox": "0 0 24 24",
                                          "aria-hidden": "true"
                                        },
                                        "classes": [],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "path_g88s7nh",
                                            "tag": "path",
                                            "attrs": {
                                              "d": "M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z",
                                              "fill": "#111"
                                            },
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box"
                                            },
                                            "children": []
                                          }
                                        ]
                                      },
                                      {
                                        "id": "#text_z3gdlob",
                                        "tag": "#text",
                                        "text": "\n          Sécurité & WAF ",
                                        "children": []
                                      },
                                      {
                                        "id": "span_tnd9ve5",
                                        "tag": "span",
                                        "attrs": {},
                                        "classes": [
                                          "tag"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_7si8n9y",
                                            "tag": "#text",
                                            "text": "24/7",
                                            "children": []
                                          }
                                        ]
                                      }
                                    ]
                                  },
                                  {
                                    "id": "div_sf7ca7c",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [
                                      "feature"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "svg_c7tg10s",
                                        "tag": "svg",
                                        "attrs": {
                                          "width": "18",
                                          "height": "18",
                                          "viewBox": "0 0 24 24",
                                          "aria-hidden": "true"
                                        },
                                        "classes": [],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "path_5e7r8hx",
                                            "tag": "path",
                                            "attrs": {
                                              "d": "M6 18h11a4 4 0 0 0 0-8h-.5A6.5 6.5 0 0 0 4 10.5 4.5 4.5 0 0 0 6 18z",
                                              "fill": "#111"
                                            },
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box"
                                            },
                                            "children": []
                                          }
                                        ]
                                      },
                                      {
                                        "id": "#text_6fpo6ab",
                                        "tag": "#text",
                                        "text": "\n          Hébergement Docker ",
                                        "children": []
                                      },
                                      {
                                        "id": "span_kjidvtc",
                                        "tag": "span",
                                        "attrs": {},
                                        "classes": [
                                          "tag",
                                          "blue"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_pu0hmtg",
                                            "tag": "#text",
                                            "text": "Traefik",
                                            "children": []
                                          }
                                        ]
                                      }
                                    ]
                                  },
                                  {
                                    "id": "div_oo84gb9",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [
                                      "feature"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "svg_03mo4hp",
                                        "tag": "svg",
                                        "attrs": {
                                          "width": "18",
                                          "height": "18",
                                          "viewBox": "0 0 24 24",
                                          "aria-hidden": "true"
                                        },
                                        "classes": [],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "rect_8zchyi0",
                                            "tag": "rect",
                                            "attrs": {
                                              "x": "3",
                                              "y": "11",
                                              "width": "4",
                                              "height": "8",
                                              "fill": "#111"
                                            },
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box"
                                            },
                                            "children": []
                                          },
                                          {
                                            "id": "rect_j1cxcoy",
                                            "tag": "rect",
                                            "attrs": {
                                              "x": "10",
                                              "y": "7",
                                              "width": "4",
                                              "height": "12",
                                              "fill": "#111"
                                            },
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box"
                                            },
                                            "children": []
                                          },
                                          {
                                            "id": "rect_r94ifm0",
                                            "tag": "rect",
                                            "attrs": {
                                              "x": "17",
                                              "y": "4",
                                              "width": "4",
                                              "height": "15",
                                              "fill": "#111"
                                            },
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box"
                                            },
                                            "children": []
                                          }
                                        ]
                                      },
                                      {
                                        "id": "#text_24g4lqi",
                                        "tag": "#text",
                                        "text": "\n          Observabilité & SLA\n        ",
                                        "children": []
                                      }
                                    ]
                                  }
                                ]
                              }
                            ]
                          },
                          {
                            "id": "article_2pd2ahq",
                            "tag": "article",
                            "attrs": {},
                            "classes": [
                              "card"
                            ],
                            "style": {
                              "box-sizing": "border-box"
                            },
                            "children": [
                              {
                                "id": "h2_qwls5y5",
                                "tag": "h2",
                                "attrs": {},
                                "classes": [
                                  "title",
                                  "mb-0"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "#text_56wiwpr",
                                    "tag": "#text",
                                    "text": "Partenaires",
                                    "children": []
                                  }
                                ]
                              },
                              {
                                "id": "div_mw71zu8",
                                "tag": "div",
                                "attrs": {},
                                "classes": [
                                  "subtitle"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "#text_evt5zvc",
                                    "tag": "#text",
                                    "text": "Logos SVG inline",
                                    "children": []
                                  }
                                ]
                              },
                              {
                                "id": "div_17f5f78",
                                "tag": "div",
                                "attrs": {},
                                "classes": [
                                  "row",
                                  "mt-2"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "div_7mb5fna",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [
                                      "col"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "div_zef6eu6",
                                        "tag": "div",
                                        "attrs": {},
                                        "classes": [
                                          "thumb"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "svg_pv3p44z",
                                            "tag": "svg",
                                            "attrs": {
                                              "viewBox": "0 0 160 80",
                                              "role": "img",
                                              "aria-label": "Logo Alpha"
                                            },
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box"
                                            },
                                            "children": [
                                              {
                                                "id": "rect_0m4cshb",
                                                "tag": "rect",
                                                "attrs": {
                                                  "x": "10",
                                                  "y": "10",
                                                  "width": "140",
                                                  "height": "60",
                                                  "rx": "8",
                                                  "fill": "#111"
                                                },
                                                "classes": [],
                                                "style": {
                                                  "box-sizing": "border-box"
                                                },
                                                "children": []
                                              },
                                              {
                                                "id": "text_6k06p4x",
                                                "tag": "text",
                                                "attrs": {
                                                  "x": "80",
                                                  "y": "50",
                                                  "text-anchor": "middle",
                                                  "fill": "#fff",
                                                  "font-size": "22",
                                                  "font-weight": "700"
                                                },
                                                "classes": [],
                                                "style": {
                                                  "box-sizing": "border-box"
                                                },
                                                "children": [
                                                  {
                                                    "id": "#text_ddxlqxc",
                                                    "tag": "#text",
                                                    "text": "ALPHA",
                                                    "children": []
                                                  }
                                                ]
                                              }
                                            ]
                                          }
                                        ]
                                      }
                                    ]
                                  },
                                  {
                                    "id": "div_ffceduk",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [
                                      "col"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "div_t4aeifd",
                                        "tag": "div",
                                        "attrs": {},
                                        "classes": [
                                          "thumb"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": []
                                      }
                                    ]
                                  }
                                ]
                              }
                            ]
                          },
                          {
                            "id": "article_ff3qxh1",
                            "tag": "article",
                            "attrs": {},
                            "classes": [
                              "card"
                            ],
                            "style": {
                              "box-sizing": "border-box"
                            },
                            "children": [
                              {
                                "id": "h2_59lxijv",
                                "tag": "h2",
                                "attrs": {},
                                "classes": [
                                  "title",
                                  "mb-0"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "#text_n0kiq7u",
                                    "tag": "#text",
                                    "text": "Alertes",
                                    "children": []
                                  }
                                ]
                              },
                              {
                                "id": "div_uzd6u06",
                                "tag": "div",
                                "attrs": {},
                                "classes": [
                                  "subtitle"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "#text_j9rwax8",
                                    "tag": "#text",
                                    "text": "Notifications produit & système",
                                    "children": []
                                  }
                                ]
                              },
                              {
                                "id": "div_zwejvkc",
                                "tag": "div",
                                "attrs": {},
                                "classes": [
                                  "mt-2"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "div_8c7029n",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [
                                      "list-item"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "svg_sardd04",
                                        "tag": "svg",
                                        "attrs": {
                                          "width": "18",
                                          "height": "18",
                                          "viewBox": "0 0 24 24",
                                          "aria-hidden": "true"
                                        },
                                        "classes": [],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "circle_6emevru",
                                            "tag": "circle",
                                            "attrs": {
                                              "cx": "12",
                                              "cy": "12",
                                              "r": "10",
                                              "fill": "#10b981"
                                            },
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box"
                                            },
                                            "children": []
                                          }
                                        ]
                                      },
                                      {
                                        "id": "div_i23lcj6",
                                        "tag": "div",
                                        "attrs": {},
                                        "classes": [],
                                        "style": {
                                          "flex": "1",
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_lp26xxd",
                                            "tag": "#text",
                                            "text": "Déploiement terminé ",
                                            "children": []
                                          },
                                          {
                                            "id": "span_ah4apip",
                                            "tag": "span",
                                            "attrs": {},
                                            "classes": [
                                              "meta"
                                            ],
                                            "style": {
                                              "box-sizing": "border-box"
                                            },
                                            "children": [
                                              {
                                                "id": "#text_5gvgywe",
                                                "tag": "#text",
                                                "text": "— 09:31",
                                                "children": []
                                              }
                                            ]
                                          }
                                        ]
                                      },
                                      {
                                        "id": "span_l5rlahy",
                                        "tag": "span",
                                        "attrs": {},
                                        "classes": [
                                          "tag"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_oxqngca",
                                            "tag": "#text",
                                            "text": "CI",
                                            "children": []
                                          }
                                        ]
                                      }
                                    ]
                                  },
                                  {
                                    "id": "div_9qyi2zb",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [
                                      "list-item"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box",
                                      "border-top": "1px solid var(--border)"
                                    },
                                    "children": [
                                      {
                                        "id": "svg_xrgj2oc",
                                        "tag": "svg",
                                        "attrs": {
                                          "width": "18",
                                          "height": "18",
                                          "viewBox": "0 0 24 24"
                                        },
                                        "classes": [],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "circle_erby8i5",
                                            "tag": "circle",
                                            "attrs": {
                                              "cx": "12",
                                              "cy": "12",
                                              "r": "10",
                                              "fill": "#f59e0b"
                                            },
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box"
                                            },
                                            "children": []
                                          }
                                        ]
                                      },
                                      {
                                        "id": "div_j7zlwv4",
                                        "tag": "div",
                                        "attrs": {},
                                        "classes": [],
                                        "style": {
                                          "flex": "1",
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_df3mieq",
                                            "tag": "#text",
                                            "text": "Stock faible TX-18 ",
                                            "children": []
                                          },
                                          {
                                            "id": "span_t5xq53r",
                                            "tag": "span",
                                            "attrs": {},
                                            "classes": [
                                              "meta"
                                            ],
                                            "style": {
                                              "box-sizing": "border-box"
                                            },
                                            "children": [
                                              {
                                                "id": "#text_o0clagf",
                                                "tag": "#text",
                                                "text": "— 10:12",
                                                "children": []
                                              }
                                            ]
                                          }
                                        ]
                                      },
                                      {
                                        "id": "span_28ri4yt",
                                        "tag": "span",
                                        "attrs": {},
                                        "classes": [
                                          "tag",
                                          "warn"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_vcbqehu",
                                            "tag": "#text",
                                            "text": "Stock",
                                            "children": []
                                          }
                                        ]
                                      }
                                    ]
                                  },
                                  {
                                    "id": "div_4taiw9n",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [
                                      "list-item"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box",
                                      "border-top": "1px solid var(--border)"
                                    },
                                    "children": [
                                      {
                                        "id": "svg_f09g8g1",
                                        "tag": "svg",
                                        "attrs": {
                                          "width": "18",
                                          "height": "18",
                                          "viewBox": "0 0 24 24"
                                        },
                                        "classes": [],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "circle_a9vt9qw",
                                            "tag": "circle",
                                            "attrs": {
                                              "cx": "12",
                                              "cy": "12",
                                              "r": "10",
                                              "fill": "#ef4444"
                                            },
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box"
                                            },
                                            "children": []
                                          }
                                        ]
                                      },
                                      {
                                        "id": "div_3sui2sv",
                                        "tag": "div",
                                        "attrs": {},
                                        "classes": [],
                                        "style": {
                                          "flex": "1",
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_pzrr85j",
                                            "tag": "#text",
                                            "text": "Incident réseau #4211 ",
                                            "children": []
                                          },
                                          {
                                            "id": "span_ot7unoa",
                                            "tag": "span",
                                            "attrs": {},
                                            "classes": [
                                              "meta"
                                            ],
                                            "style": {
                                              "box-sizing": "border-box"
                                            },
                                            "children": [
                                              {
                                                "id": "#text_ql21wdk",
                                                "tag": "#text",
                                                "text": "— 10:47",
                                                "children": []
                                              }
                                            ]
                                          }
                                        ]
                                      },
                                      {
                                        "id": "span_s9m2tsr",
                                        "tag": "span",
                                        "attrs": {},
                                        "classes": [
                                          "tag"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_jpccgku",
                                            "tag": "#text",
                                            "text": "Urgent",
                                            "children": []
                                          }
                                        ]
                                      }
                                    ]
                                  }
                                ]
                              }
                            ]
                          }
                        ]
                      },
                      {
                        "id": "section_nfmdx9f",
                        "tag": "section",
                        "attrs": {
                          "id": "fichiers"
                        },
                        "classes": [
                          "card",
                          "mb-3"
                        ],
                        "style": {
                          "box-sizing": "border-box"
                        },
                        "children": [
                          {
                            "id": "div_6huqfmp",
                            "tag": "div",
                            "attrs": {},
                            "classes": [
                              "between"
                            ],
                            "style": {
                              "box-sizing": "border-box"
                            },
                            "children": [
                              {
                                "id": "h2_fou1tcu",
                                "tag": "h2",
                                "attrs": {},
                                "classes": [
                                  "title",
                                  "mb-0"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "#text_zhf9lfp",
                                    "tag": "#text",
                                    "text": "Documents produit",
                                    "children": []
                                  }
                                ]
                              },
                              {
                                "id": "div_g7cyw1g",
                                "tag": "div",
                                "attrs": {},
                                "classes": [
                                  "gap-2"
                                ],
                                "style": {
                                  "display": "flex",
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "button_kyiz4u2",
                                    "tag": "button",
                                    "attrs": {},
                                    "classes": [
                                      "btn"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "#text_yuiakb9",
                                        "tag": "#text",
                                        "text": "Uploader",
                                        "children": []
                                      }
                                    ]
                                  },
                                  {
                                    "id": "button_j4k6o73",
                                    "tag": "button",
                                    "attrs": {},
                                    "classes": [
                                      "btn"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "#text_4qrr3ef",
                                        "tag": "#text",
                                        "text": "Exporter ZIP",
                                        "children": []
                                      }
                                    ]
                                  }
                                ]
                              }
                            ]
                          },
                          {
                            "id": "div_q05im5g",
                            "tag": "div",
                            "attrs": {},
                            "classes": [
                              "grid",
                              "mt-2"
                            ],
                            "style": {
                              "box-sizing": "border-box"
                            },
                            "children": [
                              {
                                "id": "div_z4p3pwa",
                                "tag": "div",
                                "attrs": {},
                                "classes": [
                                  "card"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "div_p9javu5",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [
                                      "between"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "div_6pcdgi8",
                                        "tag": "div",
                                        "attrs": {},
                                        "classes": [
                                          "title",
                                          "mb-0"
                                        ],
                                        "style": {
                                          "font-size": "16px",
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_ovjgveq",
                                            "tag": "#text",
                                            "text": "XR-200_Brochure.pdf",
                                            "children": []
                                          }
                                        ]
                                      },
                                      {
                                        "id": "span_e1crosi",
                                        "tag": "span",
                                        "attrs": {},
                                        "classes": [
                                          "tag",
                                          "blue"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_wi9a8mx",
                                            "tag": "#text",
                                            "text": "PDF",
                                            "children": []
                                          }
                                        ]
                                      }
                                    ]
                                  },
                                  {
                                    "id": "div_d0ngert",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [
                                      "mt-1",
                                      "list-item"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "svg_hr9pld2",
                                        "tag": "svg",
                                        "attrs": {
                                          "width": "36",
                                          "height": "36",
                                          "viewBox": "0 0 24 24",
                                          "aria-hidden": "true"
                                        },
                                        "classes": [],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "path_u7uyqvx",
                                            "tag": "path",
                                            "attrs": {
                                              "d": "M6 2h8l4 4v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z",
                                              "fill": "#e11d48"
                                            },
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box"
                                            },
                                            "children": []
                                          },
                                          {
                                            "id": "path_fp6o3p9",
                                            "tag": "path",
                                            "attrs": {
                                              "d": "M14 2v4h4",
                                              "fill": "#fff",
                                              "opacity": ".5"
                                            },
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box"
                                            },
                                            "children": []
                                          }
                                        ]
                                      },
                                      {
                                        "id": "div_4upb38o",
                                        "tag": "div",
                                        "attrs": {},
                                        "classes": [],
                                        "style": {
                                          "flex": "1",
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "div_zyrwqze",
                                            "tag": "div",
                                            "attrs": {},
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box"
                                            },
                                            "children": [
                                              {
                                                "id": "#text_b1u9909",
                                                "tag": "#text",
                                                "text": "PDF — 2.1 Mo",
                                                "children": []
                                              }
                                            ]
                                          },
                                          {
                                            "id": "div_jnloyv9",
                                            "tag": "div",
                                            "attrs": {},
                                            "classes": [
                                              "meta"
                                            ],
                                            "style": {
                                              "box-sizing": "border-box"
                                            },
                                            "children": [
                                              {
                                                "id": "#text_7jphr2a",
                                                "tag": "#text",
                                                "text": "MAJ 02/08",
                                                "children": []
                                              }
                                            ]
                                          }
                                        ]
                                      },
                                      {
                                        "id": "button_87dk2ah",
                                        "tag": "button",
                                        "attrs": {},
                                        "classes": [
                                          "btn"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_o6xw7hn",
                                            "tag": "#text",
                                            "text": "Ouvrir",
                                            "children": []
                                          }
                                        ]
                                      }
                                    ]
                                  }
                                ]
                              },
                              {
                                "id": "div_qzceoa7",
                                "tag": "div",
                                "attrs": {},
                                "classes": [
                                  "card"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "div_1cejknz",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [
                                      "between"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "div_9p5ccl8",
                                        "tag": "div",
                                        "attrs": {},
                                        "classes": [
                                          "title",
                                          "mb-0"
                                        ],
                                        "style": {
                                          "font-size": "16px",
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_iefr43k",
                                            "tag": "#text",
                                            "text": "XR-200_Specs.xlsx",
                                            "children": []
                                          }
                                        ]
                                      },
                                      {
                                        "id": "span_5v1qqsn",
                                        "tag": "span",
                                        "attrs": {},
                                        "classes": [
                                          "tag"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_mi7vxg5",
                                            "tag": "#text",
                                            "text": "XLSX",
                                            "children": []
                                          }
                                        ]
                                      }
                                    ]
                                  },
                                  {
                                    "id": "div_nktysqr",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [
                                      "mt-1",
                                      "list-item"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "svg_yqffdil",
                                        "tag": "svg",
                                        "attrs": {
                                          "width": "36",
                                          "height": "36",
                                          "viewBox": "0 0 24 24",
                                          "aria-hidden": "true"
                                        },
                                        "classes": [],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "path_37edc6b",
                                            "tag": "path",
                                            "attrs": {
                                              "d": "M6 2h8l4 4v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z",
                                              "fill": "#111"
                                            },
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box"
                                            },
                                            "children": []
                                          },
                                          {
                                            "id": "rect_0kruccz",
                                            "tag": "rect",
                                            "attrs": {
                                              "x": "8",
                                              "y": "8",
                                              "width": "8",
                                              "height": "8",
                                              "fill": "#e5e7eb"
                                            },
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box"
                                            },
                                            "children": []
                                          },
                                          {
                                            "id": "path_64hojjq",
                                            "tag": "path",
                                            "attrs": {
                                              "d": "M8 12h8M12 8v8",
                                              "stroke": "#111",
                                              "stroke-width": "1"
                                            },
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box"
                                            },
                                            "children": []
                                          }
                                        ]
                                      },
                                      {
                                        "id": "div_hkdqfo2",
                                        "tag": "div",
                                        "attrs": {},
                                        "classes": [],
                                        "style": {
                                          "flex": "1",
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "div_y897cn9",
                                            "tag": "div",
                                            "attrs": {},
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box"
                                            },
                                            "children": [
                                              {
                                                "id": "#text_sycxwc8",
                                                "tag": "#text",
                                                "text": "Tableur — 420 Ko",
                                                "children": []
                                              }
                                            ]
                                          },
                                          {
                                            "id": "div_z9dq8sa",
                                            "tag": "div",
                                            "attrs": {},
                                            "classes": [
                                              "meta"
                                            ],
                                            "style": {
                                              "box-sizing": "border-box"
                                            },
                                            "children": [
                                              {
                                                "id": "#text_bs0v343",
                                                "tag": "#text",
                                                "text": "MAJ 28/07",
                                                "children": []
                                              }
                                            ]
                                          }
                                        ]
                                      },
                                      {
                                        "id": "button_ocztj59",
                                        "tag": "button",
                                        "attrs": {},
                                        "classes": [
                                          "btn"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_x1m33va",
                                            "tag": "#text",
                                            "text": "Télécharger",
                                            "children": []
                                          }
                                        ]
                                      }
                                    ]
                                  }
                                ]
                              },
                              {
                                "id": "div_jh9wfmf",
                                "tag": "div",
                                "attrs": {},
                                "classes": [
                                  "card"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "div_w1ojo7b",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [
                                      "between"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "div_nouk6mv",
                                        "tag": "div",
                                        "attrs": {},
                                        "classes": [
                                          "title",
                                          "mb-0"
                                        ],
                                        "style": {
                                          "font-size": "16px",
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_nb485bp",
                                            "tag": "#text",
                                            "text": "Photos XR-200",
                                            "children": []
                                          }
                                        ]
                                      },
                                      {
                                        "id": "span_5a3lpf4",
                                        "tag": "span",
                                        "attrs": {},
                                        "classes": [
                                          "tag"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_fbg8gfi",
                                            "tag": "#text",
                                            "text": "Dossier",
                                            "children": []
                                          }
                                        ]
                                      }
                                    ]
                                  },
                                  {
                                    "id": "div_oyk2ua7",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [
                                      "mt-1",
                                      "list-item"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "svg_o5iga7l",
                                        "tag": "svg",
                                        "attrs": {
                                          "width": "36",
                                          "height": "36",
                                          "viewBox": "0 0 24 24",
                                          "aria-hidden": "true"
                                        },
                                        "classes": [],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "path_mjogefd",
                                            "tag": "path",
                                            "attrs": {
                                              "d": "M3 6h6l2 2h10v10a2 2 0 0 1-2 2H3z",
                                              "fill": "#e5e7eb",
                                              "stroke": "#111"
                                            },
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box"
                                            },
                                            "children": []
                                          }
                                        ]
                                      },
                                      {
                                        "id": "div_f69ws4r",
                                        "tag": "div",
                                        "attrs": {},
                                        "classes": [],
                                        "style": {
                                          "flex": "1",
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "div_0732ijp",
                                            "tag": "div",
                                            "attrs": {},
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box"
                                            },
                                            "children": [
                                              {
                                                "id": "#text_xppr85g",
                                                "tag": "#text",
                                                "text": "12 éléments",
                                                "children": []
                                              }
                                            ]
                                          },
                                          {
                                            "id": "div_tavc6l7",
                                            "tag": "div",
                                            "attrs": {},
                                            "classes": [
                                              "meta"
                                            ],
                                            "style": {
                                              "box-sizing": "border-box"
                                            },
                                            "children": [
                                              {
                                                "id": "#text_4kbct4q",
                                                "tag": "#text",
                                                "text": "MAJ 01/08",
                                                "children": []
                                              }
                                            ]
                                          }
                                        ]
                                      },
                                      {
                                        "id": "button_ueyudku",
                                        "tag": "button",
                                        "attrs": {},
                                        "classes": [
                                          "btn"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_ykql2w8",
                                            "tag": "#text",
                                            "text": "Ouvrir",
                                            "children": []
                                          }
                                        ]
                                      }
                                    ]
                                  }
                                ]
                              }
                            ]
                          }
                        ]
                      },
                      {
                        "id": "section_sfyhxha",
                        "tag": "section",
                        "attrs": {
                          "id": "kanban"
                        },
                        "classes": [
                          "kanban",
                          "mb-3"
                        ],
                        "style": {
                          "box-sizing": "border-box"
                        },
                        "children": [
                          {
                            "id": "div_31x8b6k",
                            "tag": "div",
                            "attrs": {},
                            "classes": [
                              "kan-col"
                            ],
                            "style": {
                              "box-sizing": "border-box"
                            },
                            "children": [
                              {
                                "id": "div_n6x048k",
                                "tag": "div",
                                "attrs": {},
                                "classes": [
                                  "between",
                                  "mb-1"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "strong_mwh6z6x",
                                    "tag": "strong",
                                    "attrs": {},
                                    "classes": [],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "#text_bkeucil",
                                        "tag": "#text",
                                        "text": "À faire",
                                        "children": []
                                      }
                                    ]
                                  },
                                  {
                                    "id": "span_1rk2wfw",
                                    "tag": "span",
                                    "attrs": {},
                                    "classes": [
                                      "tag"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "#text_h0me491",
                                        "tag": "#text",
                                        "text": "3",
                                        "children": []
                                      }
                                    ]
                                  }
                                ]
                              },
                              {
                                "id": "div_m94i7m5",
                                "tag": "div",
                                "attrs": {},
                                "classes": [
                                  "ticket"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "div_r53q38b",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [
                                      "between"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "div_orpwu78",
                                        "tag": "div",
                                        "attrs": {},
                                        "classes": [],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_tyh35y8",
                                            "tag": "#text",
                                            "text": "Intégrer fiche XR-200",
                                            "children": []
                                          }
                                        ]
                                      },
                                      {
                                        "id": "span_6ooio2l",
                                        "tag": "span",
                                        "attrs": {},
                                        "classes": [
                                          "avatar"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_x6gf6mm",
                                            "tag": "#text",
                                            "text": "AL",
                                            "children": []
                                          }
                                        ]
                                      }
                                    ]
                                  },
                                  {
                                    "id": "div_ra3rz3j",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [
                                      "meta"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "#text_o8zgkld",
                                        "tag": "#text",
                                        "text": "Priorité: Haute",
                                        "children": []
                                      }
                                    ]
                                  }
                                ]
                              },
                              {
                                "id": "div_zp2dxi5",
                                "tag": "div",
                                "attrs": {},
                                "classes": [
                                  "ticket"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "div_x40qk0s",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [
                                      "between"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "div_gmobdk2",
                                        "tag": "div",
                                        "attrs": {},
                                        "classes": [],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_gfip81o",
                                            "tag": "#text",
                                            "text": "Photo produit retouches",
                                            "children": []
                                          }
                                        ]
                                      },
                                      {
                                        "id": "span_gq9atug",
                                        "tag": "span",
                                        "attrs": {},
                                        "classes": [
                                          "avatar"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_yuzbflq",
                                            "tag": "#text",
                                            "text": "MB",
                                            "children": []
                                          }
                                        ]
                                      }
                                    ]
                                  },
                                  {
                                    "id": "div_46eqzar",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [
                                      "meta"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "#text_hutvyja",
                                        "tag": "#text",
                                        "text": "Priorité: Moyenne",
                                        "children": []
                                      }
                                    ]
                                  }
                                ]
                              },
                              {
                                "id": "div_nmq4osu",
                                "tag": "div",
                                "attrs": {},
                                "classes": [
                                  "ticket"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "div_b3bmf4s",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [
                                      "between"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "div_ujhk02s",
                                        "tag": "div",
                                        "attrs": {},
                                        "classes": [],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_7e9mjdi",
                                            "tag": "#text",
                                            "text": "Traduction EN",
                                            "children": []
                                          }
                                        ]
                                      },
                                      {
                                        "id": "span_mej90vr",
                                        "tag": "span",
                                        "attrs": {},
                                        "classes": [
                                          "avatar"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_nyf60yx",
                                            "tag": "#text",
                                            "text": "XS",
                                            "children": []
                                          }
                                        ]
                                      }
                                    ]
                                  },
                                  {
                                    "id": "div_wz3u79v",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [
                                      "meta"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "#text_1d827jj",
                                        "tag": "#text",
                                        "text": "Priorité: Basse",
                                        "children": []
                                      }
                                    ]
                                  }
                                ]
                              }
                            ]
                          },
                          {
                            "id": "div_4nxoff6",
                            "tag": "div",
                            "attrs": {},
                            "classes": [
                              "kan-col"
                            ],
                            "style": {
                              "box-sizing": "border-box"
                            },
                            "children": [
                              {
                                "id": "div_gy6x74k",
                                "tag": "div",
                                "attrs": {},
                                "classes": [
                                  "between",
                                  "mb-1"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "strong_kfljghp",
                                    "tag": "strong",
                                    "attrs": {},
                                    "classes": [],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "#text_89obw54",
                                        "tag": "#text",
                                        "text": "En cours",
                                        "children": []
                                      }
                                    ]
                                  },
                                  {
                                    "id": "span_fy0ef3i",
                                    "tag": "span",
                                    "attrs": {},
                                    "classes": [
                                      "tag",
                                      "blue"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "#text_bctk7g5",
                                        "tag": "#text",
                                        "text": "2",
                                        "children": []
                                      }
                                    ]
                                  }
                                ]
                              },
                              {
                                "id": "div_yu0ksqd",
                                "tag": "div",
                                "attrs": {},
                                "classes": [
                                  "ticket"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "div_rja62bh",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [
                                      "between"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "div_q1cg975",
                                        "tag": "div",
                                        "attrs": {},
                                        "classes": [],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_j070ped",
                                            "tag": "#text",
                                            "text": "Refonte page “Catalogue”",
                                            "children": []
                                          }
                                        ]
                                      },
                                      {
                                        "id": "span_i2ljy3w",
                                        "tag": "span",
                                        "attrs": {},
                                        "classes": [
                                          "avatar"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_a88y52y",
                                            "tag": "#text",
                                            "text": "AL",
                                            "children": []
                                          }
                                        ]
                                      }
                                    ]
                                  },
                                  {
                                    "id": "div_pm8nyp9",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [
                                      "progress",
                                      "mt-1"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "span_zs4koxn",
                                        "tag": "span",
                                        "attrs": {},
                                        "classes": [],
                                        "style": {
                                          "width": "60%",
                                          "box-sizing": "border-box",
                                          "display": "block",
                                          "height": "100%",
                                          "background": "#111"
                                        },
                                        "children": []
                                      }
                                    ]
                                  }
                                ]
                              },
                              {
                                "id": "div_zc1xqja",
                                "tag": "div",
                                "attrs": {},
                                "classes": [
                                  "ticket"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "div_qy3ere1",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [
                                      "between"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "div_qfrbt2t",
                                        "tag": "div",
                                        "attrs": {},
                                        "classes": [],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_w6tf21m",
                                            "tag": "#text",
                                            "text": "Contrats maintenance",
                                            "children": []
                                          }
                                        ]
                                      },
                                      {
                                        "id": "span_htiz629",
                                        "tag": "span",
                                        "attrs": {},
                                        "classes": [
                                          "avatar"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_77smok5",
                                            "tag": "#text",
                                            "text": "MB",
                                            "children": []
                                          }
                                        ]
                                      }
                                    ]
                                  },
                                  {
                                    "id": "div_c1sxq06",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [
                                      "progress",
                                      "mt-1"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "span_covohcp",
                                        "tag": "span",
                                        "attrs": {},
                                        "classes": [],
                                        "style": {
                                          "width": "60%",
                                          "box-sizing": "border-box",
                                          "display": "block",
                                          "height": "100%",
                                          "background": "#111"
                                        },
                                        "children": []
                                      }
                                    ]
                                  }
                                ]
                              }
                            ]
                          },
                          {
                            "id": "div_hybtn6x",
                            "tag": "div",
                            "attrs": {},
                            "classes": [
                              "kan-col"
                            ],
                            "style": {
                              "box-sizing": "border-box"
                            },
                            "children": [
                              {
                                "id": "div_jt5bcz4",
                                "tag": "div",
                                "attrs": {},
                                "classes": [
                                  "between",
                                  "mb-1"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "strong_o69gr9d",
                                    "tag": "strong",
                                    "attrs": {},
                                    "classes": [],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "#text_mendn9s",
                                        "tag": "#text",
                                        "text": "Fait",
                                        "children": []
                                      }
                                    ]
                                  },
                                  {
                                    "id": "span_zfenuzy",
                                    "tag": "span",
                                    "attrs": {},
                                    "classes": [
                                      "tag"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "#text_jgs3c4x",
                                        "tag": "#text",
                                        "text": "4",
                                        "children": []
                                      }
                                    ]
                                  }
                                ]
                              },
                              {
                                "id": "div_bs8kci9",
                                "tag": "div",
                                "attrs": {},
                                "classes": [
                                  "ticket"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "div_7hyje4m",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [
                                      "between"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "div_qd085v0",
                                        "tag": "div",
                                        "attrs": {},
                                        "classes": [],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_79nrtoh",
                                            "tag": "#text",
                                            "text": "Template facture",
                                            "children": []
                                          }
                                        ]
                                      },
                                      {
                                        "id": "span_ii7tu5r",
                                        "tag": "span",
                                        "attrs": {},
                                        "classes": [
                                          "avatar"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_2kityxv",
                                            "tag": "#text",
                                            "text": "XS",
                                            "children": []
                                          }
                                        ]
                                      }
                                    ]
                                  },
                                  {
                                    "id": "div_1bo4llv",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [
                                      "meta"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "#text_sv07pme",
                                        "tag": "#text",
                                        "text": "Clôturé 12/08",
                                        "children": []
                                      }
                                    ]
                                  }
                                ]
                              },
                              {
                                "id": "div_twrzkhw",
                                "tag": "div",
                                "attrs": {},
                                "classes": [
                                  "ticket"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "div_62ijndm",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [
                                      "between"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "div_74zoetd",
                                        "tag": "div",
                                        "attrs": {},
                                        "classes": [],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_4raam8a",
                                            "tag": "#text",
                                            "text": "Procédure SAV",
                                            "children": []
                                          }
                                        ]
                                      },
                                      {
                                        "id": "span_k0721xu",
                                        "tag": "span",
                                        "attrs": {},
                                        "classes": [
                                          "avatar"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_ek3g1ia",
                                            "tag": "#text",
                                            "text": "AL",
                                            "children": []
                                          }
                                        ]
                                      }
                                    ]
                                  },
                                  {
                                    "id": "div_eqctqjz",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [
                                      "meta"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "#text_xp3zm41",
                                        "tag": "#text",
                                        "text": "Clôturé 09/08",
                                        "children": []
                                      }
                                    ]
                                  }
                                ]
                              }
                            ]
                          }
                        ]
                      },
                      {
                        "id": "section_l16oz47",
                        "tag": "section",
                        "attrs": {
                          "id": "commandes"
                        },
                        "classes": [
                          "mb-3"
                        ],
                        "style": {
                          "box-sizing": "border-box"
                        },
                        "children": [
                          {
                            "id": "div_mio597d",
                            "tag": "div",
                            "attrs": {},
                            "classes": [
                              "between",
                              "mb-2"
                            ],
                            "style": {
                              "box-sizing": "border-box"
                            },
                            "children": [
                              {
                                "id": "div_jsdi1k7",
                                "tag": "div",
                                "attrs": {},
                                "classes": [],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "h2_g915tz1",
                                    "tag": "h2",
                                    "attrs": {},
                                    "classes": [
                                      "title",
                                      "mb-0"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "#text_2wfv8xj",
                                        "tag": "#text",
                                        "text": "Commandes récentes",
                                        "children": []
                                      }
                                    ]
                                  },
                                  {
                                    "id": "div_l5drblx",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [
                                      "subtitle"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "#text_rprdplk",
                                        "tag": "#text",
                                        "text": "30 derniers jours",
                                        "children": []
                                      }
                                    ]
                                  }
                                ]
                              },
                              {
                                "id": "div_eyuaa88",
                                "tag": "div",
                                "attrs": {},
                                "classes": [
                                  "gap-2"
                                ],
                                "style": {
                                  "display": "flex",
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "button_4a1iwmp",
                                    "tag": "button",
                                    "attrs": {},
                                    "classes": [
                                      "btn"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "#text_2u0b6ml",
                                        "tag": "#text",
                                        "text": "Filtrer",
                                        "children": []
                                      }
                                    ]
                                  },
                                  {
                                    "id": "button_4qf8jon",
                                    "tag": "button",
                                    "attrs": {},
                                    "classes": [
                                      "btn"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "#text_q9bmx1c",
                                        "tag": "#text",
                                        "text": "Exporter CSV",
                                        "children": []
                                      }
                                    ]
                                  }
                                ]
                              }
                            ]
                          },
                          {
                            "id": "div_vhyuluv",
                            "tag": "div",
                            "attrs": {},
                            "classes": [
                              "table-wrap"
                            ],
                            "style": {
                              "box-sizing": "border-box"
                            },
                            "children": [
                              {
                                "id": "table_02n6y0a",
                                "tag": "table",
                                "attrs": {
                                  "aria-label": "Commandes récentes"
                                },
                                "classes": [],
                                "style": {
                                  "box-sizing": "border-box",
                                  "width": "100%",
                                  "border-collapse": "collapse",
                                  "font-size": "14px"
                                },
                                "children": [
                                  {
                                    "id": "thead_fqxpn7y",
                                    "tag": "thead",
                                    "attrs": {},
                                    "classes": [],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "tr_xlffk2i",
                                        "tag": "tr",
                                        "attrs": {},
                                        "classes": [],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "th_xk00utd",
                                            "tag": "th",
                                            "attrs": {},
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box",
                                              "padding": ".8rem .9rem",
                                              "white-space": "nowrap",
                                              "text-align": "left",
                                              "color": "#374151",
                                              "background": "#fafafa",
                                              "border-bottom": "1px solid var(--border)",
                                              "position": "sticky",
                                              "top": "0"
                                            },
                                            "children": [
                                              {
                                                "id": "#text_ydcs9n3",
                                                "tag": "#text",
                                                "text": "Commande",
                                                "children": []
                                              }
                                            ]
                                          },
                                          {
                                            "id": "th_08881rm",
                                            "tag": "th",
                                            "attrs": {},
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box",
                                              "padding": ".8rem .9rem",
                                              "white-space": "nowrap",
                                              "text-align": "left",
                                              "color": "#374151",
                                              "background": "#fafafa",
                                              "border-bottom": "1px solid var(--border)",
                                              "position": "sticky",
                                              "top": "0"
                                            },
                                            "children": [
                                              {
                                                "id": "#text_o88915l",
                                                "tag": "#text",
                                                "text": "Client",
                                                "children": []
                                              }
                                            ]
                                          },
                                          {
                                            "id": "th_tq0kyzr",
                                            "tag": "th",
                                            "attrs": {},
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box",
                                              "padding": ".8rem .9rem",
                                              "white-space": "nowrap",
                                              "text-align": "left",
                                              "color": "#374151",
                                              "background": "#fafafa",
                                              "border-bottom": "1px solid var(--border)",
                                              "position": "sticky",
                                              "top": "0"
                                            },
                                            "children": [
                                              {
                                                "id": "#text_mm9bste",
                                                "tag": "#text",
                                                "text": "Date",
                                                "children": []
                                              }
                                            ]
                                          },
                                          {
                                            "id": "th_9662nmz",
                                            "tag": "th",
                                            "attrs": {},
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box",
                                              "padding": ".8rem .9rem",
                                              "white-space": "nowrap",
                                              "text-align": "left",
                                              "color": "#374151",
                                              "background": "#fafafa",
                                              "border-bottom": "1px solid var(--border)",
                                              "position": "sticky",
                                              "top": "0"
                                            },
                                            "children": [
                                              {
                                                "id": "#text_e1yww44",
                                                "tag": "#text",
                                                "text": "Montant",
                                                "children": []
                                              }
                                            ]
                                          },
                                          {
                                            "id": "th_bj9sawc",
                                            "tag": "th",
                                            "attrs": {},
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box",
                                              "padding": ".8rem .9rem",
                                              "white-space": "nowrap",
                                              "text-align": "left",
                                              "color": "#374151",
                                              "background": "#fafafa",
                                              "border-bottom": "1px solid var(--border)",
                                              "position": "sticky",
                                              "top": "0"
                                            },
                                            "children": [
                                              {
                                                "id": "#text_c3lrm7i",
                                                "tag": "#text",
                                                "text": "Statut",
                                                "children": []
                                              }
                                            ]
                                          },
                                          {
                                            "id": "th_z0uvffz",
                                            "tag": "th",
                                            "attrs": {},
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box",
                                              "padding": ".8rem .9rem",
                                              "white-space": "nowrap",
                                              "text-align": "left",
                                              "color": "#374151",
                                              "background": "#fafafa",
                                              "border-bottom": "1px solid var(--border)",
                                              "position": "sticky",
                                              "top": "0"
                                            },
                                            "children": [
                                              {
                                                "id": "#text_ftlfd91",
                                                "tag": "#text",
                                                "text": "Commercial",
                                                "children": []
                                              }
                                            ]
                                          },
                                          {
                                            "id": "th_z0viy1p",
                                            "tag": "th",
                                            "attrs": {},
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box",
                                              "padding": ".8rem .9rem",
                                              "white-space": "nowrap",
                                              "text-align": "left",
                                              "color": "#374151",
                                              "background": "#fafafa",
                                              "border-bottom": "1px solid var(--border)",
                                              "position": "sticky",
                                              "top": "0"
                                            },
                                            "children": [
                                              {
                                                "id": "#text_bo8g8mt",
                                                "tag": "#text",
                                                "text": "Actions",
                                                "children": []
                                              }
                                            ]
                                          }
                                        ]
                                      }
                                    ]
                                  },
                                  {
                                    "id": "tbody_97wk4z0",
                                    "tag": "tbody",
                                    "attrs": {},
                                    "classes": [],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "tr_iukfeax",
                                        "tag": "tr",
                                        "attrs": {},
                                        "classes": [],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "td_nwoek9i",
                                            "tag": "td",
                                            "attrs": {},
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box",
                                              "padding": ".8rem .9rem",
                                              "white-space": "nowrap"
                                            },
                                            "children": [
                                              {
                                                "id": "#text_9adf1qa",
                                                "tag": "#text",
                                                "text": "#10241",
                                                "children": []
                                              }
                                            ]
                                          },
                                          {
                                            "id": "td_zdju015",
                                            "tag": "td",
                                            "attrs": {},
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box",
                                              "padding": ".8rem .9rem",
                                              "white-space": "nowrap"
                                            },
                                            "children": [
                                              {
                                                "id": "#text_mcl042r",
                                                "tag": "#text",
                                                "text": "Acme SAS",
                                                "children": []
                                              }
                                            ]
                                          },
                                          {
                                            "id": "td_ichrn4w",
                                            "tag": "td",
                                            "attrs": {},
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box",
                                              "padding": ".8rem .9rem",
                                              "white-space": "nowrap"
                                            },
                                            "children": [
                                              {
                                                "id": "#text_luvxx6j",
                                                "tag": "#text",
                                                "text": "12/08",
                                                "children": []
                                              }
                                            ]
                                          },
                                          {
                                            "id": "td_h43p1t5",
                                            "tag": "td",
                                            "attrs": {},
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box",
                                              "padding": ".8rem .9rem",
                                              "white-space": "nowrap"
                                            },
                                            "children": [
                                              {
                                                "id": "#text_1lerat2",
                                                "tag": "#text",
                                                "text": "€ 12 400",
                                                "children": []
                                              }
                                            ]
                                          },
                                          {
                                            "id": "td_fff63l5",
                                            "tag": "td",
                                            "attrs": {},
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box",
                                              "padding": ".8rem .9rem",
                                              "white-space": "nowrap"
                                            },
                                            "children": [
                                              {
                                                "id": "span_kb4o3sy",
                                                "tag": "span",
                                                "attrs": {},
                                                "classes": [
                                                  "tag"
                                                ],
                                                "style": {
                                                  "box-sizing": "border-box"
                                                },
                                                "children": [
                                                  {
                                                    "id": "#text_upzqw4g",
                                                    "tag": "#text",
                                                    "text": "En cours",
                                                    "children": []
                                                  }
                                                ]
                                              }
                                            ]
                                          },
                                          {
                                            "id": "td_n29elou",
                                            "tag": "td",
                                            "attrs": {},
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box",
                                              "padding": ".8rem .9rem",
                                              "white-space": "nowrap"
                                            },
                                            "children": [
                                              {
                                                "id": "span_3b7hbyl",
                                                "tag": "span",
                                                "attrs": {},
                                                "classes": [
                                                  "avatar"
                                                ],
                                                "style": {
                                                  "box-sizing": "border-box"
                                                },
                                                "children": [
                                                  {
                                                    "id": "#text_q8614g4",
                                                    "tag": "#text",
                                                    "text": "AL",
                                                    "children": []
                                                  }
                                                ]
                                              }
                                            ]
                                          },
                                          {
                                            "id": "td_upq6rld",
                                            "tag": "td",
                                            "attrs": {},
                                            "classes": [
                                              "table-actions"
                                            ],
                                            "style": {
                                              "box-sizing": "border-box",
                                              "padding": ".8rem .9rem",
                                              "white-space": "nowrap"
                                            },
                                            "children": [
                                              {
                                                "id": "span_zdisv54",
                                                "tag": "span",
                                                "attrs": {},
                                                "classes": [
                                                  "btn"
                                                ],
                                                "style": {
                                                  "box-sizing": "border-box"
                                                },
                                                "children": [
                                                  {
                                                    "id": "#text_7442zej",
                                                    "tag": "#text",
                                                    "text": "Voir",
                                                    "children": []
                                                  }
                                                ]
                                              },
                                              {
                                                "id": "span_ogf5exu",
                                                "tag": "span",
                                                "attrs": {},
                                                "classes": [
                                                  "btn"
                                                ],
                                                "style": {
                                                  "box-sizing": "border-box"
                                                },
                                                "children": [
                                                  {
                                                    "id": "#text_xzczphh",
                                                    "tag": "#text",
                                                    "text": "PDF",
                                                    "children": []
                                                  }
                                                ]
                                              }
                                            ]
                                          }
                                        ]
                                      },
                                      {
                                        "id": "tr_frr9qpl",
                                        "tag": "tr",
                                        "attrs": {},
                                        "classes": [],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "td_rna224h",
                                            "tag": "td",
                                            "attrs": {},
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box",
                                              "padding": ".8rem .9rem",
                                              "white-space": "nowrap",
                                              "border-top": "1px solid var(--border)"
                                            },
                                            "children": [
                                              {
                                                "id": "#text_e0e1fjf",
                                                "tag": "#text",
                                                "text": "#10238",
                                                "children": []
                                              }
                                            ]
                                          },
                                          {
                                            "id": "td_8gcym2c",
                                            "tag": "td",
                                            "attrs": {},
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box",
                                              "padding": ".8rem .9rem",
                                              "white-space": "nowrap",
                                              "border-top": "1px solid var(--border)"
                                            },
                                            "children": [
                                              {
                                                "id": "#text_1zorg9o",
                                                "tag": "#text",
                                                "text": "Globex",
                                                "children": []
                                              }
                                            ]
                                          },
                                          {
                                            "id": "td_4ujqr6m",
                                            "tag": "td",
                                            "attrs": {},
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box",
                                              "padding": ".8rem .9rem",
                                              "white-space": "nowrap",
                                              "border-top": "1px solid var(--border)"
                                            },
                                            "children": [
                                              {
                                                "id": "#text_c60i5iw",
                                                "tag": "#text",
                                                "text": "10/08",
                                                "children": []
                                              }
                                            ]
                                          },
                                          {
                                            "id": "td_lddtlvm",
                                            "tag": "td",
                                            "attrs": {},
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box",
                                              "padding": ".8rem .9rem",
                                              "white-space": "nowrap",
                                              "border-top": "1px solid var(--border)"
                                            },
                                            "children": [
                                              {
                                                "id": "#text_ngexsb3",
                                                "tag": "#text",
                                                "text": "€ 7 980",
                                                "children": []
                                              }
                                            ]
                                          },
                                          {
                                            "id": "td_76u9k15",
                                            "tag": "td",
                                            "attrs": {},
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box",
                                              "padding": ".8rem .9rem",
                                              "white-space": "nowrap",
                                              "border-top": "1px solid var(--border)"
                                            },
                                            "children": [
                                              {
                                                "id": "span_95en2i2",
                                                "tag": "span",
                                                "attrs": {},
                                                "classes": [
                                                  "tag",
                                                  "blue"
                                                ],
                                                "style": {
                                                  "box-sizing": "border-box"
                                                },
                                                "children": [
                                                  {
                                                    "id": "#text_ztxzuwi",
                                                    "tag": "#text",
                                                    "text": "Payé",
                                                    "children": []
                                                  }
                                                ]
                                              }
                                            ]
                                          },
                                          {
                                            "id": "td_byv9zvl",
                                            "tag": "td",
                                            "attrs": {},
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box",
                                              "padding": ".8rem .9rem",
                                              "white-space": "nowrap",
                                              "border-top": "1px solid var(--border)"
                                            },
                                            "children": [
                                              {
                                                "id": "span_l8d1qkk",
                                                "tag": "span",
                                                "attrs": {},
                                                "classes": [
                                                  "avatar"
                                                ],
                                                "style": {
                                                  "box-sizing": "border-box"
                                                },
                                                "children": [
                                                  {
                                                    "id": "#text_1vritbs",
                                                    "tag": "#text",
                                                    "text": "MB",
                                                    "children": []
                                                  }
                                                ]
                                              }
                                            ]
                                          },
                                          {
                                            "id": "td_xejwwc9",
                                            "tag": "td",
                                            "attrs": {},
                                            "classes": [
                                              "table-actions"
                                            ],
                                            "style": {
                                              "box-sizing": "border-box",
                                              "padding": ".8rem .9rem",
                                              "white-space": "nowrap",
                                              "border-top": "1px solid var(--border)"
                                            },
                                            "children": [
                                              {
                                                "id": "span_axy3kuk",
                                                "tag": "span",
                                                "attrs": {},
                                                "classes": [
                                                  "btn"
                                                ],
                                                "style": {
                                                  "box-sizing": "border-box"
                                                },
                                                "children": [
                                                  {
                                                    "id": "#text_gzf03ee",
                                                    "tag": "#text",
                                                    "text": "Voir",
                                                    "children": []
                                                  }
                                                ]
                                              },
                                              {
                                                "id": "span_0344ztl",
                                                "tag": "span",
                                                "attrs": {},
                                                "classes": [
                                                  "btn"
                                                ],
                                                "style": {
                                                  "box-sizing": "border-box"
                                                },
                                                "children": [
                                                  {
                                                    "id": "#text_5t41xg7",
                                                    "tag": "#text",
                                                    "text": "PDF",
                                                    "children": []
                                                  }
                                                ]
                                              }
                                            ]
                                          }
                                        ]
                                      },
                                      {
                                        "id": "tr_w3aha6d",
                                        "tag": "tr",
                                        "attrs": {},
                                        "classes": [],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "td_k5mv4sl",
                                            "tag": "td",
                                            "attrs": {},
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box",
                                              "padding": ".8rem .9rem",
                                              "white-space": "nowrap",
                                              "border-top": "1px solid var(--border)"
                                            },
                                            "children": [
                                              {
                                                "id": "#text_hllpz1l",
                                                "tag": "#text",
                                                "text": "#10233",
                                                "children": []
                                              }
                                            ]
                                          },
                                          {
                                            "id": "td_swov99b",
                                            "tag": "td",
                                            "attrs": {},
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box",
                                              "padding": ".8rem .9rem",
                                              "white-space": "nowrap",
                                              "border-top": "1px solid var(--border)"
                                            },
                                            "children": [
                                              {
                                                "id": "#text_n884r2l",
                                                "tag": "#text",
                                                "text": "Innotech",
                                                "children": []
                                              }
                                            ]
                                          },
                                          {
                                            "id": "td_rn1s0yc",
                                            "tag": "td",
                                            "attrs": {},
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box",
                                              "padding": ".8rem .9rem",
                                              "white-space": "nowrap",
                                              "border-top": "1px solid var(--border)"
                                            },
                                            "children": [
                                              {
                                                "id": "#text_mce0lj9",
                                                "tag": "#text",
                                                "text": "08/08",
                                                "children": []
                                              }
                                            ]
                                          },
                                          {
                                            "id": "td_r3zuk7t",
                                            "tag": "td",
                                            "attrs": {},
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box",
                                              "padding": ".8rem .9rem",
                                              "white-space": "nowrap",
                                              "border-top": "1px solid var(--border)"
                                            },
                                            "children": [
                                              {
                                                "id": "#text_pfgmxv0",
                                                "tag": "#text",
                                                "text": "€ 22 150",
                                                "children": []
                                              }
                                            ]
                                          },
                                          {
                                            "id": "td_wp8hiri",
                                            "tag": "td",
                                            "attrs": {},
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box",
                                              "padding": ".8rem .9rem",
                                              "white-space": "nowrap",
                                              "border-top": "1px solid var(--border)"
                                            },
                                            "children": [
                                              {
                                                "id": "span_itj7xuw",
                                                "tag": "span",
                                                "attrs": {},
                                                "classes": [
                                                  "tag",
                                                  "warn"
                                                ],
                                                "style": {
                                                  "box-sizing": "border-box"
                                                },
                                                "children": [
                                                  {
                                                    "id": "#text_twoxksa",
                                                    "tag": "#text",
                                                    "text": "En attente",
                                                    "children": []
                                                  }
                                                ]
                                              }
                                            ]
                                          },
                                          {
                                            "id": "td_7adser4",
                                            "tag": "td",
                                            "attrs": {},
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box",
                                              "padding": ".8rem .9rem",
                                              "white-space": "nowrap",
                                              "border-top": "1px solid var(--border)"
                                            },
                                            "children": [
                                              {
                                                "id": "span_gwt3u4v",
                                                "tag": "span",
                                                "attrs": {},
                                                "classes": [
                                                  "avatar"
                                                ],
                                                "style": {
                                                  "box-sizing": "border-box"
                                                },
                                                "children": [
                                                  {
                                                    "id": "#text_xuyoxui",
                                                    "tag": "#text",
                                                    "text": "XS",
                                                    "children": []
                                                  }
                                                ]
                                              }
                                            ]
                                          },
                                          {
                                            "id": "td_emuxwfm",
                                            "tag": "td",
                                            "attrs": {},
                                            "classes": [
                                              "table-actions"
                                            ],
                                            "style": {
                                              "box-sizing": "border-box",
                                              "padding": ".8rem .9rem",
                                              "white-space": "nowrap",
                                              "border-top": "1px solid var(--border)"
                                            },
                                            "children": [
                                              {
                                                "id": "span_dofn00h",
                                                "tag": "span",
                                                "attrs": {},
                                                "classes": [
                                                  "btn"
                                                ],
                                                "style": {
                                                  "box-sizing": "border-box"
                                                },
                                                "children": [
                                                  {
                                                    "id": "#text_x59floj",
                                                    "tag": "#text",
                                                    "text": "Voir",
                                                    "children": []
                                                  }
                                                ]
                                              },
                                              {
                                                "id": "span_j5gv0mv",
                                                "tag": "span",
                                                "attrs": {},
                                                "classes": [
                                                  "btn"
                                                ],
                                                "style": {
                                                  "box-sizing": "border-box"
                                                },
                                                "children": [
                                                  {
                                                    "id": "#text_vmv5tc2",
                                                    "tag": "#text",
                                                    "text": "PDF",
                                                    "children": []
                                                  }
                                                ]
                                              }
                                            ]
                                          }
                                        ]
                                      }
                                    ]
                                  }
                                ]
                              }
                            ]
                          },
                          {
                            "id": "div_cf39k9u",
                            "tag": "div",
                            "attrs": {},
                            "classes": [
                              "between",
                              "mt-2"
                            ],
                            "style": {
                              "box-sizing": "border-box"
                            },
                            "children": [
                              {
                                "id": "div_h4p3lf3",
                                "tag": "div",
                                "attrs": {},
                                "classes": [
                                  "meta"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "#text_jetcetv",
                                    "tag": "#text",
                                    "text": "3 / 24",
                                    "children": []
                                  }
                                ]
                              },
                              {
                                "id": "div_ok0lny3",
                                "tag": "div",
                                "attrs": {},
                                "classes": [
                                  "gap-2"
                                ],
                                "style": {
                                  "display": "flex",
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "button_d9ugrzo",
                                    "tag": "button",
                                    "attrs": {},
                                    "classes": [
                                      "btn"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "#text_ongo3ro",
                                        "tag": "#text",
                                        "text": "Préc.",
                                        "children": []
                                      }
                                    ]
                                  },
                                  {
                                    "id": "button_ygivpo5",
                                    "tag": "button",
                                    "attrs": {},
                                    "classes": [
                                      "btn"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "#text_1ojn5y0",
                                        "tag": "#text",
                                        "text": "Suiv.",
                                        "children": []
                                      }
                                    ]
                                  }
                                ]
                              }
                            ]
                          }
                        ]
                      },
                      {
                        "id": "section_jatzcm5",
                        "tag": "section",
                        "attrs": {
                          "id": "equipe"
                        },
                        "classes": [
                          "grid",
                          "mb-3"
                        ],
                        "style": {
                          "box-sizing": "border-box"
                        },
                        "children": [
                          {
                            "id": "article_cwwgbv2",
                            "tag": "article",
                            "attrs": {},
                            "classes": [
                              "card"
                            ],
                            "style": {
                              "box-sizing": "border-box"
                            },
                            "children": [
                              {
                                "id": "h2_amsauk8",
                                "tag": "h2",
                                "attrs": {},
                                "classes": [
                                  "title",
                                  "mb-0"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "#text_davgn89",
                                    "tag": "#text",
                                    "text": "Équipe",
                                    "children": []
                                  }
                                ]
                              },
                              {
                                "id": "div_vc0wmiw",
                                "tag": "div",
                                "attrs": {},
                                "classes": [
                                  "subtitle"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "#text_9ee4zne",
                                    "tag": "#text",
                                    "text": "Commerciaux",
                                    "children": []
                                  }
                                ]
                              },
                              {
                                "id": "div_d6gnabd",
                                "tag": "div",
                                "attrs": {},
                                "classes": [
                                  "mt-2"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "div_jop9ugd",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [
                                      "list-item"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "span_yhulh34",
                                        "tag": "span",
                                        "attrs": {},
                                        "classes": [
                                          "avatar",
                                          "lg"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_e1yteqk",
                                            "tag": "#text",
                                            "text": "AL",
                                            "children": []
                                          }
                                        ]
                                      },
                                      {
                                        "id": "div_k8hva7k",
                                        "tag": "div",
                                        "attrs": {},
                                        "classes": [],
                                        "style": {
                                          "flex": "1",
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "div_xhtnl6r",
                                            "tag": "div",
                                            "attrs": {},
                                            "classes": [
                                              "between"
                                            ],
                                            "style": {
                                              "box-sizing": "border-box"
                                            },
                                            "children": [
                                              {
                                                "id": "div_4bsmtvf",
                                                "tag": "div",
                                                "attrs": {},
                                                "classes": [],
                                                "style": {
                                                  "box-sizing": "border-box"
                                                },
                                                "children": [
                                                  {
                                                    "id": "#text_duhsz7s",
                                                    "tag": "#text",
                                                    "text": "Amélie Laurent",
                                                    "children": []
                                                  }
                                                ]
                                              },
                                              {
                                                "id": "div_7dei04s",
                                                "tag": "div",
                                                "attrs": {},
                                                "classes": [
                                                  "meta"
                                                ],
                                                "style": {
                                                  "box-sizing": "border-box"
                                                },
                                                "children": [
                                                  {
                                                    "id": "#text_3bhvq0v",
                                                    "tag": "#text",
                                                    "text": "TJM: € 650",
                                                    "children": []
                                                  }
                                                ]
                                              }
                                            ]
                                          },
                                          {
                                            "id": "div_xm5m2ux",
                                            "tag": "div",
                                            "attrs": {},
                                            "classes": [
                                              "meta"
                                            ],
                                            "style": {
                                              "box-sizing": "border-box"
                                            },
                                            "children": [
                                              {
                                                "id": "#text_jyxpvv8",
                                                "tag": "#text",
                                                "text": "Île-de-France",
                                                "children": []
                                              }
                                            ]
                                          }
                                        ]
                                      },
                                      {
                                        "id": "span_b2sucju",
                                        "tag": "span",
                                        "attrs": {},
                                        "classes": [
                                          "tag"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_ndpsn2t",
                                            "tag": "#text",
                                            "text": "Senior",
                                            "children": []
                                          }
                                        ]
                                      }
                                    ]
                                  },
                                  {
                                    "id": "div_ufcljit",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [
                                      "list-item"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box",
                                      "border-top": "1px solid var(--border)"
                                    },
                                    "children": [
                                      {
                                        "id": "span_0scuqvv",
                                        "tag": "span",
                                        "attrs": {},
                                        "classes": [
                                          "avatar",
                                          "lg"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_stsw75x",
                                            "tag": "#text",
                                            "text": "MB",
                                            "children": []
                                          }
                                        ]
                                      },
                                      {
                                        "id": "div_tlta5gb",
                                        "tag": "div",
                                        "attrs": {},
                                        "classes": [],
                                        "style": {
                                          "flex": "1",
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "div_1r3o92s",
                                            "tag": "div",
                                            "attrs": {},
                                            "classes": [
                                              "between"
                                            ],
                                            "style": {
                                              "box-sizing": "border-box"
                                            },
                                            "children": [
                                              {
                                                "id": "div_soe0w0z",
                                                "tag": "div",
                                                "attrs": {},
                                                "classes": [],
                                                "style": {
                                                  "box-sizing": "border-box"
                                                },
                                                "children": [
                                                  {
                                                    "id": "#text_b1k48a9",
                                                    "tag": "#text",
                                                    "text": "Marc Bouchet",
                                                    "children": []
                                                  }
                                                ]
                                              },
                                              {
                                                "id": "div_8icqjui",
                                                "tag": "div",
                                                "attrs": {},
                                                "classes": [
                                                  "meta"
                                                ],
                                                "style": {
                                                  "box-sizing": "border-box"
                                                },
                                                "children": [
                                                  {
                                                    "id": "#text_xnlbxx1",
                                                    "tag": "#text",
                                                    "text": "TJM: € 540",
                                                    "children": []
                                                  }
                                                ]
                                              }
                                            ]
                                          },
                                          {
                                            "id": "div_0d6z8z6",
                                            "tag": "div",
                                            "attrs": {},
                                            "classes": [
                                              "meta"
                                            ],
                                            "style": {
                                              "box-sizing": "border-box"
                                            },
                                            "children": [
                                              {
                                                "id": "#text_iizv94g",
                                                "tag": "#text",
                                                "text": "AURA",
                                                "children": []
                                              }
                                            ]
                                          }
                                        ]
                                      },
                                      {
                                        "id": "span_wq1egel",
                                        "tag": "span",
                                        "attrs": {},
                                        "classes": [
                                          "tag",
                                          "blue"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_pvt3eyr",
                                            "tag": "#text",
                                            "text": "Key",
                                            "children": []
                                          }
                                        ]
                                      }
                                    ]
                                  }
                                ]
                              }
                            ]
                          },
                          {
                            "id": "article_qkoy7k5",
                            "tag": "article",
                            "attrs": {},
                            "classes": [
                              "card"
                            ],
                            "style": {
                              "box-sizing": "border-box"
                            },
                            "children": [
                              {
                                "id": "h2_gxolads",
                                "tag": "h2",
                                "attrs": {},
                                "classes": [
                                  "title",
                                  "mb-0"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "#text_qmuaglf",
                                    "tag": "#text",
                                    "text": "Actualités",
                                    "children": []
                                  }
                                ]
                              },
                              {
                                "id": "div_j5cmwju",
                                "tag": "div",
                                "attrs": {},
                                "classes": [
                                  "subtitle"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "#text_q0q8yba",
                                    "tag": "#text",
                                    "text": "Blog & produits",
                                    "children": []
                                  }
                                ]
                              },
                              {
                                "id": "div_8v7xmhg",
                                "tag": "div",
                                "attrs": {},
                                "classes": [
                                  "grid",
                                  "mt-2"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "div_1xy1cmb",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "div_32kuo0s",
                                        "tag": "div",
                                        "attrs": {},
                                        "classes": [
                                          "img"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": []
                                      },
                                      {
                                        "id": "div_vtboy69",
                                        "tag": "div",
                                        "attrs": {},
                                        "classes": [
                                          "between",
                                          "mt-2"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "div_v89i01l",
                                            "tag": "div",
                                            "attrs": {},
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box"
                                            },
                                            "children": [
                                              {
                                                "id": "#text_x9xdlus",
                                                "tag": "#text",
                                                "text": "Guide OPC UA",
                                                "children": []
                                              }
                                            ]
                                          },
                                          {
                                            "id": "span_wr3swi0",
                                            "tag": "span",
                                            "attrs": {},
                                            "classes": [
                                              "meta"
                                            ],
                                            "style": {
                                              "box-sizing": "border-box"
                                            },
                                            "children": [
                                              {
                                                "id": "#text_odma67q",
                                                "tag": "#text",
                                                "text": "8 min",
                                                "children": []
                                              }
                                            ]
                                          }
                                        ]
                                      }
                                    ]
                                  },
                                  {
                                    "id": "div_e80rnte",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "div_l6vc6lv",
                                        "tag": "div",
                                        "attrs": {},
                                        "classes": [
                                          "img"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": []
                                      },
                                      {
                                        "id": "div_o1eigcl",
                                        "tag": "div",
                                        "attrs": {},
                                        "classes": [
                                          "between",
                                          "mt-2"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "div_enh6hsr",
                                            "tag": "div",
                                            "attrs": {},
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box"
                                            },
                                            "children": [
                                              {
                                                "id": "#text_bt2qnqg",
                                                "tag": "#text",
                                                "text": "Étude logistique",
                                                "children": []
                                              }
                                            ]
                                          },
                                          {
                                            "id": "span_jj79tu2",
                                            "tag": "span",
                                            "attrs": {},
                                            "classes": [
                                              "meta"
                                            ],
                                            "style": {
                                              "box-sizing": "border-box"
                                            },
                                            "children": [
                                              {
                                                "id": "#text_e69ttu8",
                                                "tag": "#text",
                                                "text": "4 min",
                                                "children": []
                                              }
                                            ]
                                          }
                                        ]
                                      }
                                    ]
                                  }
                                ]
                              }
                            ]
                          },
                          {
                            "id": "article_1mfi6t8",
                            "tag": "article",
                            "attrs": {},
                            "classes": [
                              "card"
                            ],
                            "style": {
                              "box-sizing": "border-box"
                            },
                            "children": [
                              {
                                "id": "div_dn5djdc",
                                "tag": "div",
                                "attrs": {},
                                "classes": [
                                  "between"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "h2_lf2v3jo",
                                    "tag": "h2",
                                    "attrs": {},
                                    "classes": [
                                      "title",
                                      "mb-0"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "#text_tx41oj1",
                                        "tag": "#text",
                                        "text": "Plan Entreprise",
                                        "children": []
                                      }
                                    ]
                                  },
                                  {
                                    "id": "div_7sfdszr",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [
                                      "pill-group"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "span_vl9idga",
                                        "tag": "span",
                                        "attrs": {},
                                        "classes": [
                                          "pill",
                                          "active"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_9s04nbp",
                                            "tag": "#text",
                                            "text": "Mensuel",
                                            "children": []
                                          }
                                        ]
                                      },
                                      {
                                        "id": "span_73u4okn",
                                        "tag": "span",
                                        "attrs": {},
                                        "classes": [
                                          "pill"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_86vkafy",
                                            "tag": "#text",
                                            "text": "Annuel",
                                            "children": []
                                          }
                                        ]
                                      }
                                    ]
                                  }
                                ]
                              },
                              {
                                "id": "div_x3du9b2",
                                "tag": "div",
                                "attrs": {},
                                "classes": [
                                  "mt-2"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "div_3o0qxr0",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [
                                      "price"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "#text_flrcv5b",
                                        "tag": "#text",
                                        "text": "€ 679 ",
                                        "children": []
                                      },
                                      {
                                        "id": "span_ypo4s3d",
                                        "tag": "span",
                                        "attrs": {},
                                        "classes": [
                                          "subtitle"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_yi88hig",
                                            "tag": "#text",
                                            "text": "/mois",
                                            "children": []
                                          }
                                        ]
                                      }
                                    ]
                                  },
                                  {
                                    "id": "ul_421w43b",
                                    "tag": "ul",
                                    "attrs": {},
                                    "classes": [
                                      "feature-list",
                                      "mt-2"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "li_awq6sep",
                                        "tag": "li",
                                        "attrs": {},
                                        "classes": [
                                          "feature"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "span_fdnx5jm",
                                            "tag": "span",
                                            "attrs": {},
                                            "classes": [
                                              "dot"
                                            ],
                                            "style": {
                                              "box-sizing": "border-box",
                                              "width": ".5rem",
                                              "height": ".5rem",
                                              "border-radius": "50%",
                                              "background": "#D1D5DB",
                                              "margin-top": ".5rem",
                                              "flex": "0 0 auto"
                                            },
                                            "children": []
                                          },
                                          {
                                            "id": "#text_20m36eb",
                                            "tag": "#text",
                                            "text": " Conseil stratégie SI",
                                            "children": []
                                          }
                                        ]
                                      },
                                      {
                                        "id": "li_7gps225",
                                        "tag": "li",
                                        "attrs": {},
                                        "classes": [
                                          "feature"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "span_ml6qkwf",
                                            "tag": "span",
                                            "attrs": {},
                                            "classes": [
                                              "dot"
                                            ],
                                            "style": {
                                              "box-sizing": "border-box",
                                              "width": ".5rem",
                                              "height": ".5rem",
                                              "border-radius": "50%",
                                              "background": "#D1D5DB",
                                              "margin-top": ".5rem",
                                              "flex": "0 0 auto"
                                            },
                                            "children": []
                                          },
                                          {
                                            "id": "#text_1flg566",
                                            "tag": "#text",
                                            "text": " Audits récurrents",
                                            "children": []
                                          }
                                        ]
                                      },
                                      {
                                        "id": "li_5qz11g6",
                                        "tag": "li",
                                        "attrs": {},
                                        "classes": [
                                          "feature"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "span_mdr7jls",
                                            "tag": "span",
                                            "attrs": {},
                                            "classes": [
                                              "dot"
                                            ],
                                            "style": {
                                              "box-sizing": "border-box",
                                              "width": ".5rem",
                                              "height": ".5rem",
                                              "border-radius": "50%",
                                              "background": "#D1D5DB",
                                              "margin-top": ".5rem",
                                              "flex": "0 0 auto"
                                            },
                                            "children": []
                                          },
                                          {
                                            "id": "#text_wl6uqy5",
                                            "tag": "#text",
                                            "text": " Reco matériel & Apps",
                                            "children": []
                                          }
                                        ]
                                      }
                                    ]
                                  },
                                  {
                                    "id": "div_b2dqkg5",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [
                                      "mt-3"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "button_vv0rw5c",
                                        "tag": "button",
                                        "attrs": {},
                                        "classes": [
                                          "btn",
                                          "primary"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_invscbe",
                                            "tag": "#text",
                                            "text": "Choisir",
                                            "children": []
                                          }
                                        ]
                                      },
                                      {
                                        "id": "button_eko5q79",
                                        "tag": "button",
                                        "attrs": {},
                                        "classes": [
                                          "btn"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_et5ga71",
                                            "tag": "#text",
                                            "text": "Détails",
                                            "children": []
                                          }
                                        ]
                                      }
                                    ]
                                  }
                                ]
                              }
                            ]
                          }
                        ]
                      },
                      {
                        "id": "section_8najpjl",
                        "tag": "section",
                        "attrs": {},
                        "classes": [
                          "row",
                          "mb-3"
                        ],
                        "style": {
                          "box-sizing": "border-box"
                        },
                        "children": [
                          {
                            "id": "article_7x7pe1p",
                            "tag": "article",
                            "attrs": {},
                            "classes": [
                              "card",
                              "col"
                            ],
                            "style": {
                              "box-sizing": "border-box"
                            },
                            "children": [
                              {
                                "id": "h2_7ngswba",
                                "tag": "h2",
                                "attrs": {},
                                "classes": [
                                  "title",
                                  "mb-0"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "#text_jfwmdjk",
                                    "tag": "#text",
                                    "text": "Création client",
                                    "children": []
                                  }
                                ]
                              },
                              {
                                "id": "div_myw5482",
                                "tag": "div",
                                "attrs": {},
                                "classes": [
                                  "subtitle"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "#text_gk3flo3",
                                    "tag": "#text",
                                    "text": "Formulaire simple",
                                    "children": []
                                  }
                                ]
                              },
                              {
                                "id": "div_eh043p0",
                                "tag": "div",
                                "attrs": {},
                                "classes": [
                                  "mt-2"
                                ],
                                "style": {
                                  "display": "grid",
                                  "gap": "10px",
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "label_5ovdpo0",
                                    "tag": "label",
                                    "attrs": {},
                                    "classes": [],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "#text_m9hy4wp",
                                        "tag": "#text",
                                        "text": "Nom de la société\n          ",
                                        "children": []
                                      },
                                      {
                                        "id": "input_z54gqa3",
                                        "tag": "input",
                                        "attrs": {
                                          "placeholder": "Ex: i55"
                                        },
                                        "classes": [
                                          "form-control",
                                          "mt-1"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": []
                                      }
                                    ]
                                  },
                                  {
                                    "id": "label_4jig9m9",
                                    "tag": "label",
                                    "attrs": {},
                                    "classes": [],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "#text_rned0xb",
                                        "tag": "#text",
                                        "text": "Contact\n          ",
                                        "children": []
                                      },
                                      {
                                        "id": "input_n36vfc9",
                                        "tag": "input",
                                        "attrs": {
                                          "placeholder": "Nom Prénom"
                                        },
                                        "classes": [
                                          "form-control",
                                          "mt-1"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": []
                                      }
                                    ]
                                  },
                                  {
                                    "id": "label_crb2mm9",
                                    "tag": "label",
                                    "attrs": {},
                                    "classes": [],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "#text_xy2b4z9",
                                        "tag": "#text",
                                        "text": "Email\n          ",
                                        "children": []
                                      },
                                      {
                                        "id": "input_g3suojx",
                                        "tag": "input",
                                        "attrs": {
                                          "type": "email",
                                          "placeholder": "nom@domaine.tld"
                                        },
                                        "classes": [
                                          "form-control",
                                          "mt-1"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": []
                                      }
                                    ]
                                  },
                                  {
                                    "id": "label_3o9t2e6",
                                    "tag": "label",
                                    "attrs": {},
                                    "classes": [],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "#text_whrssut",
                                        "tag": "#text",
                                        "text": "Statut\n          ",
                                        "children": []
                                      },
                                      {
                                        "id": "select_kgbpzqg",
                                        "tag": "select",
                                        "attrs": {},
                                        "classes": [
                                          "form-control",
                                          "mt-1"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box",
                                          "appearance": "none",
                                          "background-image": "linear-gradient(45deg,transparent 50%,#9ca3af 50%),linear-gradient(135deg,#9ca3af 50%,transparent 50%)",
                                          "background-position": "calc(100% - 18px) 50%,calc(100% - 12px) 50%",
                                          "background-size": "6px 6px,6px 6px",
                                          "background-repeat": "no-repeat"
                                        },
                                        "children": [
                                          {
                                            "id": "option_i7jwu0f",
                                            "tag": "option",
                                            "attrs": {},
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box"
                                            },
                                            "children": [
                                              {
                                                "id": "#text_3876uvu",
                                                "tag": "#text",
                                                "text": "Prospect",
                                                "children": []
                                              }
                                            ]
                                          },
                                          {
                                            "id": "option_413d721",
                                            "tag": "option",
                                            "attrs": {},
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box"
                                            },
                                            "children": [
                                              {
                                                "id": "#text_1lv5l1h",
                                                "tag": "#text",
                                                "text": "Client",
                                                "children": []
                                              }
                                            ]
                                          },
                                          {
                                            "id": "option_dxw3x5l",
                                            "tag": "option",
                                            "attrs": {},
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box"
                                            },
                                            "children": [
                                              {
                                                "id": "#text_azdr65t",
                                                "tag": "#text",
                                                "text": "À valider",
                                                "children": []
                                              }
                                            ]
                                          }
                                        ]
                                      }
                                    ]
                                  },
                                  {
                                    "id": "label_94tlqg6",
                                    "tag": "label",
                                    "attrs": {},
                                    "classes": [],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "#text_5uay8kx",
                                        "tag": "#text",
                                        "text": "Notes\n          ",
                                        "children": []
                                      },
                                      {
                                        "id": "textarea_wpy1jd9",
                                        "tag": "textarea",
                                        "attrs": {
                                          "placeholder": "Informations complémentaires..."
                                        },
                                        "classes": [
                                          "form-control",
                                          "mt-1"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box",
                                          "min-height": "84px",
                                          "resize": "vertical"
                                        },
                                        "children": []
                                      }
                                    ]
                                  },
                                  {
                                    "id": "div_1j7fnmc",
                                    "tag": "div",
                                    "attrs": {},
                                    "classes": [
                                      "between",
                                      "mt-2"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "div_11llqn9",
                                        "tag": "div",
                                        "attrs": {},
                                        "classes": [
                                          "gap-2"
                                        ],
                                        "style": {
                                          "display": "flex",
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "span_tzt1ycd",
                                            "tag": "span",
                                            "attrs": {},
                                            "classes": [
                                              "tag"
                                            ],
                                            "style": {
                                              "box-sizing": "border-box"
                                            },
                                            "children": [
                                              {
                                                "id": "#text_c615l5h",
                                                "tag": "#text",
                                                "text": "Prospect",
                                                "children": []
                                              }
                                            ]
                                          },
                                          {
                                            "id": "span_8g96hki",
                                            "tag": "span",
                                            "attrs": {},
                                            "classes": [
                                              "tag",
                                              "blue"
                                            ],
                                            "style": {
                                              "box-sizing": "border-box"
                                            },
                                            "children": [
                                              {
                                                "id": "#text_l2azmw1",
                                                "tag": "#text",
                                                "text": "Client",
                                                "children": []
                                              }
                                            ]
                                          },
                                          {
                                            "id": "span_0gd620e",
                                            "tag": "span",
                                            "attrs": {},
                                            "classes": [
                                              "tag",
                                              "warn"
                                            ],
                                            "style": {
                                              "box-sizing": "border-box"
                                            },
                                            "children": [
                                              {
                                                "id": "#text_la63qe2",
                                                "tag": "#text",
                                                "text": "À valider",
                                                "children": []
                                              }
                                            ]
                                          }
                                        ]
                                      },
                                      {
                                        "id": "div_mf0z29m",
                                        "tag": "div",
                                        "attrs": {},
                                        "classes": [
                                          "gap-2"
                                        ],
                                        "style": {
                                          "display": "flex",
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "button_ayxnxxu",
                                            "tag": "button",
                                            "attrs": {},
                                            "classes": [
                                              "btn"
                                            ],
                                            "style": {
                                              "box-sizing": "border-box"
                                            },
                                            "children": [
                                              {
                                                "id": "#text_1oupq22",
                                                "tag": "#text",
                                                "text": "Annuler",
                                                "children": []
                                              }
                                            ]
                                          },
                                          {
                                            "id": "button_e4pftk1",
                                            "tag": "button",
                                            "attrs": {},
                                            "classes": [
                                              "btn",
                                              "primary"
                                            ],
                                            "style": {
                                              "box-sizing": "border-box"
                                            },
                                            "children": [
                                              {
                                                "id": "#text_oitut7o",
                                                "tag": "#text",
                                                "text": "Enregistrer",
                                                "children": []
                                              }
                                            ]
                                          }
                                        ]
                                      }
                                    ]
                                  }
                                ]
                              }
                            ]
                          },
                          {
                            "id": "article_2h2k63e",
                            "tag": "article",
                            "attrs": {
                              "id": "faq"
                            },
                            "classes": [
                              "card",
                              "col"
                            ],
                            "style": {
                              "box-sizing": "border-box"
                            },
                            "children": [
                              {
                                "id": "h2_mvdiko6",
                                "tag": "h2",
                                "attrs": {},
                                "classes": [
                                  "title",
                                  "mb-0"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "#text_h4729pj",
                                    "tag": "#text",
                                    "text": "FAQ",
                                    "children": []
                                  }
                                ]
                              },
                              {
                                "id": "div_2zc01x1",
                                "tag": "div",
                                "attrs": {},
                                "classes": [
                                  "subtitle"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "#text_gis20xv",
                                    "tag": "#text",
                                    "text": "Questions fréquentes",
                                    "children": []
                                  }
                                ]
                              },
                              {
                                "id": "div_1ddw9rq",
                                "tag": "div",
                                "attrs": {},
                                "classes": [
                                  "mt-2"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "details_qh0wtc6",
                                    "tag": "details",
                                    "attrs": {},
                                    "classes": [
                                      "mb-2"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "summary_5l9nba5",
                                        "tag": "summary",
                                        "attrs": {},
                                        "classes": [],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "strong_9nntrez",
                                            "tag": "strong",
                                            "attrs": {},
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box"
                                            },
                                            "children": [
                                              {
                                                "id": "#text_1wtihde",
                                                "tag": "#text",
                                                "text": "Comment demander un devis ?",
                                                "children": []
                                              }
                                            ]
                                          }
                                        ]
                                      },
                                      {
                                        "id": "div_bf1xgtv",
                                        "tag": "div",
                                        "attrs": {},
                                        "classes": [
                                          "mt-1"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_f54xvvq",
                                            "tag": "#text",
                                            "text": "Depuis la fiche produit, cliquez sur ",
                                            "children": []
                                          },
                                          {
                                            "id": "em_a3mbt88",
                                            "tag": "em",
                                            "attrs": {},
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box"
                                            },
                                            "children": [
                                              {
                                                "id": "#text_pitds1w",
                                                "tag": "#text",
                                                "text": "“Détails”",
                                                "children": []
                                              }
                                            ]
                                          },
                                          {
                                            "id": "#text_aeqgpdy",
                                            "tag": "#text",
                                            "text": " puis ",
                                            "children": []
                                          },
                                          {
                                            "id": "em_plq9rxl",
                                            "tag": "em",
                                            "attrs": {},
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box"
                                            },
                                            "children": [
                                              {
                                                "id": "#text_s7nh1qt",
                                                "tag": "#text",
                                                "text": "“Demander un devis”",
                                                "children": []
                                              }
                                            ]
                                          },
                                          {
                                            "id": "#text_93dzlnu",
                                            "tag": "#text",
                                            "text": ".",
                                            "children": []
                                          }
                                        ]
                                      }
                                    ]
                                  },
                                  {
                                    "id": "details_whe883b",
                                    "tag": "details",
                                    "attrs": {},
                                    "classes": [
                                      "mb-2"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "summary_anc5pz4",
                                        "tag": "summary",
                                        "attrs": {},
                                        "classes": [],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "strong_qbl5qej",
                                            "tag": "strong",
                                            "attrs": {},
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box"
                                            },
                                            "children": [
                                              {
                                                "id": "#text_srpps2s",
                                                "tag": "#text",
                                                "text": "Quels délais de livraison ?",
                                                "children": []
                                              }
                                            ]
                                          }
                                        ]
                                      },
                                      {
                                        "id": "div_46qb0rx",
                                        "tag": "div",
                                        "attrs": {},
                                        "classes": [
                                          "mt-1"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_kim3h2c",
                                            "tag": "#text",
                                            "text": "48 h en France métropolitaine pour les produits en stock.",
                                            "children": []
                                          }
                                        ]
                                      }
                                    ]
                                  },
                                  {
                                    "id": "details_lrbyu4n",
                                    "tag": "details",
                                    "attrs": {},
                                    "classes": [],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "summary_vsbsh7x",
                                        "tag": "summary",
                                        "attrs": {},
                                        "classes": [],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "strong_tfg3r94",
                                            "tag": "strong",
                                            "attrs": {},
                                            "classes": [],
                                            "style": {
                                              "box-sizing": "border-box"
                                            },
                                            "children": [
                                              {
                                                "id": "#text_ws7x4qq",
                                                "tag": "#text",
                                                "text": "Comment accéder aux documents ?",
                                                "children": []
                                              }
                                            ]
                                          }
                                        ]
                                      },
                                      {
                                        "id": "div_cz8n20w",
                                        "tag": "div",
                                        "attrs": {},
                                        "classes": [
                                          "mt-1"
                                        ],
                                        "style": {
                                          "box-sizing": "border-box"
                                        },
                                        "children": [
                                          {
                                            "id": "#text_a39osgc",
                                            "tag": "#text",
                                            "text": "Section “Fichiers” — brochures, spécifications et photos.",
                                            "children": []
                                          }
                                        ]
                                      }
                                    ]
                                  }
                                ]
                              }
                            ]
                          }
                        ]
                      },
                      {
                        "id": "footer_95g0898",
                        "tag": "footer",
                        "attrs": {},
                        "classes": [
                          "footer"
                        ],
                        "style": {
                          "box-sizing": "border-box"
                        },
                        "children": [
                          {
                            "id": "div_6opsw7o",
                            "tag": "div",
                            "attrs": {},
                            "classes": [
                              "between"
                            ],
                            "style": {
                              "box-sizing": "border-box"
                            },
                            "children": [
                              {
                                "id": "div_g4srlbu",
                                "tag": "div",
                                "attrs": {},
                                "classes": [
                                  "meta"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "#text_wbyyjy1",
                                    "tag": "#text",
                                    "text": "© 2025 i55 — Tous droits réservés.",
                                    "children": []
                                  }
                                ]
                              },
                              {
                                "id": "div_zxqvsdm",
                                "tag": "div",
                                "attrs": {},
                                "classes": [
                                  "nav"
                                ],
                                "style": {
                                  "box-sizing": "border-box"
                                },
                                "children": [
                                  {
                                    "id": "a_t1yzoyk",
                                    "tag": "a",
                                    "attrs": {
                                      "href": "#"
                                    },
                                    "classes": [
                                      "nav-item"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "#text_q4sxpfk",
                                        "tag": "#text",
                                        "text": "Mentions",
                                        "children": []
                                      }
                                    ]
                                  },
                                  {
                                    "id": "a_ywtsup1",
                                    "tag": "a",
                                    "attrs": {
                                      "href": "#"
                                    },
                                    "classes": [
                                      "nav-item"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "#text_gcw7uh0",
                                        "tag": "#text",
                                        "text": "Confidentialité",
                                        "children": []
                                      }
                                    ]
                                  },
                                  {
                                    "id": "a_khtrxc4",
                                    "tag": "a",
                                    "attrs": {
                                      "href": "#"
                                    },
                                    "classes": [
                                      "nav-item"
                                    ],
                                    "style": {
                                      "box-sizing": "border-box"
                                    },
                                    "children": [
                                      {
                                        "id": "#text_w8530fh",
                                        "tag": "#text",
                                        "text": "Contact",
                                        "children": []
                                      }
                                    ]
                                  }
                                ]
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              },
              "classes": [
                {
                  "name": "page",
                  "parts": [
                    "page"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "max-width": "1080px",
                        "margin-inline": "auto",
                        "padding": "20px"
                      }
                    }
                  }
                },
                {
                  "name": "card",
                  "parts": [
                    "card"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "background": "var(--bg)",
                        "border": "1px solid var(--border)",
                        "border-radius": "14px",
                        "box-shadow": "var(--shadow)",
                        "padding": "16px"
                      }
                    }
                  }
                },
                {
                  "name": "row",
                  "parts": [
                    "row"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "display": "flex",
                        "gap": "12px",
                        "flex-wrap": "wrap"
                      },
                      "bp": {
                        "md": {
                          "flex-direction": "column"
                        }
                      }
                    }
                  }
                },
                {
                  "name": "col",
                  "parts": [
                    "col"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "flex": "1 1 0",
                        "min-width": "260px"
                      }
                    }
                  }
                },
                {
                  "name": "btn",
                  "parts": [
                    "btn"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "display": "inline-flex",
                        "align-items": "center",
                        "gap": ".5rem",
                        "background": "#fff",
                        "border": "1px solid #e5e7eb",
                        "border-radius": "10px",
                        "padding": ".6rem .9rem",
                        "cursor": "pointer",
                        "transition": "border-color .15s ease,transform .08s ease"
                      }
                    },
                    "hover": {
                      "base": {
                        "border-color": "#d1d5db"
                      }
                    },
                    "active": {
                      "base": {
                        "transform": "translateY(1px)"
                      }
                    }
                  }
                },
                {
                  "name": "btn.primary",
                  "parts": [
                    "btn",
                    "primary"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "background": "#111",
                        "color": "#fff",
                        "border-color": "#111"
                      }
                    }
                  }
                },
                {
                  "name": "btn.ghost",
                  "parts": [
                    "btn",
                    "ghost"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "background": "transparent"
                      }
                    }
                  }
                },
                {
                  "name": "tag",
                  "parts": [
                    "tag"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "display": "inline-flex",
                        "align-items": "center",
                        "gap": ".35rem",
                        "padding": ".25rem .55rem",
                        "border-radius": "9999px",
                        "background": "#f3f4f6",
                        "font-size": "12px"
                      }
                    }
                  }
                },
                {
                  "name": "tag.blue",
                  "parts": [
                    "tag",
                    "blue"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "background": "var(--blue-50)",
                        "color": "#1d4ed8"
                      }
                    }
                  }
                },
                {
                  "name": "tag.warn",
                  "parts": [
                    "tag",
                    "warn"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "background": "var(--amber-50)",
                        "color": "var(--amber-800)"
                      }
                    }
                  }
                },
                {
                  "name": "pill-group",
                  "parts": [
                    "pill-group"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "display": "inline-flex",
                        "background": "#f3f4f6",
                        "border": "1px solid var(--border)",
                        "border-radius": "9999px",
                        "padding": "4px",
                        "gap": "4px"
                      }
                    }
                  }
                },
                {
                  "name": "pill",
                  "parts": [
                    "pill"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "padding": ".35rem .7rem",
                        "border-radius": "9999px",
                        "font-size": "12px"
                      }
                    }
                  }
                },
                {
                  "name": "pill.active",
                  "parts": [
                    "pill",
                    "active"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "background": "#fff",
                        "border": "1px solid var(--border)"
                      }
                    }
                  }
                },
                {
                  "name": "badge",
                  "parts": [
                    "badge"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "display": "inline-block",
                        "padding": ".25rem .55rem",
                        "border-radius": "9999px",
                        "background": "#dbeafe",
                        "color": "#1e3a8a",
                        "font-size": "12px"
                      }
                    }
                  }
                },
                {
                  "name": "title",
                  "parts": [
                    "title"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "font-weight": "600",
                        "font-size": "20px",
                        "letter-spacing": "-.02em",
                        "margin": "0 0 .35rem"
                      }
                    }
                  }
                },
                {
                  "name": "subtitle",
                  "parts": [
                    "subtitle"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "font-size": "12px",
                        "color": "var(--muted)"
                      }
                    }
                  }
                },
                {
                  "name": "grid",
                  "parts": [
                    "grid"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "display": "grid",
                        "gap": "12px",
                        "grid-template-columns": "repeat(auto-fill,minmax(260px,1fr))"
                      }
                    }
                  }
                },
                {
                  "name": "feature-list",
                  "parts": [
                    "feature-list"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "list-style": "none",
                        "margin": "0",
                        "padding": "0",
                        "display": "flex",
                        "flex-direction": "column",
                        "gap": ".55rem"
                      }
                    }
                  }
                },
                {
                  "name": "feature",
                  "parts": [
                    "feature"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "display": "flex",
                        "gap": ".6rem",
                        "align-items": "baseline"
                      }
                    }
                  }
                },
                {
                  "name": "table-wrap",
                  "parts": [
                    "table-wrap"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "border": "1px solid var(--border)",
                        "border-radius": "12px",
                        "background": "#fff",
                        "overflow": "auto",
                        "box-shadow": "var(--shadow)"
                      }
                    }
                  }
                },
                {
                  "name": "form-control",
                  "parts": [
                    "form-control"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "width": "100%",
                        "border": "1px solid #e5e7eb",
                        "border-radius": "10px",
                        "padding": ".6rem .8rem",
                        "font": "inherit",
                        "background": "#fff"
                      }
                    }
                  }
                },
                {
                  "name": "navbar",
                  "parts": [
                    "navbar"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "position": "sticky",
                        "top": "0",
                        "z-index": "100",
                        "background": "#fff",
                        "border-bottom": "1px solid var(--border)"
                      }
                    }
                  }
                },
                {
                  "name": "brand",
                  "parts": [
                    "brand"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "font-weight": "700",
                        "letter-spacing": "-.02em",
                        "display": "flex",
                        "align-items": "center",
                        "gap": ".6rem"
                      }
                    }
                  }
                },
                {
                  "name": "nav",
                  "parts": [
                    "nav"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "display": "flex",
                        "gap": "6px",
                        "flex-wrap": "wrap"
                      }
                    }
                  }
                },
                {
                  "name": "nav-item",
                  "parts": [
                    "nav-item"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "display": "inline-flex",
                        "padding": ".45rem .7rem",
                        "border-radius": "9999px",
                        "border": "1px solid transparent"
                      }
                    },
                    "hover": {
                      "base": {
                        "background": "#f7f7f9",
                        "border-color": "var(--border)"
                      }
                    }
                  }
                },
                {
                  "name": "nav-item.active",
                  "parts": [
                    "nav-item",
                    "active"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "background": "#111",
                        "color": "#fff"
                      }
                    }
                  }
                },
                {
                  "name": "img",
                  "parts": [
                    "img"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "display": "block",
                        "padding-top": "56%",
                        "background": "linear-gradient(135deg,#f3f4f6,#e5e7eb)"
                      }
                    }
                  }
                },
                {
                  "name": "avatar",
                  "parts": [
                    "avatar"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "width": "28px",
                        "height": "28px",
                        "border-radius": "50%",
                        "border": "1px solid var(--border)",
                        "background": "#eef2f7",
                        "display": "inline-flex",
                        "align-items": "center",
                        "justify-content": "center",
                        "font-size": "12px",
                        "font-weight": "600",
                        "color": "#374151"
                      }
                    }
                  }
                },
                {
                  "name": "avatar.lg",
                  "parts": [
                    "avatar",
                    "lg"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "width": "40px",
                        "height": "40px",
                        "font-size": "14px"
                      }
                    }
                  }
                },
                {
                  "name": "meta",
                  "parts": [
                    "meta"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "color": "var(--muted)",
                        "font-size": "12px"
                      }
                    }
                  }
                },
                {
                  "name": "price",
                  "parts": [
                    "price"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "font-size": "28px",
                        "font-weight": "700",
                        "letter-spacing": "-.02em"
                      }
                    }
                  }
                },
                {
                  "name": "between",
                  "parts": [
                    "between"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "display": "flex",
                        "align-items": "center",
                        "justify-content": "space-between",
                        "gap": "12px",
                        "flex-wrap": "wrap"
                      }
                    }
                  }
                },
                {
                  "name": "muted",
                  "parts": [
                    "muted"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "color": "var(--muted)"
                      }
                    }
                  }
                },
                {
                  "name": "mt-1",
                  "parts": [
                    "mt-1"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "margin-top": ".25rem"
                      }
                    }
                  }
                },
                {
                  "name": "mt-2",
                  "parts": [
                    "mt-2"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "margin-top": ".5rem"
                      }
                    }
                  }
                },
                {
                  "name": "mt-3",
                  "parts": [
                    "mt-3"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "margin-top": ".75rem"
                      }
                    }
                  }
                },
                {
                  "name": "mt-4",
                  "parts": [
                    "mt-4"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "margin-top": "1rem"
                      }
                    }
                  }
                },
                {
                  "name": "mb-0",
                  "parts": [
                    "mb-0"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "margin-bottom": "0"
                      }
                    }
                  }
                },
                {
                  "name": "mb-1",
                  "parts": [
                    "mb-1"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "margin-bottom": ".25rem"
                      }
                    }
                  }
                },
                {
                  "name": "mb-2",
                  "parts": [
                    "mb-2"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "margin-bottom": ".5rem"
                      }
                    }
                  }
                },
                {
                  "name": "mb-3",
                  "parts": [
                    "mb-3"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "margin-bottom": ".75rem"
                      }
                    }
                  }
                },
                {
                  "name": "mb-4",
                  "parts": [
                    "mb-4"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "margin-bottom": "1rem"
                      }
                    }
                  }
                },
                {
                  "name": "gap-1",
                  "parts": [
                    "gap-1"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "gap": ".25rem"
                      }
                    }
                  }
                },
                {
                  "name": "gap-2",
                  "parts": [
                    "gap-2"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "gap": ".5rem"
                      }
                    }
                  }
                },
                {
                  "name": "gap-3",
                  "parts": [
                    "gap-3"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "gap": ".75rem"
                      }
                    }
                  }
                },
                {
                  "name": "gap-4",
                  "parts": [
                    "gap-4"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "gap": "1rem"
                      }
                    }
                  }
                },
                {
                  "name": "list-item",
                  "parts": [
                    "list-item"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "display": "flex",
                        "align-items": "center",
                        "gap": ".75rem",
                        "padding": ".5rem 0"
                      }
                    }
                  }
                },
                {
                  "name": "progress",
                  "parts": [
                    "progress"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "height": "8px",
                        "background": "#f3f4f6",
                        "border-radius": "9999px",
                        "overflow": "hidden"
                      }
                    }
                  }
                },
                {
                  "name": "state.success",
                  "parts": [
                    "state",
                    "success"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "color": "var(--green-600)"
                      }
                    }
                  }
                },
                {
                  "name": "state.danger",
                  "parts": [
                    "state",
                    "danger"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "color": "var(--red-600)"
                      }
                    }
                  }
                },
                {
                  "name": "state.warn",
                  "parts": [
                    "state",
                    "warn"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "color": "var(--amber-800)"
                      }
                    }
                  }
                },
                {
                  "name": "timeline",
                  "parts": [
                    "timeline"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "position": "absolute",
                        "left": "6px",
                        "top": "0",
                        "bottom": "0",
                        "width": "2px",
                        "background": "#e5e7eb",
                        "border-radius": "2px"
                      }
                    }
                  }
                },
                {
                  "name": "tl-item",
                  "parts": [
                    "tl-item"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "position": "absolute",
                        "left": "0",
                        "top": ".6rem",
                        "width": "12px",
                        "height": "12px",
                        "border-radius": "50%",
                        "background": "#111",
                        "border": "2px solid #fff",
                        "box-shadow": "0 0 0 2px #e5e7eb"
                      }
                    }
                  }
                },
                {
                  "name": "kanban",
                  "parts": [
                    "kanban"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "display": "grid",
                        "grid-template-columns": "repeat(3,1fr)",
                        "gap": "12px"
                      }
                    }
                  }
                },
                {
                  "name": "kan-col",
                  "parts": [
                    "kan-col"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "background": "#fff",
                        "border": "1px solid var(--border)",
                        "border-radius": "12px",
                        "box-shadow": "var(--shadow)",
                        "padding": "10px"
                      }
                    }
                  }
                },
                {
                  "name": "ticket",
                  "parts": [
                    "ticket"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "background": "#fff",
                        "border": "1px solid var(--border)",
                        "border-radius": "10px",
                        "padding": "10px",
                        "margin": "8px 0"
                      }
                    }
                  }
                },
                {
                  "name": "product",
                  "parts": [
                    "product"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "display": "grid",
                        "grid-template-columns": "120px 1fr",
                        "gap": "12px",
                        "align-items": "start"
                      }
                    }
                  }
                },
                {
                  "name": "badge-row",
                  "parts": [
                    "badge-row"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "display": "flex",
                        "gap": "6px",
                        "flex-wrap": "wrap"
                      }
                    }
                  }
                },
                {
                  "name": "tabs",
                  "parts": [
                    "tabs"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "display": "flex",
                        "gap": "8px",
                        "flex-wrap": "wrap"
                      }
                    }
                  }
                },
                {
                  "name": "imp-8ntbdq",
                  "parts": [
                    "imp-8ntbdq"
                  ],
                  "styles": {
                    "hover": {
                      "base": {
                        "background": "#fff"
                      }
                    }
                  }
                },
                {
                  "name": "banner",
                  "parts": [
                    "banner"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "border": "1px solid var(--border)",
                        "background": "#fff",
                        "border-left": "4px solid #111",
                        "border-radius": "12px",
                        "padding": "10px 12px"
                      }
                    }
                  }
                },
                {
                  "name": "footer",
                  "parts": [
                    "footer"
                  ],
                  "styles": {
                    "base": {
                      "base": {
                        "color": "var(--muted)",
                        "font-size": "12px",
                        "padding": "20px 0"
                      }
                    }
                  }
                },
                {
                  "name": "inner",
                  "parts": [
                    "inner"
                  ],
                  "styles": {}
                },
                {
                  "name": "dot",
                  "parts": [
                    "dot"
                  ],
                  "styles": {}
                },
                {
                  "name": "active",
                  "parts": [
                    "active"
                  ],
                  "styles": {}
                },
                {
                  "name": "lg",
                  "parts": [
                    "lg"
                  ],
                  "styles": {}
                },
                {
                  "name": "state",
                  "parts": [
                    "state"
                  ],
                  "styles": {}
                },
                {
                  "name": "success",
                  "parts": [
                    "success"
                  ],
                  "styles": {}
                },
                {
                  "name": "warn",
                  "parts": [
                    "warn"
                  ],
                  "styles": {}
                },
                {
                  "name": "blue",
                  "parts": [
                    "blue"
                  ],
                  "styles": {}
                },
                {
                  "name": "primary",
                  "parts": [
                    "primary"
                  ],
                  "styles": {}
                },
                {
                  "name": "thumb",
                  "parts": [
                    "thumb"
                  ],
                  "styles": {}
                },
                {
                  "name": "table-actions",
                  "parts": [
                    "table-actions"
                  ],
                  "styles": {}
                }
              ],
              "tokens": {
                "--color-primary": "#1677ff",
                "--space-2": "8px",
                "--radius-sm": "6px",
                "--shadow-md": "0 6px 18px rgba(0,0,0,.12)",
                "--font-size-400": "16px",
                "--border": "#ececec",
                "--muted": "#6b7280",
                "--bg": "#fff",
                "--brand": "#111",
                "--shadow": "0 6px 18px rgba(17,24,39,.06)",
                "--blue-50": "#eaf4ff",
                "--blue-600": "#2563eb",
                "--amber-50": "#fef9c3",
                "--amber-800": "#92400e",
                "--green-600": "#10b981",
                "--red-600": "#ef4444"
              },
              "breakpoints": [
                {
                  "id": "xs",
                  "label": "XS",
                  "max": 575
                },
                {
                  "id": "sm",
                  "label": "SM",
                  "min": 576,
                  "max": 767
                },
                {
                  "id": "md",
                  "label": "MD",
                  "min": 768,
                  "max": 991
                },
                {
                  "id": "lg",
                  "label": "LG",
                  "min": 992,
                  "max": 1279
                },
                {
                  "id": "xl",
                  "label": "XL",
                  "min": 1280
                }
              ]
            }
          }
        },
        { path: '/about', title: 'À propos', status: 'in_progress', builderState: 'editing', ui: { variant: { version: 1, model: { id: 'root', tag: 'div', classes: ['page'], children: [{ id: 'cardA', tag: 'div', classes: ['card'], children: [{ id: 't', tag: 'div', classes: ['title'], text: 'À propos' }, { id: 's', tag: 'div', classes: ['subtitle'], text: 'Notre équipe & mission' }, { id: 'tg', tag: 'div', children: [{ id: 't1', tag: 'span', classes: ['tag', 'blue'], text: 'team' }, { id: 't2', tag: 'span', classes: ['tag'], text: 'mission' }] }, { id: 'p', tag: 'p', text: 'Nous construisons des expériences élégantes et performantes.' }, { id: 'row', tag: 'div', classes: ['row'], children: [{ id: 'c1', tag: 'div', classes: ['col'], children: [{ id: 'sc1', tag: 'div', classes: ['card'], children: [{ id: 'st1', tag: 'div', classes: ['title'], text: 'Mission' }, { id: 'ss1', tag: 'div', classes: ['subtitle'], text: 'Créer de la valeur' }] }] }, { id: 'c2', tag: 'div', classes: ['col'], children: [{ id: 'sc2', tag: 'div', classes: ['card'], children: [{ id: 'st2', tag: 'div', classes: ['title'], text: 'Équipe' }, { id: 'ss2', tag: 'div', classes: ['subtitle'], text: 'Experts Produit/Dev' }] }] }] }] }] } as any, classes: DEFAULT_CLASSES, tokens: { '--color-primary': '#111' }, breakpoints: ['xs', 'sm', 'md', 'lg', 'xl'] } } },
        { path: '/products', title: 'Produits', status: 'in_progress', builderState: 'editing', ui: { variant: { version: 1, model: { id: 'root', tag: 'div', classes: ['page'], children: [{ id: 'hero', tag: 'div', classes: ['card'], children: [{ id: 'ht', tag: 'div', classes: ['title'], text: 'Produits' }, { id: 'hs', tag: 'div', classes: ['subtitle'], text: 'Parcourez notre catalogue — interfaces élégantes, performance moderne' }, { id: 'filters', tag: 'div', classes: ['row'], children: [{ id: 'q', tag: 'input', classes: ['form-control'], attrs: { placeholder: 'Rechercher un produit…' } as any }, { id: 'fA', tag: 'span', classes: ['tag'], text: 'Tous' }, { id: 'fB', tag: 'span', classes: ['tag', 'blue'], text: 'Nouveau' }, { id: 'fC', tag: 'span', classes: ['tag', 'warn'], text: 'Promo' }, { id: 'btn', tag: 'button', classes: ['btn'], text: 'Filtrer' }] }] }, { id: 'grid', tag: 'div', classes: ['grid'], children: [{ id: 'p1', tag: 'div', classes: ['card'], children: [{ id: 'img1', tag: 'div', classes: ['img'] }, { id: 'pt1', tag: 'div', classes: ['title'], text: 'Produit 1' }, { id: 'ps1', tag: 'div', classes: ['subtitle'], text: 'Description concise du produit.' }, { id: 'row1', tag: 'div', classes: ['row'], children: [{ id: 'price1', tag: 'div', classes: ['price'], text: '29€' }, { id: 'cta1', tag: 'div', style: { marginLeft: 'auto' }, children: [{ id: 'buy1', tag: 'button', classes: ['btn', 'primary'], text: 'Acheter' }] }] }] }] }] } as any, classes: DEFAULT_CLASSES, tokens: { '--color-primary': '#111' }, breakpoints: ['xs', 'sm', 'md', 'lg', 'xl'] } } },
        { path: '/pricing', title: 'Tarifs', status: 'in_progress', builderState: 'editing', ui: { variant: { version: 1, model: { id: 'root', tag: 'div', classes: ['page'], children: [{ id: 'hero', tag: 'div', classes: ['card'], children: [{ id: 'ht', tag: 'div', classes: ['title'], text: 'Tarifs' }, { id: 'hs', tag: 'div', classes: ['subtitle'], text: 'Choisissez le plan adapté — simple, transparent' }, { id: 'switch', tag: 'div', classes: ['row'], children: [{ id: 'pill1', tag: 'span', classes: ['pill', 'active'], text: 'Mensuel' }, { id: 'pill2', tag: 'span', classes: ['pill'], text: 'Annuel -10%' }] }] }, { id: 'plans', tag: 'div', classes: ['grid'], children: [{ id: 'pl1', tag: 'div', classes: ['price-card', 'card'], children: [{ id: 'badge1', tag: 'div', classes: ['badge'], text: 'Populaire' }, { id: 'pt1', tag: 'div', classes: ['title'], text: 'Pro' }, { id: 'pr1', tag: 'div', classes: ['price'], text: '29€/mois' }, { id: 'fe1', tag: 'ul', classes: ['feature-list'], children: [{ id: 'f11', tag: 'li', classes: ['feature'], text: 'Composants UI premium' }, { id: 'f12', tag: 'li', classes: ['feature'], text: 'E-mails illimités' }] }, { id: 'cta1', tag: 'div', classes: ['row'], children: [{ id: 'btn1', tag: 'button', classes: ['btn', 'primary'], text: 'Choisir' }] }] }] }] } as any, classes: DEFAULT_CLASSES, tokens: { '--color-primary': '#111' }, breakpoints: ['xs', 'sm', 'md', 'lg', 'xl'] } } },
        { path: '/contact', title: 'Contact', status: 'empty', builderState: 'none', ui: { variant: { version: 1, model: { id: 'root', tag: 'div', classes: ['page'], children: [{ id: 't', tag: 'div', classes: ['title'], text: 'Contact' }, { id: 'form', tag: 'div', classes: ['card'], children: [{ id: 'row1', tag: 'div', classes: ['row'], children: [{ id: 'c11', tag: 'div', classes: ['col'], children: [{ id: 'l1', tag: 'label', text: 'Nom' }, { id: 'i1', tag: 'input', classes: ['form-control'], attrs: { placeholder: 'Votre nom' } as any }] }, { id: 'c12', tag: 'div', classes: ['col'], children: [{ id: 'l2', tag: 'label', text: 'Email' }, { id: 'i2', tag: 'input', classes: ['form-control'], attrs: { placeholder: 'email@exemple.com' } as any }] }] }, { id: 'row2', tag: 'div', children: [{ id: 'l3', tag: 'label', text: 'Message' }, { id: 'ta', tag: 'textarea', classes: ['form-control'] }] }, { id: 'row3', tag: 'div', children: [{ id: 'btn', tag: 'button', classes: ['btn', 'primary'], text: 'Envoyer' }] }] }] } as any, classes: DEFAULT_CLASSES, tokens: { '--color-primary': '#111' }, breakpoints: ['xs', 'sm', 'md', 'lg', 'xl'] } } },
        { path: '/blog', title: 'Blog', status: 'empty', builderState: 'none', ui: { variant: { version: 1, model: { id: 'root', tag: 'div', classes: ['page'], children: [{ id: 'hero', tag: 'div', classes: ['card'], children: [{ id: 'ht', tag: 'div', classes: ['title'], text: 'Blog' }, { id: 'hs', tag: 'div', classes: ['subtitle'], text: 'Articles, guides et actualités produit' }, { id: 'hrow', tag: 'div', classes: ['row'], children: [{ id: 'hbtn1', tag: 'button', classes: ['btn', 'primary'], text: 'Derniers' }, { id: 'hbtn2', tag: 'button', classes: ['btn'], text: 'Guides' }, { id: 'hbtn3', tag: 'button', classes: ['btn'], text: 'Design' }, { id: 'hbtn4', tag: 'button', classes: ['btn'], text: 'Tech' }] }] }, { id: 'grid', tag: 'div', classes: ['grid'], children: [{ id: 'post1', tag: 'div', classes: ['card'], children: [{ id: 'img1', tag: 'div', classes: ['img'] }, { id: 'pt1', tag: 'div', classes: ['title'], text: 'Titre de l’article 1' }, { id: 'ps1', tag: 'div', classes: ['subtitle'], text: "Extrait court décrivant l’article." }, { id: 'meta1', tag: 'div', classes: ['row'], children: [{ id: 'av1', tag: 'div', classes: ['avatar'], text: 'EB' }, { id: 'info1', tag: 'div', children: [{ id: 'auth1', tag: 'div', text: 'Edouard Bernier' }, { id: 'date1', tag: 'div', classes: ['muted'], text: 'il y a 2 jours · 6 min' }] }, { id: 'cta1', tag: 'div', style: { marginLeft: 'auto' }, children: [{ id: 'read1', tag: 'button', classes: ['btn'], text: 'Lire' }] }] }] }] }, { id: 'pagination', tag: 'div', classes: ['card'], children: [{ id: 'pRow', tag: 'div', classes: ['row'], children: [{ id: 'prev', tag: 'button', classes: ['btn'], text: 'Précédent' }, { id: 'next', tag: 'button', classes: ['btn', 'primary'], text: 'Suivant' }] }] }] } as any, classes: DEFAULT_CLASSES, tokens: { '--color-primary': '#111' }, breakpoints: ['xs', 'sm', 'md', 'lg', 'xl'] } } },
        { path: '/table', title: 'Tableau', status: 'in_progress', builderState: 'editing', ui: { variant: { version: 1, model: { id: 'root', tag: 'div', classes: ['page'], children: [{ id: 't', tag: 'div', classes: ['title'], text: 'Tableau' }, { id: 'card', tag: 'div', classes: ['card'], children: [{ id: 'table', tag: 'table', classes: ['table'], children: [{ id: 'thead', tag: 'thead', children: [{ id: 'trh', tag: 'tr', children: [{ id: 'th1', tag: 'th', classes: ['th'], text: 'Nom' }, { id: 'th2', tag: 'th', classes: ['th'], text: 'Tag' }, { id: 'th3', tag: 'th', classes: ['th'], text: 'Statut' }] }] }, { id: 'tbody', tag: 'tbody', children: [{ id: 'tr1', tag: 'tr', children: [{ id: 'td11', tag: 'td', classes: ['td'], text: 'Item 1' }, { id: 'td12', tag: 'td', classes: ['td'], children: [{ id: 'chip1', tag: 'span', classes: ['tag', 'blue'], text: 'blue' }] }, { id: 'td13', tag: 'td', classes: ['td'], text: 'actif' }] }] }] }] }] } as any, classes: DEFAULT_CLASSES, tokens: { '--color-primary': '#111' }, breakpoints: ['xs', 'sm', 'md', 'lg', 'xl'] } } },
        { path: '/components', title: 'Composants', status: 'in_progress', builderState: 'editing', ui: { variant: { version: 1, model: { id: 'root', tag: 'div', classes: ['page'], children: [{ id: 'card1', tag: 'div', classes: ['card'], children: [{ id: 't1', tag: 'div', classes: ['title'], text: 'Titres' }, { id: 'h1', tag: 'h1', text: 'H1' }, { id: 'h2', tag: 'h2', text: 'H2' }, { id: 'h3', tag: 'h3', text: 'H3' }] }, { id: 'card2', tag: 'div', classes: ['card'], children: [{ id: 't2', tag: 'div', classes: ['title'], text: 'Boutons & Tags' }, { id: 'btns', tag: 'div', children: [{ id: 'b1', tag: 'button', classes: ['btn', 'primary'], text: 'Primary' }, { id: 'b2', tag: 'button', classes: ['btn'], text: 'Default' }, { id: 'tg1', tag: 'span', classes: ['tag', 'blue'], text: 'blue' }, { id: 'tg2', tag: 'span', classes: ['tag', 'warn'], text: 'warn' }] }] }, { id: 'card3', tag: 'div', classes: ['card'], children: [{ id: 't3', tag: 'div', classes: ['title'], text: 'List' }, { id: 'ul', tag: 'ul', children: [{ id: 'li1', tag: 'li', text: 'Item 1' }, { id: 'li2', tag: 'li', text: 'Item 2' }] }] }] } as any, classes: DEFAULT_CLASSES, tokens: { '--color-primary': '#111' }, breakpoints: ['xs', 'sm', 'md', 'lg', 'xl'] } } },
        { path: '/flex', title: 'Flex', status: 'in_progress', builderState: 'editing', ui: { variant: { version: 1, model: { id: 'root', tag: 'div', classes: ['page'], children: [{ id: 't', tag: 'div', classes: ['title'], text: 'Flex demo' }, { id: 'row1', tag: 'div', classes: ['row'], children: [{ id: 'a', tag: 'div', classes: ['card'], children: [{ id: 'ta', tag: 'div', classes: ['subtitle'], text: 'A' }] }, { id: 'b', tag: 'div', classes: ['card'], children: [{ id: 'tb', tag: 'div', classes: ['subtitle'], text: 'B' }] }, { id: 'c', tag: 'div', classes: ['card'], children: [{ id: 'tc', tag: 'div', classes: ['subtitle'], text: 'C' }] }] }] } as any, classes: DEFAULT_CLASSES, tokens: { '--color-primary': '#111' }, breakpoints: ['xs', 'sm', 'md', 'lg', 'xl'] } } },
        { path: '/navbar', title: 'Navigation', status: 'in_progress', builderState: 'editing', ui: { variant: { version: 1, model: { id: 'root', tag: 'div', classes: ['page'], style: { padding: '0' }, children: [{ id: 'navbar', tag: 'header', classes: ['navbar'], children: [{ id: 'brand', tag: 'div', classes: ['brand'], text: 'Homeport' }, { id: 'nav', tag: 'nav', classes: ['nav'], children: [{ id: 'ni1', tag: 'a', classes: ['nav-item', 'active'], text: 'Accueil' }, { id: 'ni2', tag: 'a', classes: ['nav-item'], text: 'Produits' }, { id: 'ni3', tag: 'a', classes: ['nav-item'], text: 'Tarifs' }, { id: 'ni4', tag: 'a', classes: ['nav-item'], text: 'Contact' }] }] }, { id: 'hero', tag: 'section', classes: ['hero'], children: [{ id: 'ht', tag: 'h1', classes: ['title'], text: 'Construisez des interfaces élégantes' }, { id: 'hp', tag: 'p', classes: ['subtitle'], text: 'Un système de design simple et expressif.' }, { id: 'cta', tag: 'div', classes: ['row'], children: [{ id: 'cta1', tag: 'button', classes: ['btn', 'primary'], text: 'Commencer' }, { id: 'cta2', tag: 'button', classes: ['btn'], text: 'Documentation' }] }] }] } as any, classes: DEFAULT_CLASSES, tokens: { '--color-primary': '#111' }, breakpoints: ['xs', 'sm', 'md', 'lg', 'xl'] } } },
        { path: '/responsive', title: 'Responsive Test', status: 'in_progress', builderState: 'editing', ui: { variant: { version: 1, model: { id: 'root', tag: 'div', classes: ['page'], children: [{ id: 'cardTitle', tag: 'div', classes: ['card'], children: [{ id: 'ct', tag: 'div', classes: ['title'], text: 'Responsive Test' }, { id: 'cs', tag: 'div', classes: ['subtitle'], text: 'Flex + Row/Col + Grid with styleBp' }] }, { id: 'flexDemo', tag: 'div', classes: ['card'], style: { display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }, children: [{ id: 'fa', tag: 'div', classes: ['card'], children: [{ id: 'fat', tag: 'div', classes: ['subtitle'], text: 'Flex A' }] }, { id: 'fb', tag: 'div', classes: ['card'], children: [{ id: 'fbt', tag: 'div', classes: ['subtitle'], text: 'Flex B' }] }, { id: 'fc', tag: 'div', classes: ['card'], children: [{ id: 'fct', tag: 'div', classes: ['subtitle'], text: 'Flex C' }] }] }, { id: 'gridDemo', tag: 'div', classes: ['card'], children: [{ id: 'gt', tag: 'div', classes: ['title'], text: 'Grid responsive' }, { id: 'grid', tag: 'div', classes: ['grid'], children: [{ id: 'g1', tag: 'div', classes: ['card'], children: [{ id: 'g1t', tag: 'div', classes: ['subtitle'], text: 'G1' }] }, { id: 'g2', tag: 'div', classes: ['card'], children: [{ id: 'g2t', tag: 'div', classes: ['subtitle'], text: 'G2' }] }] }] }] } as any, classes: DEFAULT_CLASSES, tokens: { '--color-primary': '#111' }, breakpoints: ['xs', 'sm', 'md', 'lg', 'xl'] } } }
      ]
    }
  ];
  private routeProjects = new Map<string, any>();

  list(): Observable<Website[]> { return of(this.sites); }
  getById(id: string): Observable<Website | undefined> { return of(this.sites.find(s => s.id === id)); }
  upsert(site: Website): Observable<Website> {
    const i = this.sites.findIndex(s => s.id === site.id);
    const incoming = { ...site } as Website;
    if (i >= 0) {
      const prev = this.sites[i];
      // Preserve existing route UI data where not provided in the payload
      const prevByPath = new Map((prev.routes || []).map(r => [r.path, r] as const));
      const mergedRoutes = (incoming.routes || []).map(r => {
        const old = prevByPath.get(r.path);
        if (old && !r.ui && old.ui) return { ...r, ui: old.ui } as WebsiteRoute;
        return r;
      });
      this.sites[i] = { ...incoming, routes: mergedRoutes, updatedAt: new Date().toISOString() };
    } else {
      this.sites = [{ ...incoming, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, ...this.sites];
    }
    return of(incoming);
  }

  // Returns a sample UI Builder project JSON for a given site/route
  getRouteProject(siteId: string, path: string): Observable<UiProject> {
    const key = `${siteId}|${path}`;
    const cached = this.routeProjects.get(key);
    if (cached) return of(cached);
    // If stored on the site/route, use it first (direct UI project on the route)
    const site = this.sites.find(s => s.id === siteId);
    const route = site?.routes?.find(r => r.path === path);
    const storedProj = route?.ui?.variant as UiProject | undefined;
    if (storedProj) {
      this.routeProjects.set(key, storedProj);
      return of(storedProj);
    }
    // Fallback minimal: build a tiny project and persist to sites[].routes[].ui.variant
    const fallback: UiProject = {
      version: 1,
      model: { id: 'root', tag: 'div', classes: ['page'], children: [{ id: 'card', tag: 'div', classes: ['card'], children: [{ id: 't', tag: 'div', classes: ['title'], text: 'Page' }, { id: 's', tag: 'div', classes: ['subtitle'], text: `Aperçu pour ${path}` }] }] } as any,
      classes: DEFAULT_CLASSES,
      tokens: { '--color-primary': '#111' },
      breakpoints: ['xs', 'sm', 'md', 'lg', 'xl']
    };
    if (route) { route.ui = route.ui || {}; route.ui.variant = fallback; }
    this.routeProjects.set(key, fallback);
    return of(fallback);
    /* LEGACY VARIANTS GENERATOR (disabled in favor of DB-stored ui.variant)
    const title = path === '/' ? 'Accueil' : path.replace('/', '').toUpperCase();
    const cardStyle = {
      border: '1px solid #ececec', borderRadius: '14px', padding: '16px', backgroundColor: '#ffffff',
      boxShadow: '0 8px 24px rgba(0,0,0,0.04)'
    } as any;
    const tagStyle = (bg: string, color: string) => ({
      display: 'inline-block', padding: '2px 8px', borderRadius: '999px',
      fontSize: '12px', backgroundColor: bg, color, border: '1px solid rgba(0,0,0,0.06)', marginRight: '6px'
    }) as any;
    const btnStyle = (primary = false) => (primary
      ? ({ display: 'inline-block', padding: '8px 12px', backgroundColor: '#111', color: '#fff', borderRadius: '10px', border: '1px solid #111', marginRight: '8px', cursor: 'pointer' } as any)
      : ({ display: 'inline-block', padding: '8px 12px', backgroundColor: '#fff', color: '#111', borderRadius: '10px', border: '1px solid #e5e7eb', marginRight: '8px', cursor: 'pointer' } as any)
    );
    const sectionTitle = (t: string, s: string) => ([
      { id: 't_' + Math.random().toString(36).slice(2,6), tag: 'div', style: { fontWeight: '600', fontSize: '20px', letterSpacing: '-0.02em', marginBottom: '4px' }, text: t },
      { id: 's_' + Math.random().toString(36).slice(2,6), tag: 'div', style: { color: '#6b7280', fontSize: '12px', marginBottom: '8px' }, text: s },
    ]);
    const model: any = {
      id: 'root', tag: 'div', classes: ['ui-root'], style: { padding: '16px' }, children: [
        { id: 'card1', tag: 'div', style: cardStyle, children: [
          ...sectionTitle(title, 'Page générée pour ' + path),
          { id: 'tags', tag: 'div', style: { marginBottom: '10px' }, children: [
            { id: 'tg1', tag: 'span', style: tagStyle('#f5f5f5', '#111'), text: 'marketing' },
            { id: 'tg2', tag: 'span', style: tagStyle('#eaf4ff', '#1d4ed8'), text: 'blue' },
            { id: 'tg3', tag: 'span', style: tagStyle('#fef9c3', '#92400e'), text: 'wip' },
          ]},
          { id: 'btnrow', tag: 'div', children: [
            { id: 'b1', tag: 'button', style: btnStyle(true), text: 'Action primaire' },
            { id: 'b2', tag: 'button', style: btnStyle(false), text: 'Action secondaire' },
          ]}
        ]},
        { id: 'card2', tag: 'div', style: { ...cardStyle, marginTop: '12px' }, children: [
          ...sectionTitle('Section', 'Liste d’articles (exemple)'),
          { id: 'list', tag: 'div', children: [
            { id: 'li1', tag: 'div', style: { padding: '8px 0', borderBottom: '1px solid #f0f0f0' }, children: [ { id:'h1', tag:'strong', text:'Article 1' }, { id:'p1', tag:'p', text:'Résumé bref de l’article 1.' } ] },
            { id: 'li2', tag: 'div', style: { padding: '8px 0', borderBottom: '1px solid #f0f0f0' }, children: [ { id:'h2', tag:'strong', text:'Article 2' }, { id:'p2', tag:'p', text:'Résumé bref de l’article 2.' } ] },
            { id: 'li3', tag: 'div', style: { padding: '8px 0' }, children: [ { id:'h3', tag:'strong', text:'Article 3' }, { id:'p3', tag:'p', text:'Résumé bref de l’article 3.' } ] }
          ]}
        ]}
      ]
    };
    // Route-specific variations
    const routeLower = (path || '/').toLowerCase();
    const variants: Record<string, any> = {
      '/': {
        id: 'root', tag: 'div', classes:['page'], style: { padding: '16px' }, children: [
          { id: 'card1', tag: 'div', classes:['card'], children: [
            { id:'t', tag:'div', classes:['title'], text: title },
            { id:'s', tag:'div', classes:['subtitle'], text: 'Page générée pour ' + path },
            { id:'tags', tag:'div', children:[
              { id:'tg1', tag:'span', classes:['tag'], text:'marketing' },
              { id:'tg2', tag:'span', classes:['tag','blue'], text:'blue' },
              { id:'tg3', tag:'span', classes:['tag','warn'], text:'wip' },
            ]},
            { id:'btns', tag:'div', classes:['row'], children:[
              { id:'b1', tag:'button', classes:['btn','primary'], text:'Action primaire' },
              { id:'b2', tag:'button', classes:['btn'], text:'Action secondaire' },
            ]}
          ]}
        ]
      },
      '/about': {
        id: 'root', tag: 'div', classes:['page'], style: { padding: '16px' }, children: [
          { id: 'cardA', tag: 'div', classes:['card'], children: [
            { id:'t', tag:'div', classes:['title'], text:'À propos' },
            { id:'s', tag:'div', classes:['subtitle'], text:'Notre équipe & mission' },
            { id: 'tg', tag:'div', style:{ marginBottom:'10px' }, children:[
              { id:'t1', tag:'span', classes:['tag','blue'], text:'team' },
              { id:'t2', tag:'span', classes:['tag'], text:'mission' },
            ]},
            { id: 'p', tag:'p', text:'Nous construisons des expériences élégantes et performantes.' },
            { id:'row', tag:'div', classes:['row'], children:[
              { id:'c1', tag:'div', classes:['col'], children:[ { id:'sc1', tag:'div', classes:['card'], children:[ {id:'st1', tag:'div', classes:['title'], text:'Mission'}, {id:'ss1', tag:'div', classes:['subtitle'], text:'Créer de la valeur'} ] } ] },
              { id:'c2', tag:'div', classes:['col'], children:[ { id:'sc2', tag:'div', classes:['card'], children:[ {id:'st2', tag:'div', classes:['title'], text:'Équipe'}, {id:'ss2', tag:'div', classes:['subtitle'], text:'Experts Produit/Dev'} ] } ] }
            ]}
          ]}
        ]
      },
      '/navbar': {
        id: 'root', tag: 'div', classes:['page'], style: { padding: '0' }, children: [
          { id:'navbar', tag:'header', classes:['navbar'], children:[
            { id:'brand', tag:'div', classes:['brand'], text:'Homeport' },
            { id:'nav', tag:'nav', classes:['nav'], children:[
              { id:'ni1', tag:'a', classes:['nav-item','active'], text:'Accueil' },
              { id:'ni2', tag:'a', classes:['nav-item'], text:'Produits' },
              { id:'ni3', tag:'a', classes:['nav-item'], text:'Tarifs' },
              { id:'ni4', tag:'a', classes:['nav-item'], text:'Contact' },
            ]}
          ]},
          { id:'hero', tag:'section', classes:['hero'], children:[
            { id:'ht', tag:'h1', classes:['title'], text:'Construisez des interfaces élégantes' },
            { id:'hp', tag:'p', classes:['subtitle'], text:'Un système de design simple et expressif.' },
            { id:'cta', tag:'div', classes:['row'], children:[ {id:'cta1', tag:'button', classes:['btn','primary'], text:'Commencer'}, {id:'cta2', tag:'button', classes:['btn'], text:'Documentation'} ] }
          ]}
        ]
      },
      '/products': {
        id: 'root', tag: 'div', classes:['page'], style:{ padding:'16px' }, children:[
          { id:'hero', tag:'div', classes:['card'], children:[
            { id:'ht', tag:'div', classes:['title'], text:'Produits' },
            { id:'hs', tag:'div', classes:['subtitle'], text:"Parcourez notre catalogue — interfaces élégantes, performance moderne" },
            { id:'filters', tag:'div', classes:['row'], children:[
              { id:'q', tag:'input', classes:['form-control'], attrs:{ placeholder:'Rechercher un produit…' } as any },
              { id:'fA', tag:'span', classes:['tag'], text:'Tous' },
              { id:'fB', tag:'span', classes:['tag','blue'], text:'Nouveau' },
              { id:'fC', tag:'span', classes:['tag','warn'], text:'Promo' },
              { id:'btn', tag:'button', classes:['btn'], text:'Filtrer' }
            ]}
          ]},
          { id:'grid', tag:'div', classes:['grid'], children:[
            // 12 cartes produits pour une page longue
            ...Array.from({length: 12}).map((_,i) => ({
              id:'prod'+(i+1), tag:'div', classes:['card'], children:[
                { id:'img'+(i+1), tag:'div', classes:['img'], text:'' },
                { id:'pt'+(i+1), tag:'div', classes:['title'], text:`Produit ${(i+1)}` },
                { id:'ps'+(i+1), tag:'div', classes:['subtitle'], text:'Description concise du produit, bénéfices principaux et usage type.' },
                { id:'tags'+(i+1), tag:'div', children:[ { id:'tg1'+(i+1), tag:'span', classes:['tag'], text:'classic' }, { id:'tg2'+(i+1), tag:'span', classes:['tag','blue'], text:'nouveau' } ] },
                { id:'priceRow'+(i+1), tag:'div', classes:['row'], children:[
                  { id:'price'+(i+1), tag:'div', classes:['price'], text: (i%3===0 ? '29€' : i%3===1 ? '49€' : '99€') },
                  { id:'cta'+(i+1), tag:'div', style:{ marginLeft:'auto' }, children:[ { id:'buy'+(i+1), tag:'button', classes:['btn','primary'], text:'Acheter' } ] }
                ]}
              ]
            }))
          ]}
        ]
      },
      '/pricing': {
        id:'root', tag:'div', classes:['page'], style:{ padding:'16px' }, children:[
          { id:'hero', tag:'div', classes:['card'], children:[
            { id:'ht', tag:'div', classes:['title'], text:'Tarifs' },
            { id:'hs', tag:'div', classes:['subtitle'], text:'Choisissez le plan adapté — simple, transparent' },
            { id:'switch', tag:'div', classes:['row'], children:[
              { id:'pill1', tag:'span', classes:['pill','active'], text:'Mensuel' },
              { id:'pill2', tag:'span', classes:['pill'], text:'Annuel -10%' }
            ]}
          ]},
          { id:'plans', tag:'div', classes:['grid'], children:[
            ...['Basic','Pro','Business','Enterprise'].map((name,idx) => ({
              id:'plan'+idx, tag:'div', classes:['price-card','card'], children:[
                { id:'badge'+idx, tag:'div', classes:['badge'], text: (name==='Pro'?'Populaire':'') },
                { id:'pt'+idx, tag:'div', classes:['title'], text:name },
                { id:'pr'+idx, tag:'div', classes:['price'], text: (name==='Enterprise'?'Sur devis':(idx===0?'0€':'29€')) + '/mois' },
                { id:'fe'+idx, tag:'ul', classes:['feature-list'], children:[
                  { id:'f1'+idx, tag:'li', classes:['feature'], text:'Accès complet au Builder' },
                  { id:'f2'+idx, tag:'li', classes:['feature'], text:'Composants UI premium' },
                  { id:'f3'+idx, tag:'li', classes:['feature'], text:(name==='Basic'?'E-mails limités':'E-mails illimités') },
                ]},
                { id:'cta'+idx, tag:'div', classes:['row'], children:[ { id:'btn'+idx, tag:'button', classes:['btn', (name==='Pro'?'primary':'')].filter(Boolean) as any, text:(name==='Enterprise'?'Contacter':'Choisir') } ] }
              ]
            }))
          ]},
          { id:'faq', tag:'div', classes:['card'], children:[
            { id:'ft', tag:'div', classes:['title'], text:'FAQ' },
            { id:'f1', tag:'div', classes:['subtitle'], text:'Puis-je changer de plan à tout moment ? Oui, en un clic.' },
            { id:'f2', tag:'div', classes:['subtitle'], text:'Offrez-vous des remises annuelles ? Oui, -10% sur annuel.' }
          ]}
        ]
      },
      '/contact': {
        id:'root', tag:'div', classes:['page'], style:{ padding:'16px' }, children:[
          { id:'t', tag:'div', classes:['title'], text:'Contact' },
          { id:'form', tag:'div', classes:['card'], children:[
            { id:'row1', tag:'div', classes:['row'], children:[ {id:'c11', tag:'div', classes:['col'], children:[ {id:'l1', tag:'label', text:'Nom'}, {id:'i1', tag:'input', classes:['form-control'], attrs:{ placeholder:'Votre nom' } as any } ] }, {id:'c12', tag:'div', classes:['col'], children:[ {id:'l2', tag:'label', text:'Email'}, {id:'i2', tag:'input', classes:['form-control'], attrs:{ placeholder:'email@exemple.com' } as any } ] } ] },
            { id:'row2', tag:'div', children:[ {id:'l3', tag:'label', text:'Message'}, {id:'ta', tag:'textarea', classes:['form-control'], text:'' } ] },
            { id:'row3', tag:'div', children:[ {id:'btn', tag:'button', classes:['btn','primary'], text:'Envoyer'} ] }
          ]}
        ]
      },
      '/blog': {
        id:'root', tag:'div', classes:['page'], style:{ padding:'16px' }, children:[
          { id:'hero', tag:'div', classes:['card'], children:[
            { id:'ht', tag:'div', classes:['title'], text:'Blog' },
            { id:'hs', tag:'div', classes:['subtitle'], text:"Articles, guides et actualités produit" },
            { id:'hrow', tag:'div', classes:['row'], children:[
              { id:'hbtn1', tag:'button', classes:['btn','primary'], text:'Derniers' },
              { id:'hbtn2', tag:'button', classes:['btn'], text:'Guides' },
              { id:'hbtn3', tag:'button', classes:['btn'], text:'Design' },
              { id:'hbtn4', tag:'button', classes:['btn'], text:'Tech' }
            ]}
          ]},
          { id:'grid', tag:'div', classes:['grid'], children:[
            // 12+ cartes pour créer une page longue avec scroll
            ...Array.from({length: 16}).map((_,i) => ({
              id:'post'+(i+1), tag:'div', classes:['card'], children:[
                { id:'img'+(i+1), tag:'div', classes:['img'], text:'' },
                { id:'pt'+(i+1), tag:'div', classes:['title'], text:`Titre de l’article ${(i+1)}` },
                { id:'ps'+(i+1), tag:'div', classes:['subtitle'], text:'Extrait court décrivant le contenu de l’article et la valeur pour le lecteur.' },
                { id:'tags'+(i+1), tag:'div', children:[
                  { id:'tgA'+(i+1), tag:'span', classes:['tag'], text:'design' },
                  { id:'tgB'+(i+1), tag:'span', classes:['tag','blue'], text:'ux' }
                ]},
                { id:'meta'+(i+1), tag:'div', classes:['row'], children:[
                  { id:'av'+(i+1), tag:'div', classes:['avatar'], text:'EB' },
                  { id:'info'+(i+1), tag:'div', children:[
                    { id:'auth'+(i+1), tag:'div', text:'Edouard Bernier' },
                    { id:'date'+(i+1), tag:'div', classes:['muted'], text:'il y a 2 jours · 6 min' }
                  ]},
                  { id:'cta'+(i+1), tag:'div', style:{ marginLeft:'auto' }, children:[ { id:'read'+(i+1), tag:'button', classes:['btn'], text:'Lire' } ] }
                ]}
              ]
            }))
          ]},
          { id:'pagination', tag:'div', classes:['card'], children:[
            { id:'pRow', tag:'div', classes:['row'], children:[
              { id:'prev', tag:'button', classes:['btn'], text:'Précédent' },
              { id:'next', tag:'button', classes:['btn','primary'], text:'Suivant' }
            ]}
          ]}
        ]
      },
      '/table': {
        id:'root', tag:'div', classes:['page'], style:{ padding:'16px' }, children:[
          { id:'t', tag:'div', classes:['title'], text:'Tableau' },
          { id:'card', tag:'div', classes:['card'], children:[
            { id:'table', tag:'table', classes:['table'], children:[
              { id:'thead', tag:'thead', children:[ { id:'trh', tag:'tr', children:[ {id:'th1', tag:'th', classes:['th'], text:'Nom'}, {id:'th2', tag:'th', classes:['th'], text:'Tag'}, {id:'th3', tag:'th', classes:['th'], text:'Statut'} ] } ] },
              { id:'tbody', tag:'tbody', children:[
                { id:'tr1', tag:'tr', children:[ {id:'td11', tag:'td', classes:['td'], text:'Item 1'}, {id:'td12', tag:'td', classes:['td'], children:[ {id:'chip1', tag:'span', classes:['tag','blue'], text:'blue'} ] }, {id:'td13', tag:'td', classes:['td'], text:'actif'} ] },
                { id:'tr2', tag:'tr', children:[ {id:'td21', tag:'td', classes:['td'], text:'Item 2'}, {id:'td22', tag:'td', classes:['td'], children:[ {id:'chip2', tag:'span', classes:['tag'], text:'default'} ] }, {id:'td23', tag:'td', classes:['td'], text:'brouillon'} ] }
              ]}
            ]}
          ]}
        ]
      },
      '/components': {
        id:'root', tag:'div', classes:['page'], style:{ padding:'16px' }, children:[
          { id:'card1', tag:'div', classes:['card'], children:[ {id:'t1', tag:'div', classes:['title'], text:'Titres'}, {id:'h1', tag:'h1', text:'H1'}, {id:'h2', tag:'h2', text:'H2'}, {id:'h3', tag:'h3', text:'H3'} ] },
          { id:'card2', tag:'div', classes:['card'], children:[ {id:'t2', tag:'div', classes:['title'], text:'Boutons & Tags'}, {id:'btns', tag:'div', children:[ {id:'b1', tag:'button', classes:['btn','primary'], text:'Primary'}, {id:'b2', tag:'button', classes:['btn'], text:'Default'}, {id:'tg1', tag:'span', classes:['tag','blue'], text:'blue'}, {id:'tg2', tag:'span', classes:['tag','warn'], text:'warn'} ] } ] },
          { id:'card3', tag:'div', classes:['card'], children:[ {id:'t3', tag:'div', classes:['title'], text:'List'}, {id:'ul', tag:'ul', children:[ {id:'li1', tag:'li', text:'Item 1'}, {id:'li2', tag:'li', text:'Item 2'} ] } ] }
        ]
      },
      '/flex': {
        id:'root', tag:'div', classes:['page'], style:{ padding:'16px' }, children:[
          { id:'t', tag:'div', classes:['title'], text:'Flex demo' },
          { id:'row1', tag:'div', classes:['row'], children:[
            { id:'a', tag:'div', classes:['card'], style:{ backgroundColor:'#fef2f2' }, children:[ {id:'ta', tag:'div', classes:['subtitle'], text:'A'} ] },
            { id:'b', tag:'div', classes:['card'], style:{ backgroundColor:'#eff6ff' }, children:[ {id:'tb', tag:'div', classes:['subtitle'], text:'B'} ] },
            { id:'c', tag:'div', classes:['card'], style:{ backgroundColor:'#ecfdf5' }, children:[ {id:'tc', tag:'div', classes:['subtitle'], text:'C'} ] }
          ]}
        ]
      },
      '/responsive': {
        id:'root', tag:'div', classes:['page'], style:{ padding:'16px' }, children:[
          { id:'cardTitle', tag:'div', classes:['card'], children:[ { id:'ct', tag:'div', classes:['title'], text:'Responsive Test' }, { id:'cs', tag:'div', classes:['subtitle'], text:'Flex + Row/Col + Grid with styleBp' } ] },
          // Flex with responsive direction
          { id:'flexDemo', tag:'div', classes:['card'], style:{ display:'flex', gap:'12px', alignItems:'center', justifyContent:'space-between' }, styleBp:{ sm:{ flexDirection:'column' }, md:{ flexDirection:'row' } }, children:[
            { id:'fa', tag:'div', classes:['card'], style:{ backgroundColor:'#fef2f2' }, children:[ {id:'fat', tag:'div', classes:['subtitle'], text:'Flex A'} ] },
            { id:'fb', tag:'div', classes:['card'], style:{ backgroundColor:'#eff6ff' }, children:[ {id:'fbt', tag:'div', classes:['subtitle'], text:'Flex B'} ] },
            { id:'fc', tag:'div', classes:['card'], style:{ backgroundColor:'#ecfdf5' }, children:[ {id:'fct', tag:'div', classes:['subtitle'], text:'Flex C'} ] }
          ]},
          // Row/Col demo (row is flex)
          { id:'rowDemo', tag:'div', classes:['card'], children:[
            { id:'rt', tag:'div', classes:['title'], text:'Row / Col' },
            { id:'r1', tag:'div', classes:['row'], children:[
              { id:'r1a', tag:'div', classes:['col'], children:[ { id:'r1ac', tag:'div', classes:['card'], children:[ { id:'r1at', tag:'div', classes:['subtitle'], text:'Col A' } ] } ] },
              { id:'r1b', tag:'div', classes:['col'], children:[ { id:'r1bc', tag:'div', classes:['card'], children:[ { id:'r1bt', tag:'div', classes:['subtitle'], text:'Col B' } ] } ] },
              { id:'r1c', tag:'div', classes:['col'], children:[ { id:'r1cc', tag:'div', classes:['card'], children:[ { id:'r1ct', tag:'div', classes:['subtitle'], text:'Col C' } ] } ] }
            ]}
          ]},
          // Grid demo with responsive columns
          { id:'gridDemo', tag:'div', classes:['card'], children:[
            { id:'gt', tag:'div', classes:['title'], text:'Grid responsive' },
            { id:'grid', tag:'div', classes:['grid'], styleBp:{ sm:{ gridTemplateColumns:'1fr' }, md:{ gridTemplateColumns:'repeat(2,1fr)' }, lg:{ gridTemplateColumns:'repeat(3,1fr)' } }, children:[
              { id:'g1', tag:'div', classes:['card'], children:[ { id:'g1t', tag:'div', classes:['subtitle'], text:'G1' } ] },
              { id:'g2', tag:'div', classes:['card'], children:[ { id:'g2t', tag:'div', classes:['subtitle'], text:'G2' } ] },
              { id:'g3', tag:'div', classes:['card'], children:[ { id:'g3t', tag:'div', classes:['subtitle'], text:'G3' } ] },
              { id:'g4', tag:'div', classes:['card'], children:[ { id:'g4t', tag:'div', classes:['subtitle'], text:'G4' } ] }
            ]}
          ]}
        ]
      }
    };
    const chosen = variants[routeLower] || model;
    // Provide reusable classes so the UI Builder loads a richer design system
    const classes = [
      { name: 'page', parts: ['page'], styles: { base: { base: { maxWidth: '1080px', margin: '0 auto' } } } },
      { name: 'card', parts: ['card'], styles: { base: { base: { border: '1px solid #ececec', borderRadius: '14px', padding: '16px', backgroundColor: '#ffffff', boxShadow: '0 8px 24px rgba(0,0,0,0.04)', marginBottom: '12px' } } } },
      { name: 'row', parts: ['row'], styles: { base: { base: { display: 'flex', gap: '12px', alignItems: 'center' } } } },
      { name: 'col', parts: ['col'], styles: { base: { base: { flex: '1 1 0', minWidth: '0' } } } },
      { name: 'btn', parts: ['btn'], styles: { base: { base: { display: 'inline-block', padding: '8px 12px', backgroundColor: '#fff', color: '#111', borderRadius: '10px', border: '1px solid #e5e7eb', marginRight: '8px', cursor: 'pointer' } } } },
      { name: 'btn.primary', parts: ['btn','primary'], styles: { base: { base: { backgroundColor: '#111', color: '#fff', border: '1px solid #111' } } } },
      { name: 'tag', parts: ['tag'], styles: { base: { base: { display: 'inline-block', padding: '2px 8px', borderRadius: '999px', fontSize: '12px', backgroundColor: '#f5f5f5', color: '#111', border: '1px solid rgba(0,0,0,0.06)', marginRight: '6px' } } } },
      { name: 'tag.blue', parts: ['tag','blue'], styles: { base: { base: { backgroundColor: '#eaf4ff', color: '#1d4ed8' } } } },
      { name: 'tag.warn', parts: ['tag','warn'], styles: { base: { base: { backgroundColor: '#fef9c3', color: '#92400e' } } } },
      { name: 'title', parts: ['title'], styles: { base: { base: { fontWeight: '600', fontSize: '20px', letterSpacing: '-0.02em', marginBottom: '4px' } } } },
      { name: 'subtitle', parts: ['subtitle'], styles: { base: { base: { color: '#6b7280', fontSize: '12px', marginBottom: '8px' } } } },
      // Table styles
      { name: 'table', parts: ['table'], styles: { base: { base: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' } } } },
      { name: 'th', parts: ['th'], styles: { base: { base: { textAlign: 'left', padding: '8px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#fafafa' } } } },
      { name: 'td', parts: ['td'], styles: { base: { base: { padding: '8px', borderBottom: '1px solid #f0f0f0' } } } },
      // Form controls
      { name: 'form-control', parts: ['form-control'], styles: { base: { base: { border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px', width: '100%' } } } },
      // Navbar & hero
      { name: 'navbar', parts: ['navbar'], styles: { base: { base: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 16px', borderBottom:'1px solid #ececec', background:'#fff', position:'sticky', top:'0', zIndex:'10' } } } },
      { name: 'brand', parts: ['brand'], styles: { base: { base: { fontWeight:'700', letterSpacing:'-0.02em' } } } },
      { name: 'nav', parts: ['nav'], styles: { base: { base: { display:'flex', gap:'12px' } } } },
      { name: 'nav-item', parts: ['nav-item'], styles: { base: { base: { padding:'6px 10px', borderRadius:'8px', color:'#374151' } } } },
      { name: 'nav-item.active', parts: ['nav-item','active'], styles: { base: { base: { background:'#eef2ff', color:'#1d4ed8', border:'1px solid #e5e7eb' } } } },
      { name: 'hero', parts: ['hero'], styles: { base: { base: { padding:'32px 16px', background:'linear-gradient(180deg,#ffffff, #fafafa)', borderBottom:'1px solid #ececec', textAlign:'center' } } } },
      // Grid demo
      { name: 'grid', parts: ['grid'], styles: { base: { base: { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:'12px' } } } },
      // Pricing/badges/pills
      { name: 'badge', parts: ['badge'], styles: { base: { base: { display:'inline-block', padding:'2px 8px', borderRadius:'999px', fontSize:'11px', color:'#1d4ed8', background:'#eef2ff', border:'1px solid #e5e7eb', marginBottom:'6px' } } } },
      { name: 'pill', parts: ['pill'], styles: { base: { base: { display:'inline-block', padding:'4px 10px', borderRadius:'999px', border:'1px solid #e5e7eb', cursor:'pointer' } } } },
      { name: 'pill.active', parts: ['pill','active'], styles: { base: { base: { background:'#111', color:'#fff', border:'1px solid #111' } } } },
      { name: 'price-card', parts: ['price-card'], styles: { base: { base: { position:'relative' } } } },
      { name: 'price', parts: ['price'], styles: { base: { base: { fontWeight:'700', letterSpacing:'-0.01em' } } } },
      { name: 'feature-list', parts: ['feature-list'], styles: { base: { base: { listStyle:'none', padding:'0', margin:'8px 0', display:'flex', flexDirection:'column', gap:'6px' } } } },
      { name: 'feature', parts: ['feature'], styles: { base: { base: { padding:'4px 0', color:'#374151' } } } },
      // Blog specific utility classes
      { name: 'avatar', parts: ['avatar'], styles: { base: { base: { width:'28px', height:'28px', borderRadius:'999px', background:'#f3f4f6', border:'1px solid #e5e7eb', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:'600', color:'#111' } } } },
      { name: 'muted', parts: ['muted'], styles: { base: { base: { color:'#9ca3af', fontSize:'12px' } } } },
      { name: 'img', parts: ['img'], styles: { base: { base: { width:'100%', height:'140px', borderRadius:'10px', background:'linear-gradient(135deg,#eef2ff,#fafafa)', border:'1px solid #e5e7eb', marginBottom:'8px' } } } },
    ];
    const project: UiProject = { version: 1, model: chosen, classes, tokens: {}, breakpoints: ['xs','sm','md','lg','xl'] };
    // Persist back into the in-memory site store directly under ui (requested format)
    if (route) { route.ui = { variant: project }; }
    this.routeProjects.set(key, project);
    return of(project);
    */
  }
}
