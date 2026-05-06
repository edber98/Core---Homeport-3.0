# Plugin risk annotation — report

Generated: 2026-04-14T14:40:46.289Z

## Totals

- Manifests processed: **64**
- Functions annotated: **1362**
  - safe: **705**
  - write: **506**
  - destructive: **137**
  - elevated: **14**

## Breakdown per plugin

| Plugin | Total | safe | write | destructive | elevated |
|---|---:|---:|---:|---:|---:|
| local/events | 2 | 2 | 0 | 0 | 0 |
| local/logic | 5 | 4 | 0 | 0 | 1 |
| repos/airtable | 13 | 8 | 4 | 1 | 0 |
| repos/anthropic | 9 | 5 | 4 | 0 | 0 |
| repos/asana | 18 | 10 | 7 | 1 | 0 |
| repos/atera | 43 | 27 | 11 | 5 | 0 |
| repos/aws | 18 | 7 | 8 | 3 | 0 |
| repos/brevo | 21 | 10 | 10 | 1 | 0 |
| repos/calendars | 8 | 2 | 6 | 0 | 0 |
| repos/calendly | 15 | 8 | 5 | 2 | 0 |
| repos/clickup | 19 | 11 | 7 | 1 | 0 |
| repos/digiforma | 29 | 14 | 12 | 3 | 0 |
| repos/discord | 23 | 12 | 8 | 2 | 1 |
| repos/docusign | 14 | 9 | 4 | 1 | 0 |
| repos/dolibarr | 45 | 25 | 17 | 3 | 0 |
| repos/dropbox | 16 | 4 | 3 | 9 | 0 |
| repos/email | 6 | 3 | 3 | 0 | 0 |
| repos/facebook | 16 | 6 | 8 | 2 | 0 |
| repos/freshdesk | 23 | 15 | 7 | 1 | 0 |
| repos/github | 30 | 16 | 13 | 1 | 0 |
| repos/gitlab | 30 | 15 | 11 | 3 | 1 |
| repos/google-ai | 5 | 3 | 2 | 0 | 0 |
| repos/google-chat | 3 | 1 | 2 | 0 | 0 |
| repos/google-drive | 38 | 15 | 16 | 6 | 1 |
| repos/http | 2 | 1 | 0 | 0 | 1 |
| repos/hubspot | 30 | 14 | 12 | 4 | 0 |
| repos/intercom | 26 | 13 | 12 | 1 | 0 |
| repos/jira | 19 | 10 | 8 | 1 | 0 |
| repos/linear | 19 | 11 | 8 | 0 | 0 |
| repos/linkedin | 11 | 2 | 8 | 1 | 0 |
| repos/mailchimp | 25 | 15 | 8 | 2 | 0 |
| repos/microsoft | 35 | 14 | 19 | 2 | 0 |
| repos/microsoft-teams | 3 | 1 | 2 | 0 | 0 |
| repos/mistral | 10 | 4 | 6 | 0 | 0 |
| repos/monday | 19 | 10 | 6 | 1 | 2 |
| repos/nextcloud | 34 | 13 | 16 | 5 | 0 |
| repos/notion | 23 | 12 | 9 | 2 | 0 |
| repos/odoo | 73 | 36 | 25 | 11 | 1 |
| repos/onedrive-sharepoint | 3 | 0 | 3 | 0 | 0 |
| repos/openai | 11 | 7 | 3 | 0 | 1 |
| repos/openproject | 8 | 5 | 3 | 0 | 0 |
| repos/pappers | 12 | 12 | 0 | 0 | 0 |
| repos/pennylane | 24 | 14 | 9 | 1 | 0 |
| repos/pipedrive | 29 | 16 | 9 | 4 | 0 |
| repos/prestashop | 22 | 18 | 4 | 0 | 0 |
| repos/quickbooks | 32 | 20 | 8 | 4 | 0 |
| repos/salesforce | 31 | 15 | 12 | 4 | 0 |
| repos/sap | 30 | 16 | 10 | 2 | 2 |
| repos/shopify | 28 | 16 | 10 | 2 | 0 |
| repos/slack | 30 | 11 | 14 | 5 | 0 |
| repos/sql-database | 9 | 3 | 2 | 1 | 3 |
| repos/stripe | 37 | 21 | 9 | 7 | 0 |
| repos/supabase | 15 | 8 | 4 | 3 | 0 |
| repos/telegram | 29 | 9 | 19 | 1 | 0 |
| repos/trello | 54 | 23 | 22 | 9 | 0 |
| repos/twilio | 14 | 9 | 4 | 1 | 0 |
| repos/twitter | 15 | 13 | 1 | 1 | 0 |
| repos/typeform | 14 | 9 | 3 | 2 | 0 |
| repos/whatsapp | 14 | 5 | 9 | 0 | 0 |
| repos/woocommerce | 25 | 13 | 9 | 3 | 0 |
| repos/wordpress | 27 | 11 | 13 | 3 | 0 |
| repos/yousign | 22 | 12 | 6 | 4 | 0 |
| repos/zendesk | 24 | 14 | 8 | 2 | 0 |
| repos/zoom | 25 | 17 | 5 | 3 | 0 |

## Items still classified as `safe` but without explicit `riskReason`

These were auto-classified by the heuristic as safe (read-only) and MAY deserve
another human pass if they perform any external call. They are listed so reviewers
can quickly spot-check and add `riskReason` or upgrade to `write` where appropriate.

Total candidates: **642**

- `repos/airtable`  ·  `airtable_record_get`  —  Obtenir un enregistrement
- `repos/airtable`  ·  `airtable_records_list`  —  Lister les enregistrements
- `repos/airtable`  ·  `airtable_table_get`  —  Obtenir une table
- `repos/airtable`  ·  `airtable_tables_list`  —  Lister les tables
- `repos/airtable`  ·  `airtable_fields_list`  —  Lister les champs
- `repos/airtable`  ·  `airtable_bases_list`  —  Lister les bases
- `repos/airtable`  ·  `airtable_views_list`  —  Lister les vues
- `repos/anthropic`  ·  `anthropic_list_models`  —  Lister les modèles
- `repos/anthropic`  ·  `anthropic_get_model`  —  Récupérer un modèle
- `repos/anthropic`  ·  `anthropic_count_tokens`  —  Compter les tokens
- `repos/asana`  ·  `asana_task_get`  —  Obtenir une tâche
- `repos/asana`  ·  `asana_tasks_list`  —  Lister les tâches
- `repos/asana`  ·  `asana_project_get`  —  Obtenir un projet
- `repos/asana`  ·  `asana_projects_list`  —  Lister les projets
- `repos/asana`  ·  `asana_sections_list`  —  Lister les sections
- `repos/asana`  ·  `asana_tags_list`  —  Lister les tags
- `repos/asana`  ·  `asana_user_get`  —  Obtenir un utilisateur
- `repos/asana`  ·  `asana_users_list_workspace`  —  Lister les utilisateurs
- `repos/asana`  ·  `asana_workspaces_list`  —  Lister les workspaces
- `repos/atera`  ·  `atera_customer_get`  —  Récupérer un client
- `repos/atera`  ·  `atera_customers_list`  —  Lister les clients
- `repos/atera`  ·  `atera_customer_search`  —  Rechercher des clients
- `repos/atera`  ·  `atera_customer_find`  —  Trouver un client
- `repos/atera`  ·  `atera_contact_get`  —  Récupérer un contact
- `repos/atera`  ·  `atera_contacts_list`  —  Lister les contacts
- `repos/atera`  ·  `atera_ticket_get`  —  Récupérer un ticket
- `repos/atera`  ·  `atera_tickets_list`  —  Lister les tickets
- `repos/atera`  ·  `atera_agent_get`  —  Récupérer un agent
- `repos/atera`  ·  `atera_agents_list`  —  Lister les agents
- `repos/atera`  ·  `atera_alert_get`  —  Récupérer une alerte
- `repos/atera`  ·  `atera_alerts_list`  —  Lister les alertes
- `repos/atera`  ·  `atera_alerts_count`  —  Compter les alertes
- `repos/atera`  ·  `atera_device_get`  —  Récupérer un appareil
- `repos/atera`  ·  `atera_devices_list`  —  Lister les appareils
- `repos/atera`  ·  `atera_device_by_agent`  —  Appareil par agent
- `repos/atera`  ·  `atera_contract_get`  —  Récupérer un contrat
- `repos/atera`  ·  `atera_contracts_list`  —  Lister les contrats
- `repos/atera`  ·  `atera_kb_get`  —  Récupérer un article KB
- `repos/atera`  ·  `atera_kb_list`  —  Lister les articles KB
- `repos/atera`  ·  `atera_department_get`  —  Récupérer un département
- `repos/atera`  ·  `atera_departments_list`  —  Lister les départements
- `repos/atera`  ·  `atera_rates_get`  —  Lister les tarifs
- `repos/atera`  ·  `atera_billing_contact_get`  —  Récupérer une facture
- `repos/atera`  ·  `atera_invoice_get`  —  Lister les factures
- `repos/atera`  ·  `atera_custom_value_get`  —  Récupérer une valeur personnalisée
- `repos/atera`  ·  `atera_custom_values_list`  —  Lister les champs personnalisés
- `repos/aws`  ·  `aws_s3_get_object`  —  Récupérer un objet
- `repos/aws`  ·  `aws_s3_list_objects`  —  Lister les objets
- `repos/aws`  ·  `aws_s3_list_buckets`  —  Lister les buckets
- `repos/aws`  ·  `aws_ses_get_template`  —  Récupérer un template
- `repos/aws`  ·  `aws_ses_list_templates`  —  Lister les templates
- `repos/aws`  ·  `aws_ses_list_identities`  —  Lister les identités
- `repos/brevo`  ·  `brevo_contact_get`  —  Récupérer un contact
- `repos/brevo`  ·  `brevo_contacts_list`  —  Lister les contacts
- `repos/brevo`  ·  `brevo_list_get`  —  Récupérer une liste
- `repos/brevo`  ·  `brevo_lists_list`  —  Lister les listes
- `repos/brevo`  ·  `brevo_campaign_get`  —  Récupérer une campagne
- `repos/brevo`  ·  `brevo_campaigns_list`  —  Lister les campagnes
- `repos/brevo`  ·  `brevo_smtp_stats`  —  Statistiques SMTP
- `repos/brevo`  ·  `brevo_templates_list`  —  Lister les templates
- `repos/brevo`  ·  `brevo_template_get`  —  Récupérer un template
- `repos/calendly`  ·  `calendly_event_get`  —  Récupérer un événement
- `repos/calendly`  ·  `calendly_event_types_list`  —  Lister les types d'événements
- `repos/calendly`  ·  `calendly_event_type_get`  —  Récupérer un type d'événement
- `repos/calendly`  ·  `calendly_user_get_me`  —  Récupérer mon profil
- `repos/calendly`  ·  `calendly_organization_get`  —  Récupérer l'organisation
- `repos/calendly`  ·  `calendly_organization_members_list`  —  Lister les membres
- `repos/calendly`  ·  `calendly_webhooks_list`  —  Lister les webhooks
- `repos/clickup`  ·  `clickup_task_get`  —  Obtenir une tâche
- `repos/clickup`  ·  `clickup_tasks_list`  —  Lister les tâches
- `repos/clickup`  ·  `clickup_list_get`  —  Obtenir une liste
- `repos/clickup`  ·  `clickup_folder_get`  —  Obtenir un dossier
- `repos/clickup`  ·  `clickup_folders_list`  —  Lister les dossiers
- `repos/clickup`  ·  `clickup_space_get`  —  Obtenir un espace
- `repos/clickup`  ·  `clickup_spaces_list`  —  Lister les espaces
- `repos/clickup`  ·  `clickup_teams_list`  —  Lister les workspaces
- `repos/clickup`  ·  `clickup_tags_list`  —  Lister les tags
- `repos/clickup`  ·  `clickup_time_entries_list`  —  Lister les entrées de temps
- `repos/digiforma`  ·  `digiforma_trainees_list`  —  Lister les stagiaires
- `repos/digiforma`  ·  `digiforma_trainee_get`  —  Obtenir un stagiaire
- `repos/digiforma`  ·  `digiforma_companies_list`  —  Lister les entreprises
- `repos/digiforma`  ·  `digiforma_company_get`  —  Obtenir une entreprise
- `repos/digiforma`  ·  `digiforma_sessions_list`  —  Lister les sessions
- `repos/digiforma`  ·  `digiforma_session_get`  —  Obtenir une session
- `repos/digiforma`  ·  `digiforma_programs_list`  —  Lister les programmes
- `repos/digiforma`  ·  `digiforma_program_get`  —  Obtenir un programme
- `repos/digiforma`  ·  `digiforma_instructors_list`  —  Lister les formateurs
- `repos/digiforma`  ·  `digiforma_instructor_get`  —  Obtenir un formateur
- `repos/digiforma`  ·  `digiforma_invoices_list`  —  Lister les factures
- `repos/digiforma`  ·  `digiforma_invoice_get`  —  Obtenir une facture
- `repos/digiforma`  ·  `digiforma_quotations_list`  —  Lister les devis
- `repos/digiforma`  ·  `digiforma_quotation_get`  —  Obtenir un devis
- `repos/discord`  ·  `discord_get_message`  —  Récupérer un message
- `repos/discord`  ·  `discord_list_messages`  —  Lister les messages
- `repos/discord`  ·  `discord_get_channel`  —  Obtenir un canal
- `repos/discord`  ·  `discord_list_channels`  —  Lister les canaux
- `repos/discord`  ·  `discord_get_guild`  —  Obtenir un serveur
- `repos/discord`  ·  `discord_list_guild_channels`  —  Lister les canaux du serveur
- `repos/discord`  ·  `discord_list_guild_members`  —  Lister les membres du serveur
- `repos/discord`  ·  `discord_list_roles`  —  Lister les rôles
- `repos/discord`  ·  `discord_get_user`  —  Obtenir un utilisateur
- `repos/discord`  ·  `discord_get_me`  —  Obtenir les infos du bot
- `repos/discord`  ·  `discord_list_threads`  —  Lister les fils actifs
- `repos/docusign`  ·  `docusign_envelope_get`  —  Récupérer une enveloppe
- `repos/docusign`  ·  `docusign_envelopes_list`  —  Lister les enveloppes
- `repos/docusign`  ·  `docusign_envelope_documents_download`  —  Télécharger les documents
- `repos/docusign`  ·  `docusign_recipients_list`  —  Lister les destinataires
- `repos/docusign`  ·  `docusign_template_get`  —  Récupérer un modèle
- `repos/docusign`  ·  `docusign_templates_list`  —  Lister les modèles
- `repos/docusign`  ·  `docusign_documents_list`  —  Lister les documents
- `repos/docusign`  ·  `docusign_tabs_list`  —  Lister les onglets
- `repos/dolibarr`  ·  `dolibarr_thirdparty_get`  —  Récupérer un tiers
- `repos/dolibarr`  ·  `dolibarr_thirdparties_list`  —  Lister les tiers
- `repos/dolibarr`  ·  `dolibarr_contact_get`  —  Récupérer un contact
- `repos/dolibarr`  ·  `dolibarr_contacts_list`  —  Lister les contacts
- `repos/dolibarr`  ·  `dolibarr_product_get`  —  Récupérer un produit
- `repos/dolibarr`  ·  `dolibarr_products_list`  —  Lister les produits
- `repos/dolibarr`  ·  `dolibarr_proposal_get`  —  Récupérer un devis
- `repos/dolibarr`  ·  `dolibarr_proposals_list`  —  Lister les devis
- `repos/dolibarr`  ·  `dolibarr_order_get`  —  Récupérer une commande
- `repos/dolibarr`  ·  `dolibarr_orders_list`  —  Lister les commandes
- `repos/dolibarr`  ·  `dolibarr_invoice_get`  —  Récupérer une facture
- `repos/dolibarr`  ·  `dolibarr_invoices_list`  —  Lister les factures
- `repos/dolibarr`  ·  `dolibarr_project_get`  —  Récupérer un projet
- `repos/dolibarr`  ·  `dolibarr_projects_list`  —  Lister les projets
- `repos/dolibarr`  ·  `dolibarr_tasks_list`  —  Lister les tâches
- `repos/dolibarr`  ·  `dolibarr_warehouse_get`  —  Récupérer un entrepôt
- `repos/dolibarr`  ·  `dolibarr_warehouses_list`  —  Lister les entrepôts
- `repos/dolibarr`  ·  `dolibarr_category_get`  —  Récupérer une catégorie
- `repos/dolibarr`  ·  `dolibarr_categories_list`  —  Lister les catégories
- `repos/dolibarr`  ·  `dolibarr_user_get`  —  Récupérer un utilisateur
- `repos/dolibarr`  ·  `dolibarr_users_list`  —  Lister les utilisateurs
- `repos/dolibarr`  ·  `dolibarr_ticket_get`  —  Récupérer un ticket
- `repos/dolibarr`  ·  `dolibarr_tickets_list`  —  Lister les tickets
- `repos/dolibarr`  ·  `dolibarr_bankaccount_get`  —  Récupérer un compte bancaire
- `repos/dolibarr`  ·  `dolibarr_bankaccounts_list`  —  Lister les comptes bancaires
- `repos/dropbox`  ·  `dbx_get_metadata`  —  Récupérer les métadonnées
- `repos/dropbox`  ·  `dbx_get_thumbnail`  —  Récupérer une miniature
- `repos/dropbox`  ·  `dbx_get_account`  —  Récupérer le compte
- `repos/facebook`  ·  `facebook_get_page`  —  Récupérer une page
- `repos/facebook`  ·  `facebook_list_feed`  —  Lister le fil d'actualité
- `repos/facebook`  ·  `facebook_list_photos`  —  Lister les photos
- `repos/facebook`  ·  `facebook_list_leads`  —  Lister les leads
- `repos/facebook`  ·  `facebook_page_insights`  —  Récupérer les insights
- `repos/facebook`  ·  `facebook_list_audiences`  —  Lister les audiences
- `repos/freshdesk`  ·  `fd_ticket_get`  —  Récupérer un ticket
- `repos/freshdesk`  ·  `fd_tickets_list`  —  Lister les tickets
- `repos/freshdesk`  ·  `fd_ticket_search`  —  Rechercher des tickets
- `repos/freshdesk`  ·  `fd_contact_get`  —  Récupérer un contact
- `repos/freshdesk`  ·  `fd_contacts_list`  —  Lister les contacts
- `repos/freshdesk`  ·  `fd_company_get`  —  Récupérer une entreprise
- `repos/freshdesk`  ·  `fd_companies_list`  —  Lister les entreprises
- `repos/freshdesk`  ·  `fd_agent_get`  —  Récupérer un agent
- `repos/freshdesk`  ·  `fd_agents_list`  —  Lister les agents
- `repos/freshdesk`  ·  `fd_group_get`  —  Récupérer un groupe
- `repos/freshdesk`  ·  `fd_groups_list`  —  Lister les groupes
- `repos/freshdesk`  ·  `fd_notes_list`  —  Lister les notes
- `repos/freshdesk`  ·  `fd_time_entries_list`  —  Lister les entrées de temps
- `repos/freshdesk`  ·  `fd_satisfaction_list`  —  Lister les notes de satisfaction
- `repos/github`  ·  `github_repo_get`  —  Récupérer un dépôt
- `repos/github`  ·  `github_repos_list`  —  Lister les dépôts
- `repos/github`  ·  `github_repo_forks_list`  —  Lister les forks
- `repos/github`  ·  `github_issues_list`  —  Lister les issues
- `repos/github`  ·  `github_pr_get`  —  Récupérer une pull request
- `repos/github`  ·  `github_prs_list`  —  Lister les pull requests
- `repos/github`  ·  `github_branches_list`  —  Lister les branches
- `repos/github`  ·  `github_branch_get`  —  Récupérer une branche
- `repos/github`  ·  `github_commits_list`  —  Lister les commits
- `repos/github`  ·  `github_commit_get`  —  Récupérer un commit
- `repos/github`  ·  `github_releases_list`  —  Lister les releases
- `repos/github`  ·  `github_release_get`  —  Récupérer une release
- `repos/github`  ·  `github_user_get`  —  Récupérer un utilisateur
- `repos/github`  ·  `github_user_repos_list`  —  Lister les dépôts d'un utilisateur
- `repos/github`  ·  `github_workflows_list`  —  Lister les workflows
- `repos/github`  ·  `github_labels_list`  —  Lister les labels
- `repos/gitlab`  ·  `gitlab_project_get`  —  Obtenir un projet
- `repos/gitlab`  ·  `gitlab_projects_list`  —  Lister les projets
- `repos/gitlab`  ·  `gitlab_issues_list`  —  Lister les issues
- `repos/gitlab`  ·  `gitlab_mr_get`  —  Obtenir une merge request
- `repos/gitlab`  ·  `gitlab_mrs_list`  —  Lister les merge requests
- `repos/gitlab`  ·  `gitlab_pipelines_list`  —  Lister les pipelines
- `repos/gitlab`  ·  `gitlab_pipeline_get`  —  Obtenir un pipeline
- `repos/gitlab`  ·  `gitlab_branches_list`  —  Lister les branches
- `repos/gitlab`  ·  `gitlab_commits_list`  —  Lister les commits
- `repos/gitlab`  ·  `gitlab_commit_get`  —  Obtenir un commit
- `repos/gitlab`  ·  `gitlab_releases_list`  —  Lister les releases
- `repos/gitlab`  ·  `gitlab_user_get`  —  Obtenir un utilisateur
- `repos/gitlab`  ·  `gitlab_users_list`  —  Lister les utilisateurs
- `repos/gitlab`  ·  `gitlab_groups_list`  —  Lister les groupes
- `repos/gitlab`  ·  `gitlab_group_get`  —  Obtenir un groupe
- `repos/google-drive`  ·  `gdrive_list_files`  —  Lister les fichiers
- `repos/google-drive`  ·  `gdrive_get_file`  —  Obtenir un fichier
- `repos/google-drive`  ·  `gdrive_download_file`  —  Télécharger un fichier
- `repos/google-drive`  ·  `gdrive_search`  —  Rechercher des fichiers
- `repos/google-drive`  ·  `gdocs_get_doc`  —  Obtenir un document
- `repos/google-drive`  ·  `gdocs_get_content`  —  Lire le contenu
- `repos/google-drive`  ·  `gdocs_export_pdf`  —  Exporter en PDF
- `repos/google-drive`  ·  `gsheets_get_spreadsheet`  —  Obtenir un spreadsheet
- `repos/google-drive`  ·  `gsheets_get_values`  —  Lire des valeurs
- `repos/google-drive`  ·  `gsheets_get_sheet_list`  —  Lister les feuilles
- ... +442 more

## Items defaulted to `write` (importer fallback)

Any function without an explicit `risk` in its manifest is stored as `write` in
the `NodeTemplate` document. After this annotation pass, all functions in the
repository have explicit risk values, so the fallback should not trigger for
first-party plugins. It still applies to newly imported third-party plugins.

## Recommended next steps

1. Merge the annotation pass and run `node scripts/annotate-plugin-risks.js --dry-run`
   on every new PR that touches a plugin manifest to catch missing annotations.
2. Add a linter rule (or unit test) that fails the build when a new `nodeTemplates[]`
   entry lacks a `risk` field.
3. Surface `risk` + `riskReason` in the node inspector (frontend) so creators see
   the classification at authoring time.
4. Wire `risk` into `runs.js` pre-exec checks to prompt user confirmation according
   to the thread `autonomyLevel`.
5. Revisit the ambiguous list above and either confirm `safe` or upgrade to `write`.
