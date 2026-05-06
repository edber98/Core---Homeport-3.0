#!/usr/bin/env node
/**
 * apply-plugin-risk-overrides.js
 *
 * Applies curated manual overrides for risk classifications on critical
 * plugins (nextcloud, google_drive, dropbox, onedrive-sharepoint, odoo,
 * quickbooks, slack, stripe, gmail/email, github, jira, trello, asana,
 * hubspot, sql-database, supabase, http, aws, ...).
 *
 * These overrides were reviewed manually after running annotate-plugin-risks.js.
 * Each override adds `risk` + `riskReason` to the matching nodeTemplate by key.
 *
 * Usage: node scripts/apply-plugin-risk-overrides.js [--dry-run]
 *   Default is apply.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', 'src', 'plugins');
const DRY_RUN = process.argv.includes('--dry-run');

// key -> { risk, riskReason }
const OVERRIDES = {
  // ---------------------- local/logic ----------------------
  // condition & core_barrier / core_race / delay have no side effects
  'delay':           { risk: 'safe',  riskReason: 'Attente passive, pas d\'effet de bord' },
  'condition':       { risk: 'safe',  riskReason: 'Évaluation de condition, pas d\'effet de bord' },
  'core_barrier':    { risk: 'safe',  riskReason: 'Synchronisation, pas d\'effet de bord' },
  'core_race':       { risk: 'safe',  riskReason: 'Synchronisation, pas d\'effet de bord' },

  // ---------------------- http ----------------------
  'http':            { risk: 'elevated', riskReason: 'Appel HTTP arbitraire (URL/méthode libre)' },

  // ---------------------- slack ----------------------
  'slack_post_message':      { risk: 'write',       riskReason: 'Envoi d\'un message visible par le canal' },
  'slack_post_ephemeral':    { risk: 'write',       riskReason: 'Envoi d\'un message éphémère' },
  'slack_reply_message':     { risk: 'write',       riskReason: 'Réponse publiée en thread' },
  'slack_update_message':    { risk: 'write',       riskReason: 'Modifie un message existant' },
  'slack_delete_message':    { risk: 'destructive', riskReason: 'Supprime un message (pas de rollback)' },
  'slack_delete_file':       { risk: 'destructive', riskReason: 'Supprime un fichier' },
  'slack_delete_reminder':   { risk: 'destructive', riskReason: 'Supprime un rappel' },
  'slack_archive_channel':   { risk: 'destructive', riskReason: 'Archive un canal (difficilement réversible)' },
  'slack_remove_reaction':   { risk: 'destructive', riskReason: 'Retire une réaction' },
  'slack_schedule_message':  { risk: 'write',       riskReason: 'Planifie un envoi de message' },

  // ---------------------- email (plugin unifié gmail/outlook/smtp) ----------------------
  'email_send':               { risk: 'write',       riskReason: 'Envoi d\'un email (action externe visible)' },
  'email_read':               { risk: 'safe',        riskReason: 'Lecture d\'emails' },
  'email_add_label':          { risk: 'write',       riskReason: 'Ajoute un label (réversible)' },
  'email_remove_label':       { risk: 'write',       riskReason: 'Retire un label (réversible)' },
  'email_list_labels':        { risk: 'safe',        riskReason: 'Liste les labels (lecture)' },

  // ---------------------- github ----------------------
  'github_repo_delete':       { risk: 'destructive', riskReason: 'Supprime un dépôt complet' },
  'github_pr_merge':          { risk: 'destructive', riskReason: 'Fusion PR, altère l\'historique' },
  'github_pr_close':          { risk: 'destructive', riskReason: 'Ferme la PR sans merge' },
  'github_issue_close':       { risk: 'write',       riskReason: 'Ferme une issue (réouvrable)' },
  'github_repo_fork':         { risk: 'write',       riskReason: 'Crée un fork' },
  'github_pr_create':         { risk: 'write',       riskReason: 'Crée une pull request' },
  'github_branch_delete':     { risk: 'destructive', riskReason: 'Supprime une branche' },
  'github_release_delete':    { risk: 'destructive', riskReason: 'Supprime une release' },

  // ---------------------- gitlab ----------------------
  'gitlab_mr_merge':          { risk: 'destructive', riskReason: 'Merge une MR' },
  'gitlab_mr_close':          { risk: 'destructive', riskReason: 'Ferme une MR' },
  'gitlab_pipeline_retry':    { risk: 'elevated',    riskReason: 'Relance un pipeline (budget CI)' },
  'gitlab_pipeline_cancel':   { risk: 'destructive', riskReason: 'Annule un pipeline en cours' },

  // ---------------------- odoo (compta / commandes) ----------------------
  'odoo_invoice_create':      { risk: 'destructive', riskReason: 'Crée une facture (document comptable engageant)' },
  'odoo_invoice_validate':    { risk: 'destructive', riskReason: 'Valide une facture (verrouille la compta)' },
  'odoo_invoice_post':        { risk: 'destructive', riskReason: 'Comptabilise la facture' },
  'odoo_invoice_cancel':      { risk: 'destructive', riskReason: 'Annule une facture validée' },
  'odoo_purchase_order_confirm':{ risk: 'destructive', riskReason: 'Confirme une commande d\'achat (engagement)' },
  'odoo_sale_order_confirm':  { risk: 'destructive', riskReason: 'Confirme une commande de vente (engagement)' },
  'odoo_payment_register':    { risk: 'destructive', riskReason: 'Enregistre un paiement (mouvement bancaire)' },
  'odoo_ticket_close':        { risk: 'write',       riskReason: 'Ferme un ticket (réouvrable)' },

  // ---------------------- quickbooks ----------------------
  'qb_invoice_create':        { risk: 'destructive', riskReason: 'Crée une facture comptable' },
  'qb_invoice_send':          { risk: 'destructive', riskReason: 'Envoie une facture au client' },
  'qb_invoice_void':          { risk: 'destructive', riskReason: 'Annule une facture' },
  'qb_bill_create':           { risk: 'destructive', riskReason: 'Crée une facture fournisseur' },
  'qb_payment_create':        { risk: 'destructive', riskReason: 'Enregistre un paiement' },
  'qb_report_profit_loss':    { risk: 'safe',        riskReason: 'Rapport lecture seule' },
  'qb_report_balance_sheet':  { risk: 'safe',        riskReason: 'Rapport lecture seule' },

  // ---------------------- pennylane ----------------------
  'pl_invoice_finalize':      { risk: 'destructive', riskReason: 'Finalise une facture (verrouillage comptable)' },
  'pl_invoice_create':        { risk: 'write',       riskReason: 'Crée un brouillon de facture' },

  // ---------------------- stripe ----------------------
  'stripe_charge_create':     { risk: 'destructive', riskReason: 'Débit réel sur la carte' },
  'stripe_payment_intent_create':{ risk: 'destructive', riskReason: 'Crée un débit sur la carte' },
  'stripe_payment_intent_capture':{ risk: 'destructive', riskReason: 'Capture un paiement autorisé' },
  'stripe_refund_create':     { risk: 'destructive', riskReason: 'Remboursement (mouvement financier)' },
  'stripe_subscription_cancel':{ risk: 'destructive', riskReason: 'Annule un abonnement payant' },
  'stripe_customer_delete':   { risk: 'destructive', riskReason: 'Supprime un client Stripe' },

  // ---------------------- jira ----------------------
  'jira_issue_delete':        { risk: 'destructive', riskReason: 'Supprime un ticket' },
  'jira_issue_transition':    { risk: 'write',       riskReason: 'Change le statut d\'un ticket' },

  // ---------------------- trello ----------------------
  'trello_card_delete':       { risk: 'destructive', riskReason: 'Supprime une carte' },
  'trello_board_delete':      { risk: 'destructive', riskReason: 'Supprime un tableau' },
  'trello_list_archive':      { risk: 'destructive', riskReason: 'Archive une liste' },

  // ---------------------- asana ----------------------
  'asana_task_delete':        { risk: 'destructive', riskReason: 'Supprime une tâche' },
  'asana_project_delete':     { risk: 'destructive', riskReason: 'Supprime un projet entier' },

  // ---------------------- hubspot ----------------------
  'hubspot_contact_delete':   { risk: 'destructive', riskReason: 'Supprime un contact CRM' },
  'hubspot_company_delete':   { risk: 'destructive', riskReason: 'Supprime une société CRM' },
  'hubspot_deal_delete':      { risk: 'destructive', riskReason: 'Supprime un deal CRM' },

  // ---------------------- dropbox ----------------------
  'dbx_delete_file':          { risk: 'destructive', riskReason: 'Supprime un fichier Dropbox' },
  'dbx_delete_folder':        { risk: 'destructive', riskReason: 'Supprime un dossier et son contenu' },
  'dbx_permanently_delete':   { risk: 'destructive', riskReason: 'Suppression définitive (pas de rollback)' },

  // ---------------------- google_drive ----------------------
  'gdrive_delete_file':       { risk: 'destructive', riskReason: 'Supprime un fichier Google Drive' },
  'gsheets_delete_sheet':     { risk: 'destructive', riskReason: 'Supprime un onglet Google Sheets' },
  'gcal_delete_calendar':     { risk: 'destructive', riskReason: 'Supprime un calendrier Google' },
  'gcal_delete_event':        { risk: 'destructive', riskReason: 'Supprime un événement du calendrier' },

  // ---------------------- nextcloud ----------------------
  'nc_file_delete':           { risk: 'destructive', riskReason: 'Supprime un fichier Nextcloud' },
  'nc_folder_delete':         { risk: 'destructive', riskReason: 'Supprime un dossier complet' },
  'nc_talk_room_delete':      { risk: 'destructive', riskReason: 'Supprime une conversation' },
  'nc_talk_room_rename':      { risk: 'write',       riskReason: 'Renomme une conversation' },

  // ---------------------- onedrive-sharepoint ----------------------
  'onedrive_upload':          { risk: 'write',       riskReason: 'Upload d\'un fichier' },
  'onedrive_delete':          { risk: 'destructive', riskReason: 'Supprime un fichier' },
  'sharepoint_upload':        { risk: 'write',       riskReason: 'Upload sur SharePoint' },

  // ---------------------- sql-database ----------------------
  'sql_select':               { risk: 'safe',        riskReason: 'Requête SELECT lecture seule' },
  'sql_insert':               { risk: 'write',       riskReason: 'Insertion de lignes' },
  'sql_update':               { risk: 'write',       riskReason: 'Modifie des lignes (réversible si transaction)' },
  'sql_delete':               { risk: 'destructive', riskReason: 'Supprime des lignes' },
  'sql_call_procedure':       { risk: 'elevated',    riskReason: 'Exécute une procédure stockée arbitraire' },
  'sql_execute':              { risk: 'elevated',    riskReason: 'Exécute du SQL arbitraire' },
  'sql_raw':                  { risk: 'elevated',    riskReason: 'Exécute du SQL brut arbitraire' },

  // ---------------------- supabase ----------------------
  'supabase_sql':             { risk: 'elevated',    riskReason: 'SQL arbitraire' },

  // ---------------------- salesforce ----------------------
  'salesforce_soql_query':    { risk: 'safe',        riskReason: 'Requête SOQL lecture seule' },

  // ---------------------- notion ----------------------
  'notion_database_query':    { risk: 'safe',        riskReason: 'Requête lecture seule' },
  'notion_page_restore':      { risk: 'write',       riskReason: 'Restaure une page archivée' },

  // ---------------------- shopify ----------------------
  'shopify_order_close':      { risk: 'write',       riskReason: 'Ferme une commande (rouvrable)' },
  'shopify_inventory_adjust': { risk: 'write',       riskReason: 'Ajuste l\'inventaire' },
  'shopify_inventory_set':    { risk: 'write',       riskReason: 'Définit la valeur d\'inventaire' },

  // ---------------------- sap ----------------------
  'sap_production_order_confirm': { risk: 'destructive', riskReason: 'Confirme un ordre de fabrication (engageant)' },

  // ---------------------- dolibarr ----------------------
  'dolibarr_ticket_close':    { risk: 'write',       riskReason: 'Ferme un ticket (réouvrable)' },
  'dolibarr_invoice_validate':{ risk: 'destructive', riskReason: 'Valide une facture (verrouille la compta)' },

  // ---------------------- atera ----------------------
  'atera_alert_close':        { risk: 'write',       riskReason: 'Ferme une alerte (rouvrable)' },

  // ---------------------- intercom ----------------------
  'intercom_conversation_close':{ risk: 'write',     riskReason: 'Ferme une conversation (réouvrable)' },
  'intercom_conversation_open': { risk: 'write',     riskReason: 'Réouvre une conversation' },
  'intercom_conversation_tag':  { risk: 'write',     riskReason: 'Ajoute un tag' },

  // ---------------------- calendars ----------------------
  'gcal_rsvp_event':          { risk: 'write',       riskReason: 'Répond à une invitation' },
  'outlook_rsvp_event':       { risk: 'write',       riskReason: 'Répond à une invitation' },

  // ---------------------- LLM safe-ish calls (pay per token) ----------------------
  'anthropic_classify':       { risk: 'safe',        riskReason: 'Appel LLM lecture (coût tokens)' },
  'anthropic_extract':        { risk: 'safe',        riskReason: 'Appel LLM lecture (coût tokens)' },
  'google_ai_classify':       { risk: 'safe',        riskReason: 'Appel LLM lecture (coût tokens)' },
  'google_ai_extract':        { risk: 'safe',        riskReason: 'Appel LLM lecture (coût tokens)' },
  'google_ai_vision':         { risk: 'safe',        riskReason: 'Appel LLM lecture (coût tokens)' },
  'mistral_classify':         { risk: 'safe',        riskReason: 'Appel LLM lecture (coût tokens)' },
  'mistral_extract':          { risk: 'safe',        riskReason: 'Appel LLM lecture (coût tokens)' },
  'mistral_vision':           { risk: 'safe',        riskReason: 'Appel LLM lecture (coût tokens)' },
  'openai_classify':          { risk: 'safe',        riskReason: 'Appel LLM lecture (coût tokens)' },
  'openai_extract':           { risk: 'safe',        riskReason: 'Appel LLM lecture (coût tokens)' },
  'openai_vision':            { risk: 'safe',        riskReason: 'Appel LLM lecture (coût tokens)' },
  'openai_agent':             { risk: 'elevated',    riskReason: 'Agent LLM pouvant appeler des outils' },

  // ---------------------- aws ----------------------
  'aws_s3_head_object':       { risk: 'safe',        riskReason: 'Métadonnées lecture seule' },
};

function walkManifests(){
  const out = [];
  for (const base of ['local', 'repos']){
    const dir = path.join(ROOT, base);
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)){
      const p = path.join(dir, name, 'manifest.json');
      if (fs.existsSync(p)) out.push(p);
    }
  }
  return out;
}

function main(){
  const manifests = walkManifests();
  const applied = [];
  const notFound = new Set(Object.keys(OVERRIDES));

  for (const mp of manifests){
    const raw = fs.readFileSync(mp, 'utf8');
    let json;
    try { json = JSON.parse(raw); } catch (e){ console.error(`[skip] ${mp}: ${e.message}`); continue; }
    const fns = Array.isArray(json.nodeTemplates) ? json.nodeTemplates : [];
    let mutated = false;
    for (const fn of fns){
      const ov = OVERRIDES[fn.key];
      if (!ov) continue;
      notFound.delete(fn.key);
      const before = { risk: fn.risk, riskReason: fn.riskReason };
      if (fn.risk !== ov.risk || fn.riskReason !== ov.riskReason){
        fn.risk = ov.risk;
        fn.riskReason = ov.riskReason;
        mutated = true;
        applied.push({ manifest: path.relative(ROOT, mp), key: fn.key, before, after: ov });
      }
    }
    if (mutated && !DRY_RUN){
      fs.writeFileSync(mp, JSON.stringify(json, null, 2) + '\n', 'utf8');
    }
  }

  console.log(`=== apply-plugin-risk-overrides ===`);
  console.log(`Mode              : ${DRY_RUN ? 'DRY-RUN' : 'APPLY'}`);
  console.log(`Overrides defined : ${Object.keys(OVERRIDES).length}`);
  console.log(`Overrides applied : ${applied.length}`);
  console.log(`Not found in any manifest: ${notFound.size}`);
  if (notFound.size) for (const k of notFound) console.log(`  ? ${k}`);
  for (const a of applied.slice(0, 80)) console.log(`  + ${a.manifest}  ${a.key}  ${a.before.risk || '-'} -> ${a.after.risk}`);
  if (applied.length > 80) console.log(`  ... +${applied.length - 80} more`);
}

main();
