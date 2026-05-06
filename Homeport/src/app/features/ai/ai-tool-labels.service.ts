import { Injectable } from '@angular/core';

/** Mapping centralisé tool name → label humain, partagé entre chat / canvas. */
@Injectable({ providedIn: 'root' })
export class AiToolLabelsService {
  private static readonly LABELS: Record<string, string> = {
    // Web
    web_search: 'Recherche web',
    web_fetch: 'Lecture page web',
    web_download: 'Téléchargement',
    research_deep: 'Recherche approfondie',

    // Project files
    project_list_dir: 'Liste dossier',
    project_tree: 'Arborescence projet',
    project_read_file: 'Lecture fichier',
    project_read_batch: 'Lecture multiple',
    project_grep: 'Recherche texte',
    project_search: 'Recherche fichiers',
    project_write_file: 'Écriture fichier',
    project_create_folder: 'Création dossier',
    project_delete: 'Suppression',
    project_move: 'Déplacement',
    project_refresh_tree: 'Actualisation arbo',
    project_stage_for_sandbox: 'Préparation fichier sandbox',
    project_sync_remote: 'Synchronisation',

    // Code / sandboxes
    execute_code: 'Exécution code',
    prepare_code_environment: 'Préparation environnement',
    install_package: 'Installation package',

    // Documents / diagrams / UI widgets
    generate_document: 'Génération document',
    edit_document: 'Édition document',
    render_html_preview: 'Aperçu HTML',
    build_website: 'Site web',
    render_structured: 'Affichage structuré',
    render_interactive_canvas: 'Canvas interactif',
    propose_plan: 'Plan d\'action',
    generate_diagram: 'Diagramme',
    display_image: 'Image',
    display_file: 'Fichier',
    todo_write: 'Checklist',
    send_message_to_agent: 'Message agent',
    enrich_context: 'Contexte',

    // Meta / orchestration
    ask_user: 'Question',
    spawn_subagent: 'Sous-agent',
    compact_and_transfer: 'Transfert',
    activate_capsule: 'Activation outils',

    // Manual
    search_manual: 'Manuel',
    get_manual_section: 'Section manuel',

    // Memory
    save_memory: 'Mémoire',
    get_memory: 'Mémoire',
    save_project_memory: 'Mémoire projet',
    get_project_memory: 'Mémoire projet',
    get_project_knowledge: 'Mémoire projet',
    set_project_knowledge: 'Mémoire projet',
    suggest_memory_entries: 'Suggestion mémoire projet',

    // Tools meta
    search_tools: 'Recherche outils',
    get_tool_details: 'Détails outil',
    execute_tool: 'Exécution outil',

    // Navigation / credentials
    open_element: 'Ouverture',
    open_credentials: 'Identifiants',
    list_credentials: 'Identifiants',

    // Skills
    skill_list: 'Liste skills',
    skill_get: 'Détails skill',
    skill_execute: 'Exécution skill',
  };

  label(name: string | undefined | null): string {
    if (!name) return '';
    return AiToolLabelsService.LABELS[name] || name;
  }
}
