// Meta-tools — Tier 1 tools always available to the AI agent
const { toolIndex } = require('./tool-index');
const { executeTool } = require('./tool-executor');
const {
  SKILL_META_TOOL_DEFINITIONS,
  SKILL_META_TOOL_NAMES,
  executeSkillMetaTool,
} = require('./skill-meta-tools');
const { argsToJsonSchema, extractOutputSchema } = require('./tool-converter');
const NodeTemplate = require('../../db/models/node-template.model');
const Credential = require('../../db/models/credential.model');
const Provider = require('../../db/models/provider.model');
const Flow = require('../../db/models/flow.model');
const AiUserContext = require('../../db/models/ai-user-context.model');
const AiThread = require('../../db/models/ai-thread.model');
const AiMessage = require('../../db/models/ai-message.model');

/**
 * Notifie le stream live du thread qu'un nouveau message inline vient d'être
 * créé par un tool (render_structured / display_image / display_file /
 * render_interactive_canvas / generate_diagram / etc.). Le frontend réagit
 * via `ai.message.created` → reloadThreadMessages → le widget apparaît live.
 * Sans ça, l'utilisateur doit refresh pour voir le tableau/image/pdf.
 */
// Notify le frontend qu'un AiMessage vient d'être créé/mis à jour.
// Inclut le messageId pour que emitThreadEvent puisse auto-hydrater le payload
// (le message complet est attaché à l'event → le frontend l'applique direct
// sans refetch). Cf. job-events.js _hydrateMessageEvent.
function _notifyInlineMessage(threadId, kind, messageId) {
  if (!threadId) return;
  try {
    const { emitThreadEvent } = require('../jobs/job-events');
    console.log(`[meta-tools] emit ai.message.created kind=${kind} messageId=${messageId} threadId=${threadId}`);
    emitThreadEvent(String(threadId), {
      type: 'ai.message.created',
      kind: kind || 'inline',
      messageId: messageId ? String(messageId) : undefined,
    });
  } catch (e) {
    console.warn('[meta-tools] notifyInlineMessage failed:', e?.message);
  }
}

function _notifyInlineUpdate(threadId, messageId, kind) {
  if (!threadId) return;
  try {
    const { emitThreadEvent } = require('../jobs/job-events');
    console.log(`[meta-tools] emit ai.message.updated kind=${kind} messageId=${messageId} threadId=${threadId}`);
    emitThreadEvent(String(threadId), {
      type: 'ai.message.updated',
      messageId: String(messageId || ''),
      kind: kind || 'inline',
    });
  } catch (e) {
    console.warn('[meta-tools] notifyInlineUpdate failed:', e?.message);
  }
}

/**
 * Cherche un AiMessage existant dans le thread portant le widgetId demandé
 * dans ses metadata. Utilisé par les tools qui acceptent `widgetId` pour
 * UPDATE plutôt que CREATE → pattern widget éditable (l'utilisateur voit la
 * card se mettre à jour in-place au lieu de voir une nouvelle card apparaître
 * à chaque modification).
 */
const crypto = require('crypto');

async function _findWidgetByWidgetId(threadId, widgetId) {
  if (!threadId || !widgetId) return null;
  try {
    return await AiMessage.findOne({
      threadId,
      'metadata.widgetId': String(widgetId),
    }).sort({ createdAt: -1 });
  } catch {
    return null;
  }
}

/**
 * Normalise/valide un widgetId fourni par le LLM ou en génère un aléatoire.
 * - Max 60 chars, alphanum + _-.
 * - Si invalide ou absent → génère `w_<12 hex>` (unique dans la conversation).
 * Garantit que CHAQUE widget a un ID pour le mécanisme inline [[WIDGET:id]].
 */
function _resolveWidgetId(raw) {
  const cleaned = String(raw || '').replace(/[^a-zA-Z0-9_\-.]/g, '').slice(0, 60);
  if (cleaned.length >= 3) return cleaned;
  return `w_${crypto.randomBytes(6).toString('hex')}`;
}
const AiProjectMemory = require('../../db/models/ai-project-memory.model');
const AiProjectKnowledge = require('../../db/models/ai-project-knowledge.model');
const Run = require('../../db/models/run.model');
const { Types } = require('mongoose');

// Builder tool names — these are NOT NodeTemplates, they are direct tool calls
// from capsules (workflow, form, node_args). If the LLM tries to search/detail them,
// we return a correction instead of "not found".
const BUILDER_TOOL_NAMES = new Set([
  // workflow capsule
  'create_flow', 'list_graph', 'get_templates', 'get_template_details',
  'ensure_start', 'add_node', 'remove_node', 'replace_node',
  'connect_nodes', 'connect_by_output_name', 'disconnect_nodes',
  'get_output_options', 'get_node_schema', 'get_output_schema',
  'set_node_args', 'set_node_description', 'set_node_credential', 'propose_context_mapping',
  'validate_flow', 'auto_layout', 'save_flow', 'create_start_form',
  'build_schema', 'deploy_flow', 'undeploy_flow', 'get_deployment_status',
  'start_run', 'list_runs', 'get_run_stats',
  // form capsule
  'create_form', 'get_form', 'add_field', 'add_section', 'remove_field',
  'update_field', 'reorder_fields', 'set_form_settings', 'save_form',
  'preview_form', 'list_forms', 'delete_form',
  // node_args capsule
  'get_node_schema', 'get_predecessors', 'get_predecessor_output',
  'propose_args_mapping', 'set_args', 'get_current_args',
  'simulate_scenarios', 'validate_args', 'get_credentials_status',
]);

// Tool definitions in JSON Schema format for LLMs
const META_TOOL_DEFINITIONS = [
  {
    name: 'search_tools',
    description: 'Recherche dans les actions/outils disponibles par nom, provider ou catégorie. Détecte automatiquement le provider dans la query (ex: "openai chat" → provider=openai + query="chat"). Si query vide + provider → liste TOUTES les actions du provider.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Texte de recherche (nom, description, mot-clé). Peut contenir le nom du provider.' },
        provider: { type: 'string', description: 'Filtrer par provider (clé, nom ou alias). Résolu dynamiquement depuis la DB.' },
        category: { type: 'string', description: 'Filtrer par catégorie' },
        type: { type: 'string', enum: ['function', 'event', 'start', 'start_form', 'condition', 'loop', 'agent', 'memory', 'tool_ai'], description: 'Filtrer par type de node' },
        limit: { type: 'number', description: 'Nombre max de résultats (défaut: 15)' },
      },
    },
  },
  {
    name: 'get_tool_details',
    description: 'Retourne le schéma complet d\'un outil : arguments (paramètres), sorties, type. Utilise la clé obtenue via search_tools.',
    parameters: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Clé unique du template (ex: slack_post_message)' },
      },
      required: ['key'],
    },
  },
  {
    name: 'execute_tool',
    description: 'Exécute une action/outil avec les arguments fournis. Nécessite que les credentials du provider soient configurés dans le workspace.',
    parameters: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Clé du template à exécuter' },
        args: { type: 'object', description: 'Arguments de l\'outil (voir get_tool_details pour le schéma)' },
      },
      required: ['key', 'args'],
    },
  },
  {
    name: 'list_providers',
    description: 'Liste les providers/services disponibles avec credentials configurés dans le workspace courant.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'ask_user',
    description: 'Pose une question structurée avec des CHOIX CONCRETS (boutons cliquables). UNIQUEMENT pour des choix précis entre options identifiées (ex: quel provider, quel canal, quelle action). NE PAS utiliser pour des questions ouvertes ou conversationnelles — pose-les directement dans ton message texte. Pour poser PLUSIEURS questions d\'un coup (QCM), utilise le champ `questions`.',
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'La question à poser (mode simple, une seule question)' },
        questionType: { type: 'string', enum: ['single', 'multi', 'text'], description: 'Type: single (un seul choix), multi (plusieurs choix), text (réponse libre)' },
        options: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string' },
              value: { type: 'string' },
              description: { type: 'string' },
            },
            required: ['label', 'value'],
          },
          description: 'Options de choix (pour single/multi)',
        },
        questions: {
          type: 'array',
          description: 'Mode batch : plusieurs questions à poser en même temps. Chaque question a son propre type et options.',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Identifiant unique de la question (ex: q1, q2)' },
              text: { type: 'string', description: 'Texte de la question' },
              questionType: { type: 'string', enum: ['single', 'multi', 'text'], description: 'Type de réponse attendue' },
              options: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    label: { type: 'string' },
                    value: { type: 'string' },
                    description: { type: 'string' },
                  },
                  required: ['label', 'value'],
                },
              },
            },
            required: ['id', 'text', 'questionType'],
          },
        },
      },
    },
  },
  {
    name: 'search_workflows',
    description: 'Recherche des workflows existants par nom ou description dans le workspace courant.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Texte de recherche' },
        limit: { type: 'number', description: 'Nombre max de résultats (défaut: 10)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'run_workflow',
    description: 'Lance l\'exécution d\'un workflow existant avec des inputs optionnels.',
    parameters: {
      type: 'object',
      properties: {
        flowId: { type: 'string', description: 'ID du workflow à exécuter' },
        inputs: { type: 'object', description: 'Données d\'entrée optionnelles (payload)' },
      },
      required: ['flowId'],
    },
  },
  {
    name: 'deploy_flow',
    description: 'Déploie un workflow en production. Le flow doit contenir un nœud event (trigger). Active l\'écoute des événements.',
    parameters: {
      type: 'object',
      properties: {
        flowId: { type: 'string', description: 'ID du workflow à déployer' },
      },
      required: ['flowId'],
    },
  },
  {
    name: 'undeploy_flow',
    description: 'Arrête la production d\'un workflow. Désactive l\'écoute des événements et remet le flow en brouillon.',
    parameters: {
      type: 'object',
      properties: {
        flowId: { type: 'string', description: 'ID du workflow à arrêter' },
      },
      required: ['flowId'],
    },
  },
  {
    name: 'get_deployment_status',
    description: 'Vérifie le statut de déploiement d\'un workflow : actif/inactif, type de trigger, date de déploiement.',
    parameters: {
      type: 'object',
      properties: {
        flowId: { type: 'string', description: 'ID du workflow' },
      },
      required: ['flowId'],
    },
  },
  {
    name: 'list_runs',
    description: 'Liste les exécutions d\'un workflow avec pagination. Retourne statut, durée, dates.',
    parameters: {
      type: 'object',
      properties: {
        flowId: { type: 'string', description: 'ID du workflow' },
        status: { type: 'string', enum: ['queued', 'running', 'success', 'error', 'cancelled', 'timed_out'], description: 'Filtrer par statut' },
        limit: { type: 'number', description: 'Nombre max de résultats (défaut: 20, max: 50)' },
        offset: { type: 'number', description: 'Offset pour la pagination (défaut: 0)' },
      },
      required: ['flowId'],
    },
  },
  {
    name: 'get_run_stats',
    description: 'Statistiques d\'exécution d\'un workflow : total, succès, erreurs, durée moyenne.',
    parameters: {
      type: 'object',
      properties: {
        flowId: { type: 'string', description: 'ID du workflow' },
      },
      required: ['flowId'],
    },
  },
  {
    name: 'save_memory',
    description: 'Sauvegarde une information dans la mémoire GLOBALE de l\'utilisateur, partagée entre toutes les conversations. Utilise pour retenir des préférences ou des habitudes. Pour des infos spécifiques au projet en cours, utilise save_project_memory.',
    parameters: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Clé de la mémoire (ex: preferred_language, project_name)' },
        value: { description: 'Valeur à sauvegarder' },
      },
      required: ['key', 'value'],
    },
  },
  {
    name: 'get_memory',
    description: 'Récupère la mémoire GLOBALE de l\'utilisateur (préférences, informations retenues). Cette mémoire est partagée entre toutes les conversations.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'save_project_memory',
    description: 'Sauvegarde une information dans la mémoire du PROJET courant (workflow ou formulaire). Cette mémoire est partagée entre toutes les conversations liées au même élément. Utilise pour retenir des décisions, paramètres ou contexte spécifique au projet.',
    parameters: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Clé de la mémoire projet (ex: db_schema, api_endpoint, main_entity)' },
        value: { description: 'Valeur à sauvegarder' },
      },
      required: ['key', 'value'],
    },
  },
  {
    name: 'get_project_memory',
    description: 'Récupère la mémoire du PROJET courant (workflow ou formulaire). Retourne toutes les informations sauvegardées pour cet élément.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_project_knowledge',
    description: 'Lit la mémoire structurée du projet actif (clé-valeur typée, remplie manuellement par l\'utilisateur OU par l\'agent). Retourne une entrée spécifique si key fournie, sinon toutes les entrées. La mémoire projet contient des infos durables sur le projet (nom client, budget, contacts, URLs, identifiants internes, deadline). Utilise-la AVANT de demander au user des infos qu\'elle pourrait contenir.',
    parameters: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Clé précise à récupérer (ex: "client.name"). Si absent, retourne toutes les entrées.' },
      },
    },
  },
  {
    name: 'set_project_knowledge',
    description: 'Ajoute ou met à jour une entrée dans la mémoire structurée du projet. USE THIS quand tu apprends une info durable sur le projet (ex: l\'utilisateur mentionne un budget, un contact, une URL, une deadline). Classé write : nécessite confirmation user en mode prudent.',
    parameters: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Clé courte type "client.name" ou "budget.total" (alphanumeric + . _ -, max 100 car.)' },
        value: { description: 'Valeur (string, number, boolean, array, ou objet selon le type)' },
        type: { type: 'string', enum: ['text', 'number', 'date', 'url', 'email', 'file', 'list', 'boolean', 'json'], description: 'Type sémantique de la valeur (défaut: text)' },
        description: { type: 'string', description: 'Contexte court de cette info (max 500 car.)' },
      },
      required: ['key', 'value'],
    },
  },
  {
    name: 'suggest_memory_entries',
    description: "USAGE INTERNE (subagent memory_extractor uniquement). Crée des entries 'pending' dans la mémoire projet, en attente de validation par l'utilisateur. Passer entries=[] si rien à suggérer.",
    parameters: {
      type: 'object',
      properties: {
        entries: {
          type: 'array',
          description: 'Liste des entries candidates (max 3).',
          items: {
            type: 'object',
            properties: {
              key: { type: 'string', description: 'Clé courte format "namespace.sous_cle" (ex: "deadline.projet", "client.contact_principal")' },
              value: { description: 'Valeur (string, number ou boolean)' },
              type: { type: 'string', enum: ['text', 'number', 'date', 'email', 'url', 'list'], description: 'Type sémantique (défaut: text)' },
              description: { type: 'string', description: 'Contexte court expliquant pourquoi c\'est à retenir (max 500 car.)' },
              why: { type: 'string', description: 'Extrait précis de la conversation justifiant cette suggestion (max 500 car.)' },
            },
            required: ['key', 'value'],
          },
        },
      },
      required: ['entries'],
    },
  },
  {
    name: 'compact_and_transfer',
    description: 'Compacte la conversation en un résumé et crée un NOUVEAU thread (pour démarrer un sujet vraiment différent). N\'UTILISE PAS pour changer le contexte d\'un thread existant — utilise plutôt attach_thread_to_flow / attach_thread_to_form qui modifient le thread COURANT sans en créer un nouveau.',
    parameters: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: 'Résumé compacté de la conversation : intentions, décisions prises, informations clés à conserver pour la suite.' },
        newMode: { type: 'string', enum: ['chat', 'workflow', 'form'], description: 'Mode du nouveau thread' },
        newTitle: { type: 'string', description: 'Titre du nouveau thread (ex: "Création workflow envoi mail")' },
        agentId: { type: 'string', description: 'Agent ID optionnel pour le nouveau thread' },
        flowId: { type: 'string', description: 'ID du workflow à lier au nouveau thread (custom flw_xxx ou ObjectId)' },
        formId: { type: 'string', description: 'ID du formulaire à lier au nouveau thread (custom frm_xxx ou ObjectId)' },
      },
      required: ['summary', 'newMode', 'newTitle'],
    },
  },
  {
    name: 'attach_thread_to_flow',
    description: 'Lie le thread COURANT à un workflow et bascule en mode workflow. Le graph du workflow sera automatiquement disponible dans le contexte au prochain tour, et tu pourras l\'éditer directement avec les workflow_* tools. À UTILISER quand l\'utilisateur dit "charge ce workflow", "modifie ce workflow", "ouvre celui-là" depuis une conversation chat libre. Ne crée PAS de nouveau thread — modifie le courant.',
    parameters: {
      type: 'object',
      properties: {
        flowId: { type: 'string', description: 'ID du workflow (custom flw_xxx OU ObjectId Mongo). Utilise list_flows si tu dois retrouver l\'ID depuis un nom.' },
      },
      required: ['flowId'],
    },
  },
  {
    name: 'attach_thread_to_form',
    description: 'Lie le thread COURANT à un formulaire et bascule en mode form. Le schema du form sera disponible au prochain tour pour édition. Ne crée PAS de nouveau thread.',
    parameters: {
      type: 'object',
      properties: {
        formId: { type: 'string', description: 'ID du form (custom frm_xxx OU ObjectId).' },
      },
      required: ['formId'],
    },
  },
  {
    name: 'detach_thread',
    description: 'Détache le thread courant de tout workflow/formulaire et revient en mode chat libre. À utiliser si l\'utilisateur veut "sortir" du contexte workflow pour parler d\'autre chose dans le même thread.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'open_credentials',
    description: 'Ouvre la fenêtre de création/édition de credentials pour un provider spécifique. Utilise cet outil quand l\'utilisateur confirme vouloir connecter un service.',
    parameters: {
      type: 'object',
      properties: {
        providerKey: { type: 'string', description: 'Clé du provider (ex: odoo, slack, google_drive)' },
        providerName: { type: 'string', description: 'Nom lisible du provider (ex: Odoo, Slack)' },
      },
      required: ['providerKey'],
    },
  },
  {
    name: 'list_credentials',
    description: 'Liste les credentials (identifiants) disponibles dans le workspace pour un provider donné. Retourne les noms et IDs. Utilise pour vérifier si des credentials existent avant d\'ajouter un node, ou pour choisir entre plusieurs credentials.',
    parameters: {
      type: 'object',
      properties: {
        providerKey: { type: 'string', description: 'Clé exacte du provider (ex: odoo, slack, google_drive, smtp_imap). IMPORTANT : utilise d\'abord list_providers pour trouver la bonne clé. Si omis, liste tous les credentials du workspace.' },
      },
    },
  },
  {
    name: 'open_element',
    description: 'Ouvre un élément (workflow, formulaire ou website) dans l\'interface. Utilise après avoir créé ou modifié un élément pour que l\'utilisateur puisse le voir directement.',
    parameters: {
      type: 'object',
      properties: {
        elementType: { type: 'string', enum: ['flow', 'form', 'website'], description: 'Type de l\'élément' },
        elementId: { type: 'string', description: 'ID de l\'élément' },
        elementName: { type: 'string', description: 'Nom de l\'élément (pour le message)' },
      },
      required: ['elementType', 'elementId'],
    },
  },
  {
    name: 'enrich_context',
    description: 'Enrichit le contexte (entreprise, workspace ou utilisateur) avec une nouvelle information détectée.',
    parameters: {
      type: 'object',
      properties: {
        level: { type: 'string', enum: ['company', 'workspace', 'user'], description: 'Niveau de contexte à enrichir' },
        field: { type: 'string', description: 'Champ à enrichir (ex: description, industry, services)' },
        value: { description: 'Nouvelle valeur' },
        reason: { type: 'string', description: 'Raison de l\'enrichissement' },
      },
      required: ['level', 'field', 'value'],
    },
  },
  {
    name: 'read_file',
    description: 'Lit le contenu d\'un fichier. Pour les images, retourne l\'image visible. Pour les PDF/texte, retourne le contenu textuel. Utilise un fileId obtenu d\'un résultat de tool ou d\'un attachment utilisateur.',
    parameters: {
      type: 'object',
      properties: {
        fileId: { type: 'string', description: 'ID du fichier (ex: file_xxx)' },
      },
      required: ['fileId'],
    },
  },
  {
    name: 'search_manual',
    description: 'Recherche dans le manuel de référence. Retourne les sections pertinentes avec leur topic ID. Utilise quand tu as besoin de détails sur : types de champs, validateurs, styles, visibleIf, patterns workflow, boucles, conditions, expressions, etc.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Texte de recherche (ex: "visibleIf", "section_array", "loop boucle", "conditions classifier")' },
        namespace: { type: 'string', enum: ['workflow', 'form', 'node_args', 'chat'], description: 'Limiter la recherche à un namespace (optionnel)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_manual_section',
    description: 'Récupère le contenu complet d\'une section du manuel par son topic ID. Utilise après search_manual pour lire les détails.',
    parameters: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: 'Topic ID (retourné par search_manual, ex: "phase_rules", "field_types", "loops")' },
        namespace: { type: 'string', description: 'Namespace du manual (ex: "workflow", "form")' },
      },
      required: ['topic'],
    },
  },
  {
    name: 'todo_write',
    description: `Crée ou met à jour une checklist visible dans le chat pour suivre les étapes d'une tâche multi-étapes. C'EST LA COLONNE VERTÉBRALE de toute tâche complexe — inspiré de la TodoWriteTool de Claude Code.

🎯 QUAND L'UTILISER (obligatoire)
- Tâche à 3+ étapes distinctes.
- Tâche non-triviale nécessitant planification.
- L'utilisateur donne plusieurs demandes en une.
- Quand tu démarres une étape, marque-la in_progress AVANT de commencer.
- Après avoir fini une étape, marque-la completed + écris UN COURT message narratif pour l'utilisateur avant de passer à la suivante.

🚫 QUAND NE PAS L'UTILISER
- Tâche simple en 1-2 étapes triviales.
- Demande purement conversationnelle ou informationnelle.

📋 FORMAT
- Plusieurs items peuvent être in_progress simultanément (ex: sous-agents parallèles).
- content = description claire courte ("Générer le modèle docx")
- activeForm = forme active affichée pendant l'exécution ("Génération du modèle docx…")
- status : pending / in_progress / completed / cancelled

🔁 MISE À JOUR
Appelle ce tool à CHAQUE transition d'état. Le LLM est responsable de maintenir la checklist à jour. Le widget éditable (widgetId="session-todos") met à jour la MÊME card à chaque appel — pas de multiples checklists empilées.

EXEMPLE
\`\`\`
1. todo_write({todos: [
     {id:"t1", content:"Chercher les 3 iPaaS EU", activeForm:"Recherche des iPaaS EU…", status:"in_progress"},
     {id:"t2", content:"Consolider en tableau", activeForm:"Consolidation…", status:"pending"},
     {id:"t3", content:"Générer xlsx + aperçu", activeForm:"Génération xlsx…", status:"pending"},
   ]})
2. [tool research → résultats]
3. "Trouvé 3 plateformes : Frends, n8n, Make. Je consolide."  (narration courte)
4. todo_write({todos: [...t1 completed, t2 in_progress, t3 pending]})
5. [tool render_structured]
6. "Tableau prêt. Je passe au xlsx."
7. todo_write({...t2 completed, t3 in_progress})
8. [execute_code + display_file]
9. todo_write({...t3 completed}) → tous done, la card se collapse toute seule.
\`\`\``,
    parameters: {
      type: 'object',
      properties: {
        todos: {
          type: 'array',
          description: 'Liste complète des items (pas un diff). À chaque appel tu passes TOUTE la liste avec les statuts à jour.',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'ID stable (ex: "t1", "t2")' },
              content: { type: 'string', description: 'Description courte de la tâche' },
              activeForm: { type: 'string', description: 'Forme active ("Analyse en cours…")' },
              status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'cancelled'] },
            },
            required: ['id', 'content', 'status'],
          },
        },
        title: { type: 'string', description: 'Titre optionnel de la checklist (ex: "Étude de marché iPaaS")' },
      },
      required: ['todos'],
    },
  },
  {
    name: 'send_message_to_agent',
    description: `Communication bidirectionnelle façon Claude Code / teammate-mailbox. Le message est empilé dans la mailbox du destinataire et délivré au DÉBUT de son prochain tour LLM. Le sender peut être l'agent principal, un subagent, ou l'utilisateur (via UI).

🎯 DESTINATAIRES POSSIBLES (\`to\`)
- **\`'user'\`** → parle directement à l'utilisateur humain. Le message apparaît IMMÉDIATEMENT dans le chat avec ton badge (ex: "💬 Marie : Peux-tu me confirmer si tu veux les 3 axes ?"). **À UTILISER** quand tu es un subagent qui a besoin d'une info/confirmation pendant que tu bosses, sans attendre la fin.
- **\`'parent'\`** → parle à ton agent parent (si tu es un subagent). Message délivré à son prochain tour. Utile pour lui demander une info ou lui remonter un résultat intermédiaire.
- **\`'Tim'\`, \`'Marie'\`, \`'Denis'\`, ...** → parle à un subagent actif du roster par son prénom. Résolu au subagent le plus récent portant ce nom dans le thread.
- **\`'aij_xxx'\`** → jobId explicite (unique, non ambigu).

🔄 PATTERNS D'USAGE
1. **Subagent demande info à l'user** : \`send_message_to_agent({ to: 'user', message: "J'ai trouvé 10 concurrents, tu veux que je garde les EU only ou large mix ?" })\`
2. **Parent pique un subagent** : \`send_message_to_agent({ to: 'Marie', message: "Ajoute aussi la colonne TVA intra." })\`
3. **Subagent → subagent** : \`send_message_to_agent({ to: 'Tim', message: "Envoie-moi les 3 URLs officielles de tes sources EU" })\`
4. **Subagent remonte au parent** : \`send_message_to_agent({ to: 'parent', message: "J'ai découvert un acteur EU non listé (Alumio), je l'ajoute ?" })\`

⚡ NON-BLOQUANT : le tool retourne immédiatement \`{delivered:true}\`. Continue ta tâche sans attendre de réponse — si le destinataire répond, son message arrivera dans ta propre mailbox au tour suivant.`,
    parameters: {
      type: 'object',
      properties: {
        to: { type: 'string', description: "'user' / 'parent' / prénom du roster (Tim, Ada, Denis, Van, Hypatie, Donald, Alan, René, Claude, Hedy, Graham, Marie, Florence, Isaac, Kurt, Marvin) / jobId" },
        message: { type: 'string', description: 'Texte du message. Sois précis et concis (1-3 phrases).' },
        summary: { type: 'string', description: 'Résumé 5-10 mots affiché dans l\'UI (facultatif)' },
      },
      required: ['to', 'message'],
    },
  },
  {
    name: 'ask_parent_agent',
    description: `Pose une question à ton agent PARENT et attend sa réponse SYNCHRONE (≠ send_message_to_agent qui est fire-and-forget).

📌 USAGE — disponible UNIQUEMENT pour les sous-agents (un parentJobId est requis).

À utiliser quand :
- Tu as besoin d'une info/décision que ton PARENT connaît (pas l'utilisateur directement)
- Tu veux clarifier le scope d'une tâche avant de continuer
- Tu hésites entre 2 approches et veux son avis

🔄 COMPORTEMENT
1. Le LLM parent reçoit ta question avec son propre contexte (system prompt + historique récent)
2. Il y répond en une phrase concise
3. Sa réponse t'est retournée comme tool_result
4. SI le parent ne sait pas → il préfixe sa réponse par "ESCALATE_TO_USER:" et tu sais que tu dois appeler ask_user toi-même

💰 COÛT : ~2-5s + tokens supplémentaires (équivalent à 1 tour LLM du parent). Préfère send_message_to_agent({to:'parent'}) pour de la communication non-bloquante (mailbox).

⚠️ NE PAS l'utiliser pour :
- Demander à l'utilisateur (→ ask_user)
- Donner une info au parent (→ send_message_to_agent({to:'parent'}))
- Questions internes que TU peux résoudre toi-même (→ utilise ton propre raisonnement)`,
    parameters: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'La question/clarification à poser au parent. Sois précis (1-2 phrases).' },
        context: { type: 'string', description: 'Optionnel : ce que tu as déjà essayé, pourquoi tu hésites. Aide le parent à comprendre où tu en es.' },
      },
      required: ['question'],
    },
  },
  {
    name: 'spawn_subagent',
    description: [
      "Lance un sous-agent spécialisé pour une tâche autonome. Types : research (web), file_analyzer (fichiers), doc_writer (livrables markdown), general (polyvalent).",
      "",
      "🛠️ CONFIGURE TOI-MÊME LES OUTILS DU SUBAGENT VIA `toolsAllowed` selon son rôle.",
      "Sans toolsAllowed, le subagent reçoit un set par défaut limité — souvent insuffisant.",
      "Exemples de configurations selon le rôle :",
      "  • Recherche → toolsAllowed: ['web_search','web_fetch','web_download','research_deep']",
      "  • Lecture/analyse projet → ['project_tree','project_read_file','project_read_batch','project_grep','project_stage_for_sandbox','execute_code']",
      "  • Rédaction livrable → ['render_structured','generate_diagram','generate_document','project_write_file']",
      "  • Consolidation pipeline (DERNIER step) → ['render_structured','generate_diagram','generate_document','project_write_file','display_image','render_interactive_canvas']",
      "  • Email/notif (general) → ['execute_tool','search_tools','get_tool_details']",
      "Tu DOIS choisir les outils selon le verbe d'action attendu (cherche / lis / rédige / consolide / envoie / dépose).",
      "",
      "Modes :",
      "- Par défaut (sync) : bloque jusqu'à la fin du sous-agent, retourne son summary.",
      "- async:true : retourne immédiatement {jobId, status}. À utiliser pour pipelines avec depends_on / input_from.",
      "",
      "Orchestration :",
      "- depends_on: string[] — IDs (jobId) à attendre. Si une dépendance échoue, ce sous-agent est abandonné en error.",
      "- input_from: string | string[] | 'all_above' | 'all_siblings' — injecte les summaries des jobs en tête du prompt.",
      "",
      "⚠️ COMMUNICATION ENTRE SUBAGENTS (CRITIQUE)",
      "Les sous-agents s'exécutent dans des contextes ISOLÉS. Un sous-agent NE PEUT PAS",
      "lire les résultats d'un autre s'il n'a pas `depends_on` + `input_from`.",
      "Sans ces deux paramètres, le subagent qui doit 'consolider', 'synthétiser',",
      "'agréger', 'compiler' OU utiliser les résultats des autres → il sera AVEUGLE",
      "et te dira 'je n'ai pas accès aux sorties des subagents'. C'est une ERREUR.",
      "TOUJOURS pour un subagent de consolidation :",
      "  spawn_subagent({",
      "    async:true, subagent_type:'general',",
      "    toolsAllowed:['render_structured', 'project_write_file', 'generate_document'],",
      "    depends_on:[s1.jobId, s2.jobId, s3.jobId],   // ← OBLIGATOIRE",
      "    input_from:'all_above',                      // ← OBLIGATOIRE (ou tableau d'IDs)",
      "    prompt:'Consolide les résultats fournis en CONTEXTE en un livrable …'",
      "  })",
      "Si tu ne mets que `depends_on` sans `input_from`, le système injectera quand même",
      "les summaries automatiquement (fallback de sécurité), mais c'est mieux d'être explicite.",
      "",
      "🛡️ FILET DE SÉCURITÉ AUTO-ATTENTE : si tu spawn un subagent SANS `depends_on`",
      "alors que d'autres subagents frères sont encore actifs (running/queued) à cet",
      "instant, le système détecte l'oubli et le fait attendre automatiquement la fin",
      "de ses frères (avec auto-injection des summaries). Le statut du subagent passe à",
      "`waiting_dependency` avec reason='auto_wait_siblings' — visible dans l'UI.",
      "Mais C'EST MIEUX de passer `depends_on` explicitement : l'UI montre alors la",
      "flèche de dépendance sur le canvas, et tu évites les race conditions subtiles",
      "(si un frère finit JUSTE avant que le consolidator démarre, l'auto-wait ne se",
      "déclenche pas).",
      "",
      "🔓 AUTO-ASYNC QUAND depends_on : si tu passes `depends_on` SANS `async:true`,",
      "le backend force automatiquement async=true. Sinon le parent agent_run bloque",
      "pendant toute la chaîne dep → chat verrouillé plusieurs minutes. Avec async:true",
      "forcé, le parent retourne immédiatement {jobId, status:'waiting_dependency'},",
      "le chat se libère, et _maybeResumeParent reprend quand toute la chaîne finit.",
      "RÈGLE : un subagent avec depends_on = TOUJOURS async. Pas de compromis.",
      "",
      "🚫 INTERDICTION ABSOLUE : un subagent de consolidation NE DOIT JAMAIS",
      "demander à l'user de 'coller les résultats' si son contexte est vide.",
      "Si les inputs sont absents, c'est un bug d'orchestration : tu relances avec",
      "depends_on correct, OU tu déclares error au lieu d'inventer/demander.",
      "",
      "🎯 PATTERN PIPELINE COMPLET (avec DERNIER step qui livre le résultat) :",
      "  // Étape 1-N : lecture / recherche",
      "  s1 = spawn_subagent({async:true, subagent_type:'research', toolsAllowed:['web_search','web_fetch','research_deep'], prompt:'Cherche concurrents'})",
      "  s2 = spawn_subagent({async:true, subagent_type:'research', toolsAllowed:['web_search','web_fetch'], prompt:'Cherche tendances tech'})",
      "  // Étape FINALE : consolidation + livrable. TOUJOURS donner les tools de production !",
      "  s3 = spawn_subagent({",
      "    async:true, subagent_type:'general',",
      "    toolsAllowed:['render_structured','generate_document','project_write_file'],",
      "    depends_on:[s1.jobId, s2.jobId], input_from:'all_above',",
      "    prompt:'Consolide en render_structured comparison_table puis génère xlsx + dépose dans /analyses/X.xlsx'",
      "  })",
      "",
      "⚡ MODE PARALLÈLE EN 1 SEUL APPEL (recommandé pour lancer 2-5 subagents indépendants d'un coup) :",
      "Quand tu dois lancer PLUSIEURS subagents INDÉPENDANTS (pas de dépendance entre eux), utilise le paramètre `parallel` : un SEUL tool call, N subagents démarrent simultanément côté backend.",
      "  spawn_subagent({",
      "    subagent_type:'research',",
      "    prompt:'axe 1 (placeholder, ignoré si parallel fourni)',",
      "    parallel:[",
      "      {subagent_type:'research', prompt:'Cherche concurrents iPaaS 2026', toolsAllowed:['web_search','web_fetch','research_deep']},",
      "      {subagent_type:'research', prompt:'Cherche tendances AI agents/MCP/RAG', toolsAllowed:['web_search','web_fetch','research_deep']},",
      "      {subagent_type:'file_analyzer', prompt:'Récupère logo + charte c4rbon.group', toolsAllowed:['web_fetch','web_download']},",
      "    ]",
      "  })",
      "C'est la forme PRÉFÉRÉE pour lancer N recherches en parallèle. Bénéfices :",
      "- 1 seul tool call → compatible avec tous les LLM (Anthropic ET OpenAI même en mode séquentiel `parallel_tool_calls=false`).",
      "- Les subagents démarrent vraiment en même temps côté backend (Promise.all).",
      "- Pas de risque de placeholder non résolu dans depends_on (pas d'ID à chaîner).",
      "Si tu as besoin d'un consolidateur final APRÈS le parallel, fais-le en 2e appel avec depends_on sur les jobIds retournés.",
      "",
      "💡 AUTO-RESUME PARENT : quand tous les subagents async d'une cascade sont terminés ET qu'aucun subagent final ne livre le résultat (ex: tu n'as pas configuré de step de consolidation), un message système s'inject automatiquement avec les résumés et tu (l'agent principal) reprends pour finir la tâche. Mais c'est plus propre de PRÉVOIR un subagent final avec les bons toolsAllowed.",
    ].join('\n'),
    parameters: {
      type: 'object',
      properties: {
        subagent_type: {
          type: 'string',
          enum: [
            'research', 'file_analyzer', 'doc_writer', 'general',
            'code_runner', 'logician', 'security_auditor', 'vision_analyst',
            'voice_handler', 'data_scientist', 'dataviz', 'automation_architect',
            'math_proof', 'expert_system',
          ],
          description: "Type de subagent (= personnage du roster). Tim=research, Ada=file_analyzer, Donald=doc_writer, Denis=general, Alan=code_runner, René=logician, Claude=security_auditor, Hedy=vision_analyst, Graham=voice_handler, Marie=data_scientist, Florence=dataviz, Isaac=automation_architect, Kurt=math_proof, Marvin=expert_system.",
        },
        prompt: { type: 'string', description: 'Instruction détaillée à donner au sous-agent.' },
        toolsAllowed: {
          type: 'array',
          items: { type: 'string' },
          description: "Liste des tools que le subagent peut appeler. CONFIGURE-LA selon le rôle (cf. description). Sans ça, le subagent a un set par défaut limité.",
        },
        max_loops: { type: 'number', description: 'Itérations max (défaut: 20).' },
        context_slice: { type: 'object', description: 'Contexte additionnel à transmettre.' },
        async: { type: 'boolean', description: 'Si true, fire-and-forget. Indispensable pour pipelines avec depends_on.' },
        depends_on: {
          type: 'array',
          items: { type: 'string' },
          description: "IDs de jobs à attendre. Si l'un échoue, ce subagent est abandonné.",
        },
        input_from: {
          description: "Injecte les summaries des jobs cités dans le prompt. jobId / liste / 'all_above' / 'all_siblings'.",
        },
        parallel: {
          type: 'array',
          description: 'Pour lancer plusieurs sous-agents en parallèle (tous sync).',
          items: {
            type: 'object',
            properties: {
              subagent_type: { type: 'string' },
              prompt: { type: 'string' },
              toolsAllowed: { type: 'array', items: { type: 'string' } },
            },
            required: ['prompt'],
          },
        },
      },
      required: ['subagent_type', 'prompt'],
    },
  },
  {
    name: 'research_deep',
    description: "Recherche approfondie multi-étapes (web + synthèse). Lance un sous-agent de type 'research'.",
    parameters: {
      type: 'object',
      properties: {
        question: { type: 'string' },
        depth: { type: 'number', description: 'Profondeur de recherche (1-3).' },
        scope: { type: 'string', description: 'Domaine ou site à privilégier.' },
      },
      required: ['question'],
    },
  },
  {
    name: 'render_structured',
    description: [
      "Affiche un message structuré interactif dans le chat. RÈGLE ABSOLUE : tu dois TOUJOURS fournir les 3 champs obligatoires : layout, title ET data. JAMAIS sans data.",
      "",
      "data doit contenir le VRAI CONTENU (pas juste un titre). Le tool ÉCHOUE si data est vide ou manquant.",
      "",
      "Quand utiliser :",
      "- Storyboards, variantes produit, options avec contenu riche → chips_tabs",
      "- Plans étape par étape, checklists → stepped_plan",
      "- Comparaisons multi-colonnes → comparison_table",
      "- FAQ, sections pliables → accordion",
      "- Chronologie, évolution → timeline",
      "- Choix multiples avec visuel → card_grid",
      "",
      "Schémas `data` par layout (EXEMPLES COMPLETS à adapter) :",
      "- chips_tabs : {\"chips\":[{\"id\":\"a\",\"label\":\"A\"}],\"tabs\":[{\"chipId\":\"a\",\"content\":{\"blocks\":[{\"type\":\"text\",\"content\":\"...\"}]}}]}",
      "- stepped_plan : {\"steps\":[{\"id\":\"s1\",\"title\":\"Étape 1\",\"description\":\"...\",\"duration\":\"2 min\"}]}",
      "- comparison_table : {\"columns\":[{\"key\":\"a\",\"header\":\"A\"}],\"rows\":[{\"label\":\"Feature\",\"a\":true}]}",
      "- accordion : {\"sections\":[{\"id\":\"q1\",\"title\":\"Q1\",\"content\":\"Réponse\"}]}",
      "- timeline : {\"events\":[{\"date\":\"2026-01-01\",\"title\":\"Evt\",\"description\":\"...\"}]}",
      "- card_grid : {\"cards\":[{\"title\":\"Card 1\",\"description\":\"...\"}]}",
      "",
      "🗂️ EXHAUSTIVITÉ : quand le contenu vient d'un dataset extrait (tableau Excel, liste, série), embarque TOUTES les entrées dans data, jamais un échantillon. 60 lignes = 60 rows dans comparison_table, pas 6.",
    ].join('\n'),
    parameters: {
      type: 'object',
      properties: {
        layout: {
          type: 'string',
          enum: ['chips_tabs', 'stepped_plan', 'comparison_table', 'accordion', 'timeline', 'card_grid'],
          description: 'Type de layout à rendre',
        },
        title: { type: 'string', description: 'Titre optionnel affiché au-dessus du composant structuré' },
        data: {
          type: 'object',
          description: 'Structure dépendant du layout. Voir description du tool pour le schéma précis.',
        },
        widgetId: {
          type: 'string',
          description: "Identifiant stable du widget (ex: 'market-comparison'). OBLIGATOIRE pour le mode INLINE : réutilise le même widgetId dans le marqueur [[WIDGET:<widgetId>]] que tu insères dans ton texte. Si le widgetId existe déjà → MISE À JOUR IN-PLACE.",
        },
        collapsed: {
          type: 'boolean',
          description: 'Si true, le widget apparaît replié (header cliquable) par défaut. Défaut false = ouvert. Utilise true pour les widgets volumineux (gros tableau, long accordéon) afin de garder le flux de lecture fluide.',
        },
        collapseTitle: {
          type: 'string',
          description: 'Titre affiché dans le header du collapse (ex: "📊 Comparatif iPaaS"). Si omis, fallback sur le champ title.',
        },
      },
      required: ['layout', 'data'],
    },
  },
  {
    name: 'propose_plan',
    description: 'Propose un plan d\'action structuré à l\'utilisateur AVANT d\'exécuter une tâche complexe. USE THIS quand tu as besoin de validation sur l\'approche (refonte, migration, analyse coûteuse) ou quand la demande est ambiguë. Le plan est affiché comme carte interactive dans le chat. L\'utilisateur peut Approuver (tout ou partie), Modifier, ou Rejeter. Ta tâche pause jusqu\'à sa réponse (max 10 min).',
    parameters: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: 'Résumé 1-2 phrases du plan global' },
        steps: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'ID court ex: s1, s2' },
              title: { type: 'string' },
              rationale: { type: 'string', description: 'Pourquoi cette étape' },
              tools: { type: 'array', items: { type: 'string' }, description: 'Tools qui seront utilisés' },
              duration_estimate: { type: 'string', description: 'ex: 2 min, 30s' },
              dependsOn: { type: 'array', items: { type: 'string' }, description: 'IDs des étapes prérequis' },
            },
            required: ['id', 'title'],
          },
        },
        risks: { type: 'array', items: { type: 'string' }, description: 'Risques ou incertitudes' },
        missing_info: {
          type: 'array',
          description: "Infos CRITIQUES manquantes qui bloquent l'exécution (destinataire email, chemin exact, seuil, règle métier…). Si non vides, la carte de plan affiche des champs de saisie — l'utilisateur doit les renseigner AVANT de pouvoir approuver. PRIVILÉGIE toujours missing_info plutôt que ask_user pour des infos critiques qui conditionnent un plan.",
          items: {
            type: 'object',
            properties: {
              key: { type: 'string', description: 'Nom court (ex: "email_destinataire", "seuil_min")' },
              question: { type: 'string', description: 'Question à poser à l\'utilisateur' },
              why: { type: 'string', description: 'Pourquoi cette info est critique pour exécuter le plan' },
            },
            required: ['key', 'question'],
          },
        },
      },
      required: ['summary', 'steps'],
    },
  },
  {
    name: 'generate_diagram',
    description: 'Génère un diagramme visuel (flowchart, séquence, mindmap, ER, état, Gantt) via syntaxe Mermaid. Le diagramme est affiché dans le canvas Document + comme preview dans le chat. USE THIS quand tu illustres : un workflow, une architecture, une hiérarchie, un processus, une relation de données.',
    parameters: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['flowchart', 'sequence', 'class', 'state', 'er', 'gantt', 'mindmap', 'journey', 'timeline', 'pie'] },
        title: { type: 'string' },
        mermaid: { type: 'string', description: 'Code source Mermaid valide (ex: flowchart TD\\n  A-->B\\n  B-->C)' },
        direction: { type: 'string', enum: ['TD', 'LR', 'BT', 'RL'], description: 'Pour flowchart' },
        widgetId: {
          type: 'string',
          description: "Identifiant stable du diagramme (ex: 'archi-kinn'). OBLIGATOIRE pour le mode INLINE : réutilise le même widgetId dans [[WIDGET:<widgetId>]] dans ton texte.",
        },
        collapsed: {
          type: 'boolean',
          description: 'Si true, diagramme replié par défaut (header cliquable). Défaut false = ouvert.',
        },
        collapseTitle: {
          type: 'string',
          description: 'Titre du header collapse. Fallback sur title.',
        },
      },
      required: ['type', 'mermaid'],
    },
  },
  {
    name: 'install_package',
    description: 'Installe un package Python (pip) ou Node (npm) manquant dans l\'environnement d\'exécution. USE THIS quand execute_code échoue avec ModuleNotFoundError ou si tu sais qu\'un package spécifique est nécessaire (ex: reportlab pour PDF avancé, cairosvg, opencv-python). Passe par permission (risque elevated). Règles admin configurables via AI_PACKAGE_INSTALL_MODE (blocked|ask|auto), AI_PACKAGE_WHITELIST, AI_PACKAGE_BLACKLIST.',
    parameters: {
      type: 'object',
      properties: {
        language: { type: 'string', enum: ['python', 'node'], description: 'Runtime cible' },
        package: { type: 'string', description: 'Nom du package (ex: reportlab, cairosvg, @mermaid-js/mermaid-cli)' },
        version: { type: 'string', description: 'Version optionnelle (ex: "1.2.3", "^2.0"). Sinon latest.' },
        reason: { type: 'string', description: 'Raison brève (ex: "pour rendre Mermaid → PNG")' },
      },
      required: ['language', 'package'],
    },
  },
  {
    name: 'display_image',
    description: "Affiche une image directement inline dans le chat (bubble avec l'image). Utile quand l'agent a produit une image via execute_code / generate_diagram / download et veut la montrer. Fournis soit fileId (image stockée), soit url (HTTP/HTTPS).",
    parameters: {
      type: 'object',
      properties: {
        fileId: { type: 'string', description: 'ID d\'une image stockée (priorité sur url)' },
        url: { type: 'string', description: 'URL publique d\'une image' },
        caption: { type: 'string', description: 'Légende optionnelle affichée sous l\'image' },
        alt: { type: 'string', description: 'Alt text accessibilité' },
        widgetId: {
          type: 'string',
          description: "Identifiant stable du widget image. OBLIGATOIRE pour le mode INLINE : réutilise dans [[WIDGET:<widgetId>]].",
        },
        collapsed: { type: 'boolean', description: 'Replié par défaut si true. Défaut false.' },
        collapseTitle: { type: 'string', description: 'Titre du header collapse. Fallback sur caption.' },
      },
    },
  },
  {
    name: 'display_file',
    description: `Affiche inline un fichier .docx / .xlsx / .pptx / .pdf dans le chat avec un viewer intégré (comme display_image pour les images). À utiliser SYSTÉMATIQUEMENT après avoir produit un document office via execute_code — l'utilisateur voit le rendu directement dans le chat sans télécharger ni convertir en PDF/PNG.

- **.docx** → rendu HTML via mammoth (texte, titres, tableaux, images embarquées).
- **.xlsx** → rendu HTML avec onglets par feuille (SheetJS).
- **.pptx** → converti à la volée en PDF via LibreOffice et affiché dans un viewer PDF inline.
- **.pdf** → viewer PDF natif du navigateur.

Fournis uniquement le fileId retourné par files.upload / project_write. Pas besoin de convertir toi-même en PDF/PNG au préalable.`,
    parameters: {
      type: 'object',
      properties: {
        fileId: { type: 'string', description: 'ID du fichier docx/xlsx/pptx/pdf à afficher' },
        caption: { type: 'string', description: 'Légende optionnelle affichée au-dessus du viewer (ex: "Facture modèle v1")' },
        widgetId: { type: 'string', description: "Identifiant stable du widget (ex: 'invoice-template'). OBLIGATOIRE pour le mode INLINE : réutilise dans [[WIDGET:<widgetId>]]. Si widgetId existant → remplace le fileId et rafraîchit le viewer in-place." },
        collapsed: { type: 'boolean', description: 'Replié par défaut si true. Défaut false = viewer ouvert.' },
        collapseTitle: { type: 'string', description: 'Titre du header collapse. Fallback sur caption ou nom du fichier.' },
      },
      required: ['fileId'],
    },
  },
  {
    name: 'render_interactive_canvas',
    description: `Affiche un canvas HTML interactif inline dans le chat (animations 2D canvas/SVG, scènes 3D Three.js, démos WebGL, visualisations live, dashboards charts).

🗂️ EXHAUSTIVITÉ DES DONNÉES (CRITIQUE — lire AVANT de générer le HTML)
Quand le canvas affiche un dataset extrait d'un fichier (prévisionnel, budget, séries, tableau Excel…), tu DOIS embarquer **LA TOTALITÉ** des lignes/points dans le JS inline. Pas d'échantillon, pas de "les 6 premiers mois" si le fichier en contient 60, pas de "…" à la fin.
- Si \`execute_code\` a retourné 60 mois de data → le chart doit avoir 60 points.
- Si \`project_read_file\` a retourné 500 lignes → la table doit avoir 500 rows.
- L'intérêt du canvas interactif est précisément d'être scrollable/zoomable/filtrable côté client — donne-lui toute la matière.
- Si le dataset est vraiment trop gros (>50k tokens d'arg), alerte l'user et propose une pagination ou un filtre ; ne tronque JAMAIS silencieusement.

🎨 CHARTE GRAPHIQUE HOMEPORT (à appliquer par DÉFAUT — impératif sauf contexte contraire)
- **Thème TOUJOURS clair** : fond \`#ffffff\` ou \`#fafafa\`. JAMAIS de fond noir/sombre par défaut.
- **Couleur signature** : rose magenta \`#e61982\` (primary Homeport) pour le 1er dataset / élément principal.
- **Palette harmonique** dans cet ordre pour multi-datasets :
  1. \`#e61982\` rose, 2. \`#ff70a6\` rose clair, 3. \`#722ed1\` violet, 4. \`#13c2c2\` turquoise, 5. \`#1890ff\` bleu, 6. \`#fa541c\` corail, 7. \`#faad14\` ambre.
- **Dégradés signatures OK** : \`linear-gradient(135deg,#e61982,#722ed1)\` ou \`linear-gradient(135deg,#ff70a6,#13c2c2)\`. Bienvenue pour barres, cards, fonds de titres.
- **Texte** : principal \`#262626\`, secondaire \`#8c8c8c\`.
- **Bordures** : \`#f0f0f0\` (léger) ou \`#d9d9d9\` (visible).
- **Font** : \`-apple-system, "Segoe UI", Roboto, sans-serif\`. Tailles 11-14 px body, 16-20 px titres.
- **Border-radius** : 8-10 px. **Box-shadow** subtile : \`0 2px 8px rgba(0,0,0,0.06)\`.

🚫 EXCEPTION au thème clair : UNIQUEMENT si le contexte l'impose (système solaire/espace → fond sombre espace, horreur/nuit, drapeau national → couleurs nationales, logo client fourni → couleurs du logo, brief explicite de l'utilisateur). Dans TOUS les autres cas (tri à bulles, graphique, dashboard, démo générique, animation physique abstraite, chart…) → **thème clair obligatoire**.

📱 RESPONSIVE OBLIGATOIRE
- Largeur flexible (\`width:100%;max-width:...\`), pas de pixel fixe.
- Grid/flex avec \`auto-fit minmax\` pour multi-cols.
- Chart.js : \`responsive:true, maintainAspectRatio:false\`.
- Three.js : \`ResizeObserver\` sur body + camera.aspect + renderer.setSize.
- SVG : \`viewBox\` au lieu de width/height absolus.

📝 Le paramètre \`html\` doit contenir un document HTML complet self-contained (doctype + html + head + body). Three.js via importmap, Chart.js/D3/ECharts via script CDN. Tout JS inline, pas de fetch vers ton backend.

⚠️ **ÉVITER LES ERREURS DE SYNTAXE — LIS AVANT DE GÉNÉRER** :

Le param \`html\` transite en JSON, donc backslashes et backticks sont traîtres. Suis ces règles pour éviter les "unexpected token" / "invalid or unexpected token" qui te forcent à régénérer :

1. **Pas de template literals JS dans l'HTML** (backticks \` \`). Utilise des strings simples (apostrophes \`'\`) ou doubles (\`"\`) concatenées avec \`+\`. Si tu DOIS utiliser un template literal, échappe les backticks en \`\\\\\`\`.
   ✅ \`const msg = 'Hello ' + name;\`
   ❌ \`const msg = \\\`Hello \${name}\\\`\`  ← source classique du bug

2. **Strings CSS dans JS** : double-quote à l'extérieur, simple-quote à l'intérieur (ou l'inverse).
   ✅ \`el.style.font = '16px Arial';\`
   ❌ \`el.style.font = "16px 'Arial'";\` si la string JS est entre double-quotes

3. **Échappe les apostrophes françaises dans les strings JS** (ou utilise des double-quotes).
   ✅ \`const t = "L'utilisateur";\`
   ❌ \`const t = 'L'utilisateur';\`  ← erreur syntax

4. **Regex et strings avec \\\\n \\\\t** : double backslash dans JSON, donc en résultat HTML tu auras bien \\n \\t.

5. **Caractères spéciaux** : < > & dans du JS inline doivent être dans une string (sinon le parser HTML ferme ton <script>). Si tu écris du HTML comme string JS, utilise \`\\\\x3C\` au lieu de \`<\` pour ouvrir des balises.

6. **TOUJOURS tester mentalement** : relis ton HTML une fois avant de l'envoyer. Si tu vois un backtick, une apostrophe suspecte, un mix de quotes → corrige avant d'envoyer.

7. **Préfère le plus simple** : pas besoin de frameworks lourds pour une viz simple. Vanilla JS + Chart.js/D3 + CSS suffit. Moins de code = moins de bugs de syntaxe.`,
    parameters: {
      type: 'object',
      properties: {
        html: { type: 'string', description: 'Document HTML complet (doctype + html + head + body + scripts inline/CDN)' },
        title: { type: 'string', description: 'Titre affiché au-dessus du canvas (ex: "Cube 3D rotatif")' },
        description: { type: 'string', description: 'Courte description du principe illustré' },
        height: { type: 'number', description: 'Hauteur du canvas en px (défaut 420, max 900)' },
        type: { type: 'string', enum: ['2d', '3d', 'animation', 'demo'], description: 'Type de rendu pour l\'icône badge' },
        widgetId: { type: 'string', description: "Identifiant stable du canvas (ex: 'three-demo'). OBLIGATOIRE pour le mode INLINE : réutilise dans [[WIDGET:<widgetId>]]. Si widgetId existant → MISE À JOUR IN-PLACE (rendu rafraîchi dans la même iframe)." },
        collapsed: { type: 'boolean', description: 'Canvas replié par défaut si true. Défaut false = ouvert.' },
        collapseTitle: { type: 'string', description: 'Titre du header collapse. Fallback sur title.' },
      },
      required: ['html'],
    },
  },
];

/**
 * Parcourt le HTML et valide la syntaxe des blocs <script> non-module inline.
 * Utilise vm.Script (parser natif Node, zéro dep) qui accepte la même grammaire
 * que les scripts classiques côté browser. Les scripts type="module" sont skippés
 * (ils utilisent import/importmap que vm.Script ne supporte pas en top-level).
 *
 * @param {string} html
 * @returns {null | { message: string, snippet: string, line?: number }}
 */
function _validateInlineScripts(html) {
  try {
    const { Script } = require('vm');
    // Regex simple pour extraire <script ...>...</script>. Capture les attributs
    // pour distinguer type="module" qu'on skip. Non-greedy sur le contenu.
    const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
      const attrs = (m[1] || '').toLowerCase();
      const body = m[2] || '';
      if (!body.trim()) continue;
      // Skip modules (import/export top-level pas parsable par vm.Script)
      if (/type\s*=\s*["']?module/.test(attrs)) continue;
      // Skip importmap (JSON, pas du JS)
      if (/type\s*=\s*["']?importmap/.test(attrs)) continue;
      // Skip src="..." (pas de body à valider)
      if (/\bsrc\s*=/.test(attrs)) continue;
      try {
        // filename fictif pour la localisation d'erreur
        new Script(body, { filename: 'canvas-inline.js', displayErrors: false });
      } catch (e) {
        const errMsg = String(e?.message || e);
        // Extrait la ligne approximative depuis le stack si disponible
        let line;
        const lineMatch = /canvas-inline\.js:(\d+)/.exec(String(e?.stack || ''));
        if (lineMatch) line = parseInt(lineMatch[1], 10);
        // Snippet de contexte : ±60 chars autour de la ligne fautive (ou début)
        const lines = body.split('\n');
        const idx = (line || 1) - 1;
        const snippet = (lines[idx] || lines[0] || '').trim().slice(0, 120);
        return { message: errMsg.slice(0, 200), snippet, line };
      }
    }
    return null;
  } catch {
    // Si le validateur lui-même plante, on laisse passer (fail-open)
    return null;
  }
}

/** Recursively extract fileRef objects from a result */
function extractFileRefs(obj, found = []) {
  if (!obj || typeof obj !== 'object') return found;
  if (obj._type === 'fileRef') { found.push(obj); return found; }
  if (Array.isArray(obj)) { for (const v of obj) extractFileRefs(v, found); return found; }
  for (const v of Object.values(obj)) extractFileRefs(v, found);
  return found;
}

// Résout un identifiant de Flow (custom flw_xxx OU ObjectId) vers son _id Mongo.
// Retourne null si introuvable. Scope par workspace pour la sécurité.
async function resolveFlowObjectId(rawId, ctx) {
  const { Types } = require('mongoose');
  const s = String(rawId || '').trim();
  if (!s) return null;
  // Tentative ObjectId direct
  if (Types.ObjectId.isValid(s)) {
    const f = await Flow.findOne({ _id: s, workspaceId: ctx.workspaceId }).select('_id').lean();
    if (f) return f._id;
  }
  // Tentative custom ID (flw_xxx)
  const byCustom = await Flow.findOne({ id: s, workspaceId: ctx.workspaceId }).select('_id').lean();
  if (byCustom) return byCustom._id;
  return null;
}

// Idem pour Form
async function resolveFormObjectId(rawId, ctx) {
  const { Types } = require('mongoose');
  const Form = require('../../db/models/form.model');
  const s = String(rawId || '').trim();
  if (!s) return null;
  if (Types.ObjectId.isValid(s)) {
    const f = await Form.findOne({ _id: s, workspaceId: ctx.workspaceId }).select('_id').lean();
    if (f) return f._id;
  }
  const byCustom = await Form.findOne({ id: s, workspaceId: ctx.workspaceId }).select('_id').lean();
  if (byCustom) return byCustom._id;
  return null;
}

// Execute a meta-tool by name
async function executeMetaTool(name, input, ctx) {
  // Skill meta-tools (skill_list, skill_get, skill_execute) are routed to a
  // dedicated module to keep this file manageable.
  if (SKILL_META_TOOL_NAMES.has(name)) {
    return executeSkillMetaTool(name, input, ctx);
  }

  await toolIndex.ensureBuilt();

  switch (name) {
    case 'search_tools': {
      const results = toolIndex.search(input.query || '', {
        provider: input.provider,
        category: input.category,
        type: input.type,
        limit: input.limit || 15,
      });
      return results;
    }

    case 'get_tool_details': {
      // Detect builder tools — these are direct tool calls, NOT NodeTemplates
      if (BUILDER_TOOL_NAMES.has(input.key)) {
        return {
          error: `'${input.key}' est un outil BUILDER (capsule), PAS un NodeTemplate. ` +
            `Appelle-le DIRECTEMENT comme tool call. ` +
            `NE PAS utiliser search_tools ou get_tool_details pour les outils builder.`,
        };
      }
      const tpl = await NodeTemplate.findOne({ key: input.key }).lean();
      if (!tpl) return { error: `Template '${input.key}' not found` };
      const argsSchema = tpl.args ? argsToJsonSchema(tpl.args) : null;
      const outputSchema = extractOutputSchema(tpl);
      return {
        key: tpl.key,
        name: tpl.title || tpl.name,
        description: tpl.description || '',
        type: tpl.type,
        provider: tpl.providerKey || null,
        argsSchema,
        outputSchema,
        inputHandles: tpl.inputHandles || [],
        outputHandles: tpl.outputHandles || [],
        allowWithoutCredentials: !!tpl.allowWithoutCredentials,
      };
    }

    case 'execute_tool': {
      // LLM sometimes puts args at top level instead of inside `args: {}` — handle both
      let toolArgs = input.args;
      if (!toolArgs || (typeof toolArgs === 'object' && Object.keys(toolArgs).length === 0)) {
        // Extract everything except 'key' as args
        const { key, args, ...rest } = input;
        if (Object.keys(rest).length > 0) toolArgs = rest;
        else toolArgs = args || {};
      }
      const { result, displayTitle } = await executeTool(input.key, toolArgs, {
        workspaceId: ctx.workspaceId,
        companyId: ctx.companyId,
        userId: ctx.userId,
      });
      // Ensure result is an object so _displayTitle side-channel can be attached
      const out = (result && typeof result === 'object') ? result : { ok: true, data: result };
      if (displayTitle) out._displayTitle = displayTitle;
      // Detect fileRefs in the result and expose them as _files
      const files = extractFileRefs(out);
      if (files.length) {
        out._files = files.map(f => ({
          fileId: f.fileId, name: f.name, mimeType: f.mimeType, size: f.size,
          isImage: (f.mimeType || '').startsWith('image/'),
        }));
      }
      return out;
    }

    case 'list_providers': {
      const credentials = await Credential.find(
        { workspaceId: ctx.workspaceId },
        'name providerKey'
      ).lean();
      const providerKeys = [...new Set(credentials.map(c => c.providerKey))];
      const providers = await Provider.find(
        { key: { $in: providerKeys } },
        'key name title iconUrl'
      ).lean();
      return providers.map(p => ({
        key: p.key,
        name: p.title || p.name,
        icon: p.iconUrl || null,
        credentials: credentials.filter(c => c.providerKey === p.key).map(c => ({ name: c.name })),
      }));
    }

    case 'ask_user': {
      // This is handled specially by agent-runner: the result IS the question
      if (input.questions?.length) {
        // Batch mode: multiple questions
        return {
          text: input.text || 'Veuillez répondre aux questions suivantes :',
          questionType: 'batch',
          questions: input.questions,
        };
      }
      return {
        text: input.text,
        questionType: input.questionType || 'text',
        options: input.options || [],
      };
    }

    case 'search_workflows': {
      const q = input.query || '';
      const limit = input.limit || 10;
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const flows = await Flow.find(
        { workspaceId: ctx.workspaceId, $or: [{ name: regex }, { description: regex }] },
        'id name description status enabled deployedAt lastDeployedAt triggerType'
      ).limit(limit).lean();
      return flows.map(f => ({ id: f.id, name: f.name, description: f.description || '', status: f.status, enabled: f.enabled, deployedAt: f.deployedAt || null, lastDeployedAt: f.lastDeployedAt || null, triggerType: f.triggerType || null }));
    }

    case 'run_workflow': {
      // Delegate to the engine — will be integrated with run system
      return { status: 'not_implemented', message: 'Workflow execution via AI will be available soon' };
    }

    case 'deploy_flow': {
      const fid = input.flowId;
      if (!fid) return { error: 'flowId requis' };
      try {
        let flow = Types.ObjectId.isValid(fid) ? await Flow.findById(fid) : null;
        if (!flow) flow = await Flow.findOne({ id: fid });
        if (!flow) return { error: 'Flow introuvable' };
        if (!flow.enabled) return { error: 'Le flow est désactivé. Active-le d\'abord.' };
        if (flow.status === 'production') return { error: 'Le flow est déjà en production.' };
        const { triggerManager } = require('../../services/trigger-manager');
        const status = await triggerManager.deployFlow(flow._id);
        return { success: true, status: 'deployed', triggerType: status?.triggerType || null, webhookUrl: status?.webhookUrl || null, message: `Flow "${flow.name}" déployé en production.` };
      } catch (e) {
        return { error: e?.message || String(e) };
      }
    }

    case 'undeploy_flow': {
      const fid = input.flowId;
      if (!fid) return { error: 'flowId requis' };
      try {
        let flow = Types.ObjectId.isValid(fid) ? await Flow.findById(fid) : null;
        if (!flow) flow = await Flow.findOne({ id: fid });
        if (!flow) return { error: 'Flow introuvable' };
        if (flow.status !== 'production') return { error: 'Le flow n\'est pas en production.' };
        const { triggerManager } = require('../../services/trigger-manager');
        await triggerManager.undeployFlow(flow._id);
        return { success: true, status: 'undeployed', message: `Flow "${flow.name}" arrêté.` };
      } catch (e) {
        return { error: e?.message || String(e) };
      }
    }

    case 'get_deployment_status': {
      const fid = input.flowId;
      if (!fid) return { error: 'flowId requis' };
      try {
        let flow = Types.ObjectId.isValid(fid) ? await Flow.findById(fid).lean() : null;
        if (!flow) flow = await Flow.findOne({ id: fid }).lean();
        if (!flow) return { error: 'Flow introuvable' };
        const { triggerManager } = require('../../services/trigger-manager');
        const ts = triggerManager.getStatus ? triggerManager.getStatus(flow._id) : {};
        return { success: true, flowName: flow.name, status: flow.status || 'draft', enabled: flow.enabled !== false, deployed: flow.status === 'production', deployedAt: flow.deployedAt || null, lastDeployedAt: flow.lastDeployedAt || null, triggerType: flow.triggerType || ts?.triggerType || null, active: ts?.active || false };
      } catch (e) {
        return { error: e?.message || String(e) };
      }
    }

    case 'list_runs': {
      const fid = input.flowId;
      if (!fid) return { error: 'flowId requis' };
      try {
        // Resolve flow to get ObjectId
        let flow = Types.ObjectId.isValid(fid) ? await Flow.findById(fid, '_id').lean() : null;
        if (!flow) flow = await Flow.findOne({ id: fid }, '_id').lean();
        if (!flow) return { error: 'Flow introuvable' };
        const limit = Math.min(Math.max(input?.limit || 20, 1), 50);
        const offset = Math.max(input?.offset || 0, 0);
        const query = { flowId: flow._id };
        if (input?.status) query.status = input.status;
        const [runs, total] = await Promise.all([
          Run.find(query, 'status startedAt finishedAt durationMs').sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
          Run.countDocuments(query),
        ]);
        return { success: true, total, limit, offset, runs: runs.map(r => ({ id: String(r._id), status: r.status, startedAt: r.startedAt, finishedAt: r.finishedAt || null, durationMs: r.durationMs || null })) };
      } catch (e) {
        return { error: e?.message || String(e) };
      }
    }

    case 'get_run_stats': {
      const fid = input.flowId;
      if (!fid) return { error: 'flowId requis' };
      try {
        // Resolve flow to get ObjectId
        let flow = Types.ObjectId.isValid(fid) ? await Flow.findById(fid, '_id').lean() : null;
        if (!flow) flow = await Flow.findOne({ id: fid }, '_id').lean();
        if (!flow) return { error: 'Flow introuvable' };
        const stats = await Run.aggregate([
          { $match: { flowId: flow._id } },
          { $group: { _id: null, total: { $sum: 1 }, success: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } }, error: { $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] } }, running: { $sum: { $cond: [{ $eq: ['$status', 'running'] }, 1, 0] } }, avgDurationMs: { $avg: '$durationMs' } } },
        ]);
        const s = stats[0] || { total: 0, success: 0, error: 0, running: 0, avgDurationMs: null };
        return { success: true, total: s.total, success: s.success, error: s.error, running: s.running, avgDurationMs: s.avgDurationMs ? Math.round(s.avgDurationMs) : null };
      } catch (e) {
        return { error: e?.message || String(e) };
      }
    }

    case 'save_memory': {
      const upd = await AiUserContext.findOneAndUpdate(
        { userId: ctx.userId },
        { $set: { [`memory.${input.key}`]: input.value }, $setOnInsert: { companyId: ctx.companyId } },
        { upsert: true, new: true }
      );
      return { ok: true, key: input.key };
    }

    case 'get_memory': {
      const userCtx = await AiUserContext.findOne({ userId: ctx.userId }).lean();
      return userCtx?.memory || {};
    }

    case 'save_project_memory': {
      const pm = _resolveProjectElement(ctx);
      if (!pm) return { error: 'Aucun projet lié à cette conversation (pas de flowId ni formId). Utilise save_memory pour la mémoire globale.' };
      await AiProjectMemory.findOneAndUpdate(
        { workspaceId: ctx.workspaceId, elementType: pm.type, elementId: pm.id },
        { $set: { [`memory.${input.key}`]: input.value }, $setOnInsert: { workspaceId: ctx.workspaceId, elementType: pm.type, elementId: pm.id } },
        { upsert: true }
      );
      return { ok: true, key: input.key, projectType: pm.type, projectId: pm.id };
    }

    case 'get_project_memory': {
      const pm2 = _resolveProjectElement(ctx);
      if (!pm2) return { error: 'Aucun projet lié à cette conversation. Utilise get_memory pour la mémoire globale.' };
      const doc = await AiProjectMemory.findOne({ workspaceId: ctx.workspaceId, elementType: pm2.type, elementId: pm2.id }).lean();
      return doc?.memory || {};
    }

    case 'get_project_knowledge': {
      const tid = ctx._metadata?.threadId || ctx.threadId;
      if (!tid) return { ok: false, error: 'threadId manquant (mémoire structurée nécessite un thread actif)' };
      const doc = await AiProjectKnowledge.findOne({ threadId: tid }).lean();
      const entries = doc?.entries || [];
      if (input.key) {
        const found = entries.find(e => e.key === input.key);
        if (found) return { ok: true, entry: found };
        return { ok: false, error: `Clé "${input.key}" introuvable`, availableKeys: entries.map(e => e.key) };
      }
      return { ok: true, total: entries.length, entries };
    }

    case 'set_project_knowledge': {
      const tid = ctx._metadata?.threadId || ctx.threadId;
      if (!tid) return { ok: false, error: 'threadId manquant (mémoire structurée nécessite un thread actif)' };
      const { key, value, type, description } = input || {};
      if (!key || typeof key !== 'string') return { ok: false, error: 'key requis (string)' };
      if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/.test(key)) {
        return { ok: false, error: 'Clé invalide : alphanumérique + . _ - uniquement, max 100 caractères' };
      }
      if (value === undefined) return { ok: false, error: 'value requis' };
      const allowedTypes = ['text', 'number', 'date', 'url', 'email', 'file', 'list', 'boolean', 'json'];
      const resolvedType = allowedTypes.includes(type) ? type : 'text';
      const desc = description ? String(description).slice(0, 500) : '';

      // Upsert doc, then pull any existing entry by key, then push the new one.
      await AiProjectKnowledge.updateOne(
        { threadId: tid },
        { $setOnInsert: { threadId: tid, workspaceId: ctx.workspaceId, entries: [] } },
        { upsert: true }
      );
      await AiProjectKnowledge.updateOne(
        { threadId: tid },
        { $pull: { entries: { key } } }
      );
      await AiProjectKnowledge.updateOne(
        { threadId: tid },
        {
          $push: {
            entries: {
              key, value, type: resolvedType, description: desc,
              source: 'ai', updatedAt: new Date(), updatedBy: ctx.userId, pinned: false, tags: [],
            },
          },
        }
      );
      return { ok: true, key, message: `Mémoire projet mise à jour : ${key}` };
    }

    case 'suggest_memory_entries': {
      const _t0 = Date.now();
      console.log('[suggest_memory_entries] ENTER', { entries_count: Array.isArray(input?.entries) ? input.entries.length : 'n/a' });
      const tid = ctx._metadata?.threadId || ctx.threadId;
      if (!tid) { console.log('[suggest_memory_entries] EXIT: threadId manquant'); return { ok: false, error: 'threadId manquant' }; }
      const entries = Array.isArray(input?.entries) ? input.entries : [];
      if (!entries.length) {
        console.log('[suggest_memory_entries] EXIT: empty entries (' + (Date.now() - _t0) + 'ms)');
        return { ok: true, created: 0, skipped: 0, message: 'Aucune suggestion' };
      }

      // Cap à 3 suggestions max par appel (garde-fou)
      const capped = entries.slice(0, 3);
      const KEY_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/;
      const ALLOWED_TYPES = ['text', 'number', 'date', 'email', 'url', 'list'];

      // Load current entries pour dédup
      console.log('[suggest_memory_entries] loading existing entries…');
      const existing = await AiProjectKnowledge.findOne({ threadId: tid }).lean();
      const existingEntries = existing?.entries || [];
      console.log('[suggest_memory_entries] existing=' + existingEntries.length);

      let created = 0;
      let skipped = 0;
      // Cherche l'_id du dernier AiMessage assistant du thread (pour traçabilité)
      let sourceMessageId = ctx._sourceMessageId || ctx._lastMessageId || null;
      if (!sourceMessageId) {
        try {
          const lastAsst = await AiMessage.findOne({ threadId: tid, role: 'assistant' })
            .sort({ createdAt: -1 }).select('_id').lean();
          if (lastAsst?._id) sourceMessageId = lastAsst._id;
        } catch (e) { console.error('[suggest_memory_entries] lastAsst lookup failed:', e?.message); }
      }

      for (let i = 0; i < capped.length; i++) {
        const e = capped[i];
        const key = typeof e?.key === 'string' ? e.key.trim() : '';
        console.log(`[suggest_memory_entries] entry ${i + 1}/${capped.length}: key="${key}"`);
        if (!key || !KEY_REGEX.test(key)) { console.log('  → skip: invalid key'); skipped++; continue; }
        if (e?.value === undefined || e?.value === null || e?.value === '') { console.log('  → skip: empty value'); skipped++; continue; }

        // Dédup : si clé existe déjà avec status approved ou pending ET même valeur → skip
        const prior = existingEntries.find(x => x.key === key);
        if (prior && (prior.status === 'approved' || !prior.status || prior.status === 'pending')) {
          const sameVal = String(prior.value ?? '') === String(e.value ?? '');
          if (sameVal) { console.log('  → skip: same value exists'); skipped++; continue; }
        }

        const type = ALLOWED_TYPES.includes(e.type) ? e.type : 'text';
        const description = e.description ? String(e.description).slice(0, 500) : '';
        const why = e.why ? String(e.why).slice(0, 500) : '';

        console.log('  → upsert doc');
        await AiProjectKnowledge.updateOne(
          { threadId: tid },
          { $setOnInsert: { threadId: tid, workspaceId: ctx.workspaceId, entries: [] } },
          { upsert: true }
        );
        if (prior && prior.status !== 'approved' && prior.status !== undefined && prior.status !== null) {
          console.log('  → pull previous pending/rejected');
          await AiProjectKnowledge.updateOne(
            { threadId: tid },
            { $pull: { entries: { key, status: { $in: ['pending', 'rejected'] } } } }
          );
        } else if (prior) {
          console.log('  → skip: prior is approved');
          skipped++;
          continue;
        }

        const entry = {
          key, value: e.value, type, description,
          source: 'ai', updatedAt: new Date(), updatedBy: ctx.userId,
          pinned: false, tags: [],
          status: 'pending',
          suggestionWhy: why,
        };
        if (sourceMessageId) {
          try {
            if (Types.ObjectId.isValid(String(sourceMessageId))) {
              entry.sourceMessageId = new Types.ObjectId(String(sourceMessageId));
            }
          } catch { /* ignore */ }
        }
        console.log('  → push new entry');
        await AiProjectKnowledge.updateOne(
          { threadId: tid },
          { $push: { entries: entry } }
        );
        created++;
      }

      console.log(`[suggest_memory_entries] DONE created=${created} skipped=${skipped} total=${capped.length} (${Date.now() - _t0}ms)`);
      return { ok: true, created, skipped, total: capped.length };
    }

    case 'compact_and_transfer': {
      const { summary, newMode, newTitle, agentId, flowId, formId } = input;
      // Create new thread with the summary as system context
      // Preserve link to the element (flow/form) if provided
      const threadData = {
        companyId: ctx.companyId,
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
        mode: newMode || 'chat',
        title: newTitle || 'Suite de conversation',
        agentId: agentId || ctx._sourceThreadAgentId || undefined,
      };
      // Résout flowId custom (flw_xxx) → ObjectId (le schema attend ObjectId).
      if (flowId) {
        const resolved = await resolveFlowObjectId(flowId, ctx);
        if (!resolved) return { ok: false, error: `Workflow "${flowId}" introuvable` };
        threadData.flowId = resolved;
      }
      if (formId) {
        const resolved = await resolveFormObjectId(formId, ctx);
        threadData.metadata = { formId: resolved || formId };
      }
      const newThread = await AiThread.create(threadData);
      // Add the compact summary as a system context message
      await AiMessage.create({
        threadId: newThread._id,
        role: 'system',
        content: `[Contexte transféré depuis une conversation précédente]\n\n${summary}`,
      });
      return {
        ok: true,
        threadId: newThread.id,
        title: newThread.title,
        mode: newThread.mode,
        _transfer: true, // Marker for SSE side event
      };
    }

    case 'attach_thread_to_flow': {
      if (!ctx.threadId) return { ok: false, error: 'threadId courant manquant' };
      const flowId = String(input.flowId || '').trim();
      if (!flowId) return { ok: false, error: 'flowId requis' };
      const flowObjId = await resolveFlowObjectId(flowId, ctx);
      if (!flowObjId) return { ok: false, error: `Workflow "${flowId}" introuvable dans ce workspace` };
      const flow = await Flow.findById(flowObjId).lean();
      await AiThread.updateOne(
        { _id: ctx.threadId },
        { $set: { flowId: flowObjId, mode: 'workflow' } },
      );
      const nodeCount = Array.isArray(flow?.graph?.nodes) ? flow.graph.nodes.length : 0;
      return {
        ok: true,
        flowId: String(flow?._id),
        flowName: flow?.name || '',
        nodeCount,
        message: `Thread lié au workflow "${flow?.name}" (${nodeCount} nodes). Le graph sera disponible dans ton contexte au prochain tour pour édition.`,
      };
    }

    case 'attach_thread_to_form': {
      if (!ctx.threadId) return { ok: false, error: 'threadId courant manquant' };
      const formId = String(input.formId || '').trim();
      if (!formId) return { ok: false, error: 'formId requis' };
      const formObjId = await resolveFormObjectId(formId, ctx);
      if (!formObjId) return { ok: false, error: `Form "${formId}" introuvable dans ce workspace` };
      const Form = require('../../db/models/form.model');
      const form = await Form.findById(formObjId).lean();
      const thread = await AiThread.findById(ctx.threadId);
      if (thread) {
        thread.mode = 'form';
        thread.metadata = { ...(thread.metadata || {}), formId: String(formObjId) };
        thread.markModified('metadata');
        await thread.save();
      }
      return {
        ok: true,
        formId: String(form?._id),
        formName: form?.name || '',
        message: `Thread lié au form "${form?.name}". Le schema sera disponible au prochain tour pour édition.`,
      };
    }

    case 'detach_thread': {
      if (!ctx.threadId) return { ok: false, error: 'threadId courant manquant' };
      const thread = await AiThread.findById(ctx.threadId);
      if (!thread) return { ok: false, error: 'thread introuvable' };
      thread.flowId = undefined;
      thread.mode = 'chat';
      if (thread.metadata && thread.metadata.formId) {
        const meta = { ...thread.metadata };
        delete meta.formId;
        thread.metadata = meta;
        thread.markModified('metadata');
      }
      await thread.save();
      return { ok: true, message: 'Thread détaché. Mode chat libre.' };
    }

    case 'open_element': {
      return { _action: true, action: 'open_element', elementType: input.elementType, elementId: input.elementId, elementName: input.elementName || '' };
    }

    case 'open_credentials': {
      // Return action event — frontend will handle opening the modal
      return { _action: true, action: 'open_credentials', providerKey: input.providerKey, providerName: input.providerName || input.providerKey };
    }

    case 'list_credentials': {
      const filter = { workspaceId: ctx.workspaceId };
      if (input.providerKey) filter.providerKey = input.providerKey;
      let creds = await Credential.find(filter, 'id _id name providerKey createdAt').lean().limit(50).sort({ createdAt: -1 });
      // Fuzzy fallback: if exact providerKey found nothing, try matching by provider name/title
      if (!creds.length && input.providerKey) {
        const Provider = require('../../db/models/provider.model');
        const fuzzy = new RegExp(input.providerKey.replace(/[_-]/g, '.*'), 'i');
        const matchedProviders = await Provider.find({
          $or: [{ key: fuzzy }, { name: fuzzy }, { title: fuzzy }]
        }, 'key').lean().limit(5);
        if (matchedProviders.length) {
          const matchedKeys = matchedProviders.map(p => p.key);
          creds = await Credential.find(
            { workspaceId: ctx.workspaceId, providerKey: { $in: matchedKeys } },
            'id _id name providerKey createdAt'
          ).lean().limit(50).sort({ createdAt: -1 });
        }
      }
      if (!creds.length) {
        const msg = input.providerKey
          ? `Aucun credential trouvé pour le provider "${input.providerKey}". Utilise list_providers() pour voir les providers disponibles, puis open_credentials(providerKey) pour en créer.`
          : 'Aucun credential dans ce workspace.';
        return { credentials: [], message: msg };
      }
      return {
        credentials: creds.map(c => ({
          id: c.id || String(c._id),
          name: c.name,
          providerKey: c.providerKey,
        })),
        count: creds.length,
        hint: creds.length === 1
          ? `Un seul credential disponible : "${creds[0].name}" — il sera auto-assigné aux nouveaux nodes.`
          : `${creds.length} credentials disponibles. Choisis le bon pour chaque node ou demande à l'utilisateur.`,
      };
    }

    case 'set_node_credential': {
      // Handled by workflow capsule (workflow-tools.js) — not a meta-tool
      return { error: 'set_node_credential est un outil workflow (capsule). Il est disponible quand la capsule workflow est active.' };
    }

    case 'enrich_context': {
      const { level, field, value, reason } = input;
      const enrichEntry = { date: new Date(), source: 'ai_question', field, newValue: value, reason: reason || '' };

      if (level === 'company') {
        const AiCompanyContext = require('../../db/models/ai-company-context.model');
        await AiCompanyContext.findOneAndUpdate(
          { companyId: ctx.companyId },
          { $set: { [field]: value }, $push: { enrichmentHistory: enrichEntry }, $setOnInsert: { companyId: ctx.companyId } },
          { upsert: true }
        );
      } else if (level === 'workspace') {
        const AiWorkspaceContext = require('../../db/models/ai-workspace-context.model');
        await AiWorkspaceContext.findOneAndUpdate(
          { workspaceId: ctx.workspaceId },
          { $set: { [field]: value }, $push: { enrichmentHistory: enrichEntry }, $setOnInsert: { companyId: ctx.companyId, workspaceId: ctx.workspaceId } },
          { upsert: true }
        );
      } else if (level === 'user') {
        await AiUserContext.findOneAndUpdate(
          { userId: ctx.userId },
          { $set: { [field]: value }, $push: { enrichmentHistory: enrichEntry }, $setOnInsert: { companyId: ctx.companyId } },
          { upsert: true }
        );
      }
      return { ok: true, level, field };
    }

    case 'read_file': {
      const { resolveAttachments } = require('../attachments');
      if (!input.fileId) return { error: 'fileId requis' };
      const blocks = await resolveAttachments([{ fileId: input.fileId, name: input.fileId }], ctx.workspaceId);
      if (!blocks.length) return { error: 'Fichier introuvable' };
      // For images, return as content blocks for the LLM to see
      // For text/PDF, return the text content
      const block = blocks[0];
      if (block.type === 'image') {
        return { _contentBlocks: [block], message: `Image "${block.name}" chargée.` };
      }
      return { content: block.text || '[Contenu vide]' };
    }

    case 'search_manual': {
      const { searchManual } = require('../manuals/manual-index');
      return searchManual(input.query, input.namespace);
    }

    case 'get_manual_section': {
      const { getManualSection } = require('../manuals/manual-index');
      const section = getManualSection(input.topic, input.namespace);
      if (!section) return { error: `Section "${input.topic}" introuvable${input.namespace ? ` dans ${input.namespace}` : ''}.` };
      return section;
    }

    case 'todo_write': {
      if (!ctx.threadId) return { ok: false, error: 'threadId manquant' };
      const todos = Array.isArray(input?.todos) ? input.todos : [];
      if (!todos.length) return { ok: false, error: 'todos[] vide' };
      for (const t of todos) {
        if (!t || !t.id || !t.content) return { ok: false, error: 'chaque todo nécessite id + content + status' };
        if (!['pending', 'in_progress', 'completed', 'cancelled'].includes(t.status || 'pending')) {
          return { ok: false, error: `status invalide: ${t.status}` };
        }
      }
      const inProgressCount = todos.filter(t => t.status === 'in_progress').length;
      // Plusieurs in_progress autorisés (sous-agents parallèles = plusieurs tâches en cours).
      try {
        // Widget éditable. Deux scopes distincts :
        // - Parent (pas de jobContext ou type agent_run sans parentJobId) : scopé au
        //   dernier message user → `session-todos-<userMsgId>` (une checklist par demande).
        // - Subagent (parentJobId OU subagentType OU jobType='subagent') : scopé au
        //   jobId → `subagent-todos-<jobId>`. Visible uniquement dans la fenêtre
        //   d'interaction de ce subagent, pas dans la checklist principale.
        const jobContext = ctx?._jobContext;
        const isSubagent = !!(jobContext?.parentJobId)
          || !!(jobContext?.subagentType)
          || jobContext?.jobType === 'subagent';
        let widgetId = 'session-todos';
        if (isSubagent) {
          widgetId = `subagent-todos-${String(jobContext.jobId).slice(-12)}`;
        } else {
          try {
            // CRITIQUE : exclure les messages kind='mailbox' du calcul "dernier
            // user message". Sinon : main démarre avec userMsg1 → todo widgetId
            // basé sur userMsg1. User envoie mailbox "max 2 sources" pendant
            // exécution → nouveau user msg → resume parent crée une todo avec
            // un NOUVEAU widgetId, la principale devient orpheline. Fix : ne
            // compte que les vrais prompts initiaux (pas les mailbox interim).
            const lastUserMsg = await AiMessage.findOne({
              threadId: ctx.threadId,
              role: 'user',
              $or: [
                { 'metadata.kind': { $exists: false } },
                { 'metadata.kind': null },
                { 'metadata.kind': { $nin: ['mailbox'] } },
              ],
            }).sort({ createdAt: -1 }).select('_id').lean();
            if (lastUserMsg?._id) widgetId = `session-todos-${String(lastUserMsg._id).slice(-12)}`;
          } catch { /* fallback to default */ }
        }
        // Drain les tools accumulés depuis le dernier todo_write et attribue-les
        // à l'item qui vient de passer in_progress → completed (ou à l'item
        // actuellement in_progress qui a progressé).
        const pendingTools = (ctx?._jobContext?._todoPendingTools) || [];
        // Récupère l'état précédent pour voir quel item était in_progress
        const prevExisting = await _findWidgetByWidgetId(ctx.threadId, widgetId);
        const prevTodos = (prevExisting?.metadata?.todoList?.todos || []);
        const prevInProgress = prevTodos.find(t => t.status === 'in_progress');

        const todoPayload = {
          todos: todos.map(t => {
            const prev = prevTodos.find(p => p.id === t.id);
            // Le set accumulé de tools pour cet item = ceux déjà stockés + les nouveaux
            // si cet item était in_progress précédemment.
            const prevItemTools = (prev?.toolCalls || []);
            const newTools = (prev?.id && prevInProgress && prev.id === prevInProgress.id) ? pendingTools : [];
            const mergedTools = [...prevItemTools, ...newTools];
            return {
              id: String(t.id),
              content: String(t.content).slice(0, 400),
              activeForm: t.activeForm ? String(t.activeForm).slice(0, 200) : undefined,
              status: t.status || 'pending',
              toolCalls: mergedTools.length ? mergedTools : undefined,
            };
          }),
          title: input.title ? String(input.title).slice(0, 200) : undefined,
          updatedAt: new Date(),
        };

        // ── Anti-doublon todo_write : hash le contenu et skip si identique.
        // Pattern observé en prod : LLM ré-écrit 3-4× la même liste de todos
        // sans changement (juste pour "confirmer son plan"). Chaque write =
        // 1 DB write + 1 event SSE inutile.
        try {
          const todosForHash = todoPayload.todos.map(t => ({
            id: t.id, content: t.content, status: t.status,
            activeForm: t.activeForm,
          }));
          const newHash = crypto.createHash('sha1')
            .update(JSON.stringify(todosForHash))
            .digest('hex')
            .slice(0, 16);
          const prevHash = prevExisting?.metadata?.todoList?._contentHash;
          if (prevHash && prevHash === newHash) {
            console.log(`[meta-tools] todo_write dedup: hash unchanged (${newHash}) — skip persist`);
            const inProgressNoop = todoPayload.todos.find(t => t.status === 'in_progress');
            const completedNoop = todoPayload.todos.filter(t => t.status === 'completed').length;
            return {
              ok: true,
              _silent: true,
              deduplicated: true,
              stats: {
                total: todoPayload.todos.length,
                completed: completedNoop,
                inProgress: inProgressNoop ? 1 : 0,
                remaining: todoPayload.todos.length - completedNoop - (inProgressNoop ? 1 : 0),
              },
              currentTask: inProgressNoop ? inProgressNoop.content : null,
              hint: 'Aucun changement détecté dans la liste de todos — pas de re-persistence. Concentre-toi sur l\'exécution des steps au lieu de re-écrire la même liste.',
            };
          }
          // Inject le hash dans le payload pour la prochaine comparaison
          todoPayload._contentHash = newHash;
        } catch (e) {
          console.warn('[meta-tools] todo_write dedup hash failed:', e?.message);
        }

        // Reset le buffer de tools après drain
        if (ctx?._jobContext) ctx._jobContext._todoPendingTools = [];

        const existing = prevExisting;
        if (existing) {
          existing.content = input.title || '';
          existing.metadata = {
            ...(existing.metadata?.toObject?.() || existing.metadata || {}),
            kind: 'todo_list',
            todoList: todoPayload,
            widgetId,
            widgetUpdatedAt: new Date(),
            ...(isSubagent ? { subagentJobId: String(jobContext.jobId) } : {}),
          };
          await existing.save();
          _notifyInlineUpdate(ctx.threadId, String(existing._id), 'todo_list');
        } else {
          const created = await AiMessage.create({
            threadId: ctx.threadId,
            workspaceId: ctx.workspaceId,
            role: 'assistant',
            content: input.title || '',
            metadata: {
              kind: 'todo_list',
              todoList: todoPayload,
              widgetId,
              widgetUpdatedAt: new Date(),
              ...(isSubagent ? { subagentJobId: String(jobContext.jobId) } : {}),
            },
          });
          _notifyInlineMessage(ctx.threadId, 'todo_list', created._id);
        }
        const inProgress = todos.find(t => t.status === 'in_progress');
        const completedCount = todos.filter(t => t.status === 'completed').length;
        return {
          ok: true,
          _silent: true,
          stats: { total: todos.length, completed: completedCount, inProgress: inProgressCount, remaining: todos.length - completedCount - inProgressCount },
          currentTask: inProgress ? inProgress.content : null,
          hint: inProgress
            ? `Étape courante : "${inProgress.content}". Exécute-la puis appelle à nouveau todo_write pour la marquer completed et passer à la suivante. Entre les étapes, écris UNE courte phrase de narration pour l'utilisateur.`
            : (completedCount === todos.length
                ? "Toutes les étapes sont terminées. Écris un résumé final court."
                : "Passe la prochaine étape en in_progress puis exécute-la."),
        };
      } catch (e) {
        return { ok: false, error: e?.message || String(e) };
      }
    }

    case 'ask_parent_agent': {
      // Sous-agent pose une question synchrone au parent via mini-call LLM.
      // Cf. tool description : architecture parent↔child via LLM réel.
      const parentJobId = ctx?._jobContext?.parentJobId;
      if (!parentJobId) {
        return {
          ok: false,
          error: 'ask_parent_agent_unavailable',
          message: 'Ce tool est disponible UNIQUEMENT pour les sous-agents. Tu es l\'agent principal — utilise ask_user pour demander à l\'utilisateur, ou réponds toi-même.',
        };
      }
      const { question, context: subContext } = input || {};
      if (!question || typeof question !== 'string') {
        return { ok: false, error: 'question requise' };
      }

      try {
        const AiJob = require('../../db/models/ai-job.model');
        const parentJob = await AiJob.findOne({ id: parentJobId }).lean();
        if (!parentJob) return { ok: false, error: 'parent_job_not_found' };

        // Mini-call LLM sur le parent — pas de tools, juste du texte court.
        const { buildContext } = require('../context/context-builder');
        const parentCtx = await buildContext({
          companyId: parentJob.companyId,
          workspaceId: parentJob.workspaceId,
          userId: parentJob.userId,
        });
        const { createLlmClient } = require('../llm');
        const llm = createLlmClient(parentCtx.llmConfig.provider, parentCtx.llmConfig);

        const subAgentName = ctx._jobContext?.agentName || ctx._jobContext?.subagentType || 'subagent';
        const miniSystem = `Tu es l'agent parent d'un sous-agent qui te pose une question pour avancer dans sa tâche.

Mission : répondre concisément à sa question d'après ce que tu sais (contexte de la conversation, mémoire utilisateur, etc.).

Règles :
- Si tu CONNAIS la réponse → réponds clairement en 1-3 phrases. Pas de markdown lourd.
- Si tu NE SAIS PAS et qu'il faut demander à l'utilisateur → réponds EXACTEMENT en commençant par "ESCALATE_TO_USER:" suivi de la question reformulée pour l'utilisateur.
- N'invoque AUCUN outil. Juste du texte court.
- Ne pose pas de contre-questions au sous-agent — réponds avec ce que tu sais ou escalade.`;

        const userPrompt = `Sous-agent : ${subAgentName}
Question : ${question}${subContext ? '\n\nContexte additionnel fourni par le sous-agent :\n' + subContext : ''}`;

        let answer = '';
        const stream = llm.stream(
          [
            { role: 'system', content: miniSystem },
            { role: 'user', content: userPrompt },
          ],
          [], // pas de tools
        );
        for await (const ev of stream) {
          if (ev.type === 'text_delta') answer += ev.text;
        }
        answer = answer.trim();
        if (!answer) {
          return { ok: false, error: 'empty_parent_response', message: 'Le parent n\'a rien répondu.' };
        }

        // Détecte une escalation utilisateur
        const escalateMatch = answer.match(/^ESCALATE_TO_USER:\s*(.+)$/is);
        const escalated = !!escalateMatch;
        const userQuestion = escalated ? escalateMatch[1].trim() : null;

        // Persist l'échange dans le thread pour visibilité chat (parent↔child déroulé)
        const threadId = ctx?.threadId;
        if (threadId) {
          try {
            const childInfo = {
              agentName: ctx._jobContext?.agentName,
              agentEmoji: ctx._jobContext?.agentEmoji,
              agentColor: ctx._jobContext?.agentColor,
              subagentType: ctx._jobContext?.subagentType,
            };
            // Question (badge subagent)
            const qMsg = await AiMessage.create({
              threadId,
              role: 'assistant',
              content: question,
              metadata: {
                kind: 'parent_child_exchange',
                extra: {
                  exchangeRole: 'question',
                  fromSubagent: true,
                  parentJobId, childJobId: ctx._jobContext.jobId,
                  subagentContext: subContext || undefined,
                  ...childInfo,
                },
              },
            });
            _notifyInlineMessage(threadId, 'parent_child_exchange', qMsg._id);
            // Réponse (badge parent / escalation)
            const aMsg = await AiMessage.create({
              threadId,
              role: 'assistant',
              content: escalated ? `Je ne sais pas — je vais demander à l'utilisateur : « ${userQuestion} »` : answer,
              metadata: {
                kind: 'parent_child_exchange',
                extra: {
                  exchangeRole: 'answer',
                  parentJobId, childJobId: ctx._jobContext.jobId,
                  escalated, userQuestion: userQuestion || undefined,
                  ...childInfo,
                },
              },
            });
            _notifyInlineMessage(threadId, 'parent_child_exchange', aMsg._id);
          } catch (e) {
            console.error('[ask_parent_agent] persist exchange failed:', e?.message);
          }
        }

        if (escalated) {
          return {
            ok: true,
            escalated_to_user: true,
            parent_response: answer,
            user_question: userQuestion,
            hint: `Le parent ne connaît pas la réponse — il suggère de demander à l'utilisateur : "${userQuestion}". Tu peux maintenant appeler ask_user avec cette question.`,
          };
        }
        return {
          ok: true,
          parent_response: answer,
          hint: 'Le parent a répondu. Utilise sa réponse pour continuer ta tâche.',
        };
      } catch (e) {
        console.error('[ask_parent_agent] error:', e?.message);
        return { ok: false, error: e?.message || 'ask_parent_agent failed' };
      }
    }

    case 'send_message_to_agent': {
      const { to, message, summary } = input || {};
      if (!to || !message) return { ok: false, error: 'to + message requis' };
      try {
        const AiJob = require('../../db/models/ai-job.model');
        const { ROSTER } = require('../subagent/roster');
        const fromJobId = ctx?._jobContext?.jobId;
        const fromSubagentType = ctx?._jobContext?.subagentType;
        const fromAgent = fromSubagentType ? ROSTER[fromSubagentType] : null;
        const fromName = fromAgent?.name || (ctx.userId ? 'vous' : 'system');
        const toLower = String(to).toLowerCase().trim();

        // ── DESTINATAIRE = 'user' ou 'utilisateur' ──
        // Le subagent veut parler directement à l'utilisateur humain (pas
        // attendre la fin de sa tâche pour que le résultat soit vu). On crée
        // un AiMessage visible immédiatement dans le chat avec un badge
        // agent pour que l'user sache qui parle.
        if (toLower === 'user' || toLower === 'utilisateur') {
          if (!ctx.threadId) return { ok: false, error: 'threadId manquant pour message à user' };
          if (!fromAgent) return { ok: false, error: "Ce tool ne peut être utilisé que par un subagent pour parler à l'utilisateur." };
          const created = await AiMessage.create({
            threadId: ctx.threadId,
            workspaceId: ctx.workspaceId,
            role: 'assistant',
            content: String(message).slice(0, 4000),
            metadata: {
              kind: 'comment',
              extra: {
                fromSubagent: true,
                subagentJobId: fromJobId,
                subagentType: fromSubagentType,
                agentName: fromAgent.name,
                agentEmoji: fromAgent.emoji,
                agentColor: fromAgent.color,
                agentFigure: fromAgent.figure,
                summary: summary || String(message).slice(0, 80),
              },
            },
          });
          _notifyInlineMessage(ctx.threadId, 'subagent_message', created._id);
          return {
            ok: true,
            delivered: true,
            target: 'user',
            hint: "Message visible dans le chat. Continue ta tâche.",
          };
        }

        // ── DESTINATAIRE = 'parent' ──
        if (toLower === 'parent') {
          const parentId = ctx?._jobContext?.parentJobId;
          if (!parentId) return { ok: false, error: "Pas de job parent (tu es l'agent principal)." };
          await AiJob.updateOne(
            { id: parentId },
            { $push: { pendingMessages: {
                from: `agent:${fromJobId}`,
                fromName,
                message: String(message).slice(0, 8000),
                createdAt: new Date(),
                delivered: false,
              } } }
          );
          try {
            const { emitJobEvent, emitThreadEvent } = require('../jobs/job-events');
            const ev = {
              type: 'subagent.message.received',
              targetJobId: parentId,
              targetName: 'parent',
              fromName,
              fromSubagentType,
              summary: summary || String(message).slice(0, 80),
              at: new Date().toISOString(),
            };
            emitJobEvent(parentId, ev);
            if (ctx.threadId) emitThreadEvent(String(ctx.threadId), ev);
          } catch { /* non-fatal */ }
          return { ok: true, delivered: true, target: 'parent', hint: "Message empilé pour ton parent. Continue ta tâche." };
        }

        // ── DESTINATAIRE = jobId OU nom humain d'un subagent ──
        let targetJob = await AiJob.findOne({ id: to });
        if (!targetJob) {
          const type = Object.entries(ROSTER).find(([, a]) => a.name.toLowerCase() === toLower)?.[0];
          if (type && ctx.threadId) {
            targetJob = await AiJob.findOne({
              threadId: ctx.threadId,
              type: 'subagent',
              subagentType: type,
              status: { $in: ['running', 'waiting_dependency', 'waiting_permission', 'paused', 'queued'] },
            }).sort({ createdAt: -1 });
          }
        }
        if (!targetJob) return { ok: false, error: `Aucun subagent actif "${to}" trouvé dans ce thread. Utilise 'user', 'parent', un jobId ou un nom du roster (Tim, Marie, ...).` };
        if (['completed', 'error', 'cancelled'].includes(targetJob.status)) {
          return { ok: false, error: `Le subagent ${targetJob.id} (${targetJob.status}) est terminé — impossible de lui envoyer un message.` };
        }
        await AiJob.updateOne(
          { id: targetJob.id },
          { $push: { pendingMessages: {
              from: fromJobId ? `agent:${fromJobId}` : 'user',
              fromName,
              message: String(message).slice(0, 8000),
              createdAt: new Date(),
              delivered: false,
            } } }
        );
        try {
          const { emitJobEvent, emitThreadEvent } = require('../jobs/job-events');
          const ev = {
            type: 'subagent.message.received',
            targetJobId: targetJob.id,
            targetName: ROSTER[targetJob.subagentType]?.name || targetJob.subagentType,
            fromName,
            fromSubagentType,
            summary: summary || String(message).slice(0, 80),
            at: new Date().toISOString(),
          };
          emitJobEvent(targetJob.id, ev);
          if (ctx.threadId) emitThreadEvent(String(ctx.threadId), ev);
        } catch { /* non-fatal */ }
        return {
          ok: true,
          delivered: true,
          targetJobId: targetJob.id,
          targetName: ROSTER[targetJob.subagentType]?.name || targetJob.subagentType,
          hint: `Message empilé. Sera délivré à ${ROSTER[targetJob.subagentType]?.name || targetJob.subagentType} au début de son prochain tour LLM.`,
        };
      } catch (e) {
        return { ok: false, error: e?.message || String(e) };
      }
    }

    case 'spawn_subagent': {
      try {
        const { spawnSubagent } = require('../subagent/sub-runner');
        const jc = ctx?._jobContext;

        // ── Anti-doublon : si le même type+prompt a déjà été spawné dans ce
        // tour, on bloque pour éviter les duplications (LLM qui boucle et
        // relance les mêmes subagents). On compare par type+prompt hash.
        if (jc?._spawnedPromptHashes) {
          const promptHash = `${input.subagent_type || 'general'}:${String(input.prompt || '').slice(0, 200)}`;
          if (jc._spawnedPromptHashes.has(promptHash)) {
            console.warn(`[spawn_subagent] DÉDUP : subagent ${input.subagent_type} déjà lancé avec ce prompt, blocage du doublon`);
            return {
              ok: false,
              error: 'spawn_duplicate_blocked',
              message: `Ce subagent (${input.subagent_type}) a déjà été lancé avec ce prompt. Ne re-spawn PAS les mêmes subagents. Termine ce tour avec 1-2 phrases de narration, l'auto-resume te réveillera quand ils auront fini.`,
            };
          }
        }

        // Live preview: emit subagent status.
        // En mode PARALLEL, input.prompt = "placeholder" et input.subagent_type
        // est un placeholder aussi → les vrais agents sont dans input.parallel[].
        // On envoie maintenant un payload riche : typeLabel + promptLabel pour
        // rétro-compat + le tableau `parallel` complet pour que l'UI affiche
        // une vraie liste des sub-agents en cours (avec leur prénom roster,
        // emoji, prompt individuel).
        try {
          const isParallel = Array.isArray(input.parallel) && input.parallel.length > 0;
          let typeLabel;
          let promptLabel;
          let parallelPayload = null;
          if (isParallel) {
            const types = input.parallel.map(p => p?.subagent_type || 'agent').filter(Boolean);
            const uniqueTypes = [...new Set(types)];
            typeLabel = `${input.parallel.length} en parallèle`;
            promptLabel = input.parallel
              .map((p, i) => `[${i + 1}] ${String(p?.prompt || '').slice(0, 200)}`)
              .join('\n')
              .slice(0, 500);
            // Détail par sub-agent (enrichi avec le roster si disponible)
            let roster = null;
            try { roster = require('../subagent/roster'); } catch { /* optionnel */ }
            parallelPayload = input.parallel.map(p => {
              const subagentType = p?.subagent_type || 'agent';
              const info = roster?.getAgent?.(subagentType) || null;
              return {
                subagentType,
                prompt: String(p?.prompt || '').slice(0, 280),
                agentName: info?.name || subagentType,
                agentEmoji: info?.emoji || '🤖',
                agentColor: info?.color || '#999',
                status: 'running',
              };
            });
          } else {
            typeLabel = input.subagent_type || 'general';
            const rawPrompt = String(input.prompt || '');
            // Filtre élargi : le LLM ajoute parfois un suffixe au placeholder
            // ("Placeholder (sera ignoré, voir parallel)", "placeholder - utilisé en parallel", etc.).
            // On détecte tout début par "placeholder" insensible à la casse.
            const isPlaceholder = /^placeholder/i.test(rawPrompt.trim());
            promptLabel = isPlaceholder ? '' : rawPrompt.slice(0, 500);
          }
          const patchOps = [
            { op: 'replace', path: '/subagentType', value: typeLabel },
            { op: 'replace', path: '/prompt', value: promptLabel },
            { op: 'replace', path: '/status', value: 'running' },
          ];
          if (parallelPayload) {
            patchOps.push({ op: 'replace', path: '/parallel', value: parallelPayload });
          }
          ctx?._emit?.({ type: 'ui.preview.update', patch: patchOps });
        } catch { /* non-fatal */ }
        // Permet le spawn même sans job parent — crée un job éphémère si nécessaire
        let parentJobId = jc?.jobId;
        let depth = jc?.depth || 0;
        if (!parentJobId) {
          try {
            const { createJob } = require('../jobs/job-runner');
            const ephemeralParent = await createJob({
              threadId: ctx.threadId,
              workspaceId: ctx.workspaceId,
              userId: ctx.userId,
              companyId: ctx.companyId,
              type: 'agent_run',
              mode: 'chat',
              agentId: ctx.agentId,
            });
            parentJobId = String(ephemeralParent._id);
          } catch (e) {
            return { ok: false, error: `Impossible de créer un job parent éphémère: ${e?.message}` };
          }
        }
        // Force async=true quand depends_on est présent : un subagent qui
        // attend une dépendance DOIT être async, sinon le parent bloque
        // l'agent_run (donc le chat) pendant toute la chaîne. Le LLM oublie
        // souvent de passer async:true → on compense côté backend.
        const hasExplicitDeps = Array.isArray(input.depends_on) && input.depends_on.length > 0;
        const forceAsync = hasExplicitDeps && input.async !== true;
        if (forceAsync) {
          console.warn(`[spawn_subagent] depends_on présent sans async=true → on force async=true pour libérer le chat parent`);
        }
        const res = await spawnSubagent({
          parentJobId,
          subagentType: input.subagent_type || 'general',
          prompt: input.prompt || '',
          maxLoops: input.max_loops,
          contextSlice: input.context_slice || null,
          parallel: Array.isArray(input.parallel) ? input.parallel.map(p => {
            const pHasDeps = Array.isArray(p.depends_on) && p.depends_on.length > 0;
            return {
              subagentType: p.subagent_type,
              prompt: p.prompt,
              // Auto-async quand dep : pareil que le cas principal
              async: p.async === true || pHasDeps,
              depends_on: Array.isArray(p.depends_on) ? p.depends_on : undefined,
              input_from: p.input_from,
            };
          }) : null,
          depth,
          async: input.async === true || forceAsync,
          depends_on: Array.isArray(input.depends_on) ? input.depends_on : undefined,
          input_from: input.input_from,
          parentBroadcast: jc?.broadcast,
        });
        try {
          // Enrichit la live-preview avec les jobIds réels après spawn :
          // - en mode parallel, on patch chaque entry du tableau parallel avec son jobId
          //   pour que le frontend puisse s'abonner aux streams individuels et afficher
          //   les tools/progression de chaque sub-agent en TEMPS RÉEL dans sa card.
          // - le status global passe à 'success' (signifie : tools spawn_subagent a fini
          //   son lancement, les sub-agents tournent maintenant ou ont déjà fini).
          const patchOps = [{ op: 'replace', path: '/status', value: 'success' }];
          const subResults = Array.isArray(res?.results) ? res.results
            : Array.isArray(res) ? res
            : null;
          if (subResults && subResults.length) {
            subResults.forEach((sub, idx) => {
              if (sub?.jobId) {
                patchOps.push({ op: 'replace', path: `/parallel/${idx}/jobId`, value: String(sub.jobId) });
                patchOps.push({ op: 'replace', path: `/parallel/${idx}/status`, value: sub.status || 'running' });
              }
            });
          } else if (res?.jobId) {
            patchOps.push({ op: 'replace', path: '/jobId', value: String(res.jobId) });
          }
          ctx?._emit?.({ type: 'ui.preview.update', patch: patchOps });
        } catch { /* non-fatal */ }
        // Mémorise le prompt hash pour anti-doublon
        if (ctx?._jobContext) {
          if (!ctx._jobContext._spawnedPromptHashes) ctx._jobContext._spawnedPromptHashes = new Set();
          ctx._jobContext._spawnedPromptHashes.add(`${input.subagent_type || 'general'}:${String(input.prompt || '').slice(0, 200)}`);
        }
        // Message d'ATTENTE explicite pour async — empêche le LLM d'essayer
        // de finaliser la tâche lui-même en hallucinant les résultats.
        const wasAsync = res?.async === true || res?.result?.async === true;
        const extraHint = wasAsync ? {
          _wait_for_subagent: true,
          instruction: "🛑 SUBAGENT LANCÉ EN BACKGROUND. NE PAS produire toi-même le livrable final de ce subagent (render_structured, display_file, etc.) — tu n'as PAS encore ses résultats, tu hallucinerais. CONDUITE OBLIGATOIRE : continue uniquement avec d'autres spawn_subagent / todo_write, puis termine ce tour avec 1-2 phrases narratives courtes (\"Subagents lancés, je reviens avec les résultats\"). L'auto-resume te réveillera AVEC les vraies données quand les subagents auront fini.",
        } : {};
        return { ok: true, result: res, ...extraHint };
      } catch (e) {
        try {
          ctx?._emit?.({
            type: 'ui.preview.update',
            patch: [{ op: 'replace', path: '/status', value: 'error' }, { op: 'replace', path: '/error', value: e?.message || String(e) }],
          });
        } catch { /* non-fatal */ }
        return { ok: false, error: e?.message || String(e) };
      }
    }

    case 'research_deep': {
      try {
        const { spawnSubagent } = require('../subagent/sub-runner');
        const jc = ctx?._jobContext;
        let parentJobId = jc?.jobId;
        let depth = jc?.depth || 0;
        if (!parentJobId) {
          try {
            const { createJob } = require('../jobs/job-runner');
            const ephemeralParent = await createJob({
              threadId: ctx.threadId,
              workspaceId: ctx.workspaceId,
              userId: ctx.userId,
              companyId: ctx.companyId,
              type: 'research',
              mode: 'chat',
            });
            parentJobId = String(ephemeralParent._id);
          } catch (e) {
            return { ok: false, error: `Impossible de créer un job parent: ${e?.message}` };
          }
        }
        const res = await spawnSubagent({
          parentJobId,
          subagentType: 'research',
          prompt: `Recherche approfondie: ${input.question}` + (input.scope ? `\nPérimètre: ${input.scope}` : ''),
          maxLoops: Math.min(Math.max((input.depth || 2) * 6, 6), 24),
          depth,
        });
        return { ok: true, result: res };
      } catch (e) {
        return { ok: false, error: e?.message || String(e) };
      }
    }

    case 'render_structured': {
      const validLayouts = ['chips_tabs', 'stepped_plan', 'comparison_table', 'accordion', 'timeline', 'card_grid'];
      if (!input || !validLayouts.includes(input.layout)) {
        return { ok: false, error: `Layout invalide. Valeurs possibles: ${validLayouts.join(', ')}` };
      }
      if (!input.data || typeof input.data !== 'object') {
        // Schémas minimaux par layout — court, pour ne pas exploser le contexte
        const schemas = {
          chips_tabs: '{chips:[{id,label}], tabs:[{chipId, content:{blocks:[{type:"text", content}]}}]}',
          stepped_plan: '{steps:[{id, title, description, duration?}]}',
          comparison_table: '{columns:[{key, header}], rows:[{label, <key1>, <key2>...}]}',
          accordion: '{sections:[{id, title, content}]}',
          timeline: '{events:[{date, title, description}]}',
          card_grid: '{cards:[{title, description, ...}]}',
        };
        return {
          ok: false,
          error: `Champ "data" manquant. Format pour layout=${input?.layout} : data = ${schemas[input?.layout] || schemas.card_grid}. Rappelle le tool avec data rempli.`,
        };
      }
      // Shape validation per layout
      const d = input.data;
      const shapeErr = (() => {
        switch (input.layout) {
          case 'chips_tabs':
            if (!Array.isArray(d.chips) || !Array.isArray(d.tabs)) return 'chips_tabs requiert data.chips[] et data.tabs[]';
            return null;
          case 'stepped_plan':
            if (!Array.isArray(d.steps) || !d.steps.length) return 'stepped_plan requiert data.steps[] non vide';
            return null;
          case 'comparison_table':
            if (!Array.isArray(d.columns) || !Array.isArray(d.rows)) return 'comparison_table requiert data.columns[] et data.rows[]';
            return null;
          case 'accordion':
            if (!Array.isArray(d.sections) || !d.sections.length) return 'accordion requiert data.sections[] non vide';
            return null;
          case 'timeline':
            if (!Array.isArray(d.events) || !d.events.length) return 'timeline requiert data.events[] non vide';
            return null;
          case 'card_grid':
            if (!Array.isArray(d.cards) || !d.cards.length) return 'card_grid requiert data.cards[] non vide';
            return null;
          default:
            return 'Layout inconnu';
        }
      })();
      if (shapeErr) return { ok: false, error: shapeErr };
      if (!ctx.threadId) return { ok: false, error: 'threadId manquant (render_structured doit être utilisé dans un thread actif).' };
      try {
        const widgetId = _resolveWidgetId(input.widgetId);
        const collapsed = input.collapsed === true;
        const collapseTitle = input.collapseTitle ? String(input.collapseTitle).slice(0, 200) : null;
        const structuredPayload = {
          layout: input.layout,
          title: input.title || '',
          data: input.data,
          renderedAt: new Date(),
        };
        const collapseMeta = { collapsed, ...(collapseTitle ? { collapseTitle } : {}) };
        let doc;
        const existing = await _findWidgetByWidgetId(ctx.threadId, widgetId);
        if (existing) {
          existing.content = input.title || '';
          existing.metadata = {
            ...(existing.metadata?.toObject?.() || existing.metadata || {}),
            kind: 'structured',
            structured: structuredPayload,
            widgetId,
            widgetUpdatedAt: new Date(),
            collapse: collapseMeta,
          };
          await existing.save();
          doc = existing;
          _notifyInlineUpdate(ctx.threadId, String(doc._id), 'structured');
          return { ok: true, _silent: true, layout: input.layout, widgetId, updated: true, messageId: String(doc._id),
            inlineMarker: `[[WIDGET:${widgetId}]]`,
            hint: `Widget mis à jour in-place. Insère [[WIDGET:${widgetId}]] dans ton texte à l'endroit où tu veux qu'il apparaisse.` };
        }
        doc = await AiMessage.create({
          threadId: ctx.threadId,
          workspaceId: ctx.workspaceId,
          role: 'assistant',
          content: input.title || '',
          metadata: {
            kind: 'structured',
            structured: structuredPayload,
            collapse: collapseMeta,
            widgetId,
            widgetUpdatedAt: new Date(),
            ...(ctx._jobContext?.jobId ? { subagentJobId: String(ctx._jobContext.jobId) } : {}),
          },
        });
        _notifyInlineMessage(ctx.threadId, 'structured', doc._id);
        return {
          ok: true,
          _silent: true,
          layout: input.layout,
          widgetId,
          messageId: String(doc._id),
          inlineMarker: `[[WIDGET:${widgetId}]]`,
          hint: `Widget créé (widgetId=${widgetId}). Insère [[WIDGET:${widgetId}]] sur sa propre ligne dans ton texte à l'endroit exact où tu veux qu'il apparaisse. NE RECOPIE AUCUN contenu du widget dans ton texte.`,
        };
      } catch (e) {
        return { ok: false, error: e?.message || String(e) };
      }
    }

    case 'propose_plan': {
      if (!ctx.threadId) return { ok: false, error: 'threadId manquant' };
      if (!input?.summary || !Array.isArray(input?.steps) || !input.steps.length) {
        return { ok: false, error: 'summary + steps[] requis' };
      }
      const { randomUUID } = require('crypto');
      const requestId = randomUUID();
      const missingInfo = Array.isArray(input.missing_info)
        ? input.missing_info
            .filter(m => m && typeof m === 'object' && typeof m.key === 'string' && typeof m.question === 'string')
            .map(m => ({ key: m.key, question: m.question, why: m.why || '' }))
        : [];
      try {
        await AiMessage.create({
          threadId: ctx.threadId,
          workspaceId: ctx.workspaceId,
          role: 'assistant',
          content: input.summary || 'Plan proposé',
          metadata: {
            kind: 'plan_proposal',
            planProposal: {
              requestId,
              summary: input.summary,
              steps: input.steps,
              risks: Array.isArray(input.risks) ? input.risks : [],
              ...(missingInfo.length ? { missingInfo } : {}),
            },
          },
        });
      } catch (e) {
        return { ok: false, error: `Impossible d'enregistrer le plan: ${e?.message}` };
      }
      // Emit SSE event so the frontend can surface the plan card
      const jc = ctx._jobContext;
      if (jc?.broadcast) {
        jc.broadcast({
          type: 'ai.plan.request',
          requestId,
          summary: input.summary,
          stepCount: input.steps.length,
          missingInfoCount: missingInfo.length,
        });
      }
      // Pause agent loop when running inside a job
      if (jc?.waitForPlanApproval) {
        const decision = await jc.waitForPlanApproval(requestId, 600000);
        return {
          ok: true,
          requestId,
          decision: decision.decision,
          approvedSteps: decision.approvedSteps || [],
          modifiedSteps: decision.modifiedSteps || null,
          missingInfoAnswers: decision.missingInfoAnswers || {},
        };
      }
      return {
        ok: true,
        pending: true,
        requestId,
        message: 'Plan proposé à l\'utilisateur — attente réponse.',
      };
    }

    case 'generate_diagram': {
      if (!input?.type || !input?.mermaid) {
        return { ok: false, error: 'type + mermaid requis' };
      }
      const expectedStart = {
        flowchart: /^(flowchart|graph)\s/,
        sequence: /^sequenceDiagram/,
        class: /^classDiagram/,
        state: /^stateDiagram/,
        er: /^erDiagram/,
        gantt: /^gantt/,
        mindmap: /^mindmap/,
        journey: /^journey/,
        timeline: /^timeline/,
        pie: /^pie/,
      };
      const re = expectedStart[input.type];
      const code = String(input.mermaid).trim();
      if (re && !re.test(code)) {
        return { ok: false, error: `Syntaxe Mermaid invalide pour type ${input.type}. Le code doit commencer par le mot-clé attendu.` };
      }
      // Validation pré-rendu : détecte les erreurs courantes AVANT d'afficher.
      // Si invalide, retourne une erreur actionnable à l'agent pour qu'il corrige.
      const validationIssue = _validateMermaidSyntax(input.type, code);
      if (validationIssue) {
        return {
          ok: false,
          error: `Mermaid invalide : ${validationIssue}. Corrige le code et rappelle generate_diagram. RAPPEL : pas de \\n littéral dans les labels, utilise <br/> ou un nouveau node. Échappe les caractères spéciaux avec des quotes autour du texte.`,
        };
      }
      const safe = code.replace(/&/g, '&amp;').replace(/</g, '&lt;');
      const previewHtml = `<div class="mermaid-wrap"><pre class="mermaid">${safe}</pre></div>`;
      const title = input.title || `Diagramme ${input.type}`;
      // Emit canvas side event — front render via mermaid.js
      const emitFn = ctx._emit;
      const sideEvent = {
        type: 'canvas.document.update',
        format: 'mermaid',
        title,
        previewHtml,
        rawMermaid: code,
      };
      if (typeof emitFn === 'function') emitFn(sideEvent);
      else if (Array.isArray(ctx._sideEvents)) ctx._sideEvents.push(sideEvent);
      // Persist a bubble in the chat
      const widgetId = input.widgetId ? String(input.widgetId).slice(0, 60) : null;
      const collapsed = input.collapsed === true;
      const collapseTitle = input.collapseTitle ? String(input.collapseTitle).slice(0, 200) : null;
      const collapseMeta = { collapsed, ...(collapseTitle ? { collapseTitle } : {}) };
      let diagramDoc = null;
      try {
        if (widgetId) {
          const existing = await _findWidgetByWidgetId(ctx.threadId, widgetId);
          if (existing) {
            existing.content = title;
            existing.metadata = {
              ...(existing.metadata?.toObject?.() || existing.metadata || {}),
              kind: 'diagram',
              diagram: { type: input.type, title, mermaid: code },
              widgetId,
              widgetUpdatedAt: new Date(),
              collapse: collapseMeta,
            };
            await existing.save();
            diagramDoc = existing;
            _notifyInlineUpdate(ctx.threadId, String(existing._id), 'diagram');
          }
        }
        if (!diagramDoc) {
          diagramDoc = await AiMessage.create({
            threadId: ctx.threadId,
            workspaceId: ctx.workspaceId,
            role: 'assistant',
            content: title,
            metadata: {
              kind: 'diagram',
              diagram: { type: input.type, title, mermaid: code },
              collapse: collapseMeta,
              ...(widgetId ? { widgetId, widgetUpdatedAt: new Date() } : {}),
              ...(ctx._jobContext?.jobId ? { subagentJobId: String(ctx._jobContext.jobId) } : {}),
            },
          });
          _notifyInlineMessage(ctx.threadId, 'diagram', doc._id);
        }
      } catch (e) {
        console.warn('[generate_diagram] AiMessage persist error:', e?.message);
      }
      return {
        ok: true,
        _silent: true,
        type: input.type,
        title,
        widgetId: widgetId || (diagramDoc ? String(diagramDoc._id) : null),
        messageId: diagramDoc ? String(diagramDoc._id) : null,
        inlineMarker: widgetId ? `[[WIDGET:${widgetId}]]` : null,
        hint: widgetId
          ? `Diagramme affiché. Insère [[WIDGET:${widgetId}]] sur sa propre ligne dans ton texte. NE RECOPIE PAS le code Mermaid.`
          : "Diagramme affiché. NE RECOPIE PAS le code Mermaid. Pour l'ancrer inline, rappelle avec widgetId.",
      };
    }

    case 'install_package': {
      const { language, package: pkg, version, reason } = input || {};
      if (!['python', 'node'].includes(language)) return { ok: false, error: 'language doit être "python" ou "node"' };
      if (!pkg || typeof pkg !== 'string') return { ok: false, error: 'package requis' };
      // Validation stricte du nom (aucune injection shell possible)
      if (!/^[@a-zA-Z0-9_\-./]+$/.test(pkg)) return { ok: false, error: 'Nom de package invalide (caractères autorisés: lettres, chiffres, _, -, ., /, @)' };
      if (version && !/^[a-zA-Z0-9_.\-~^<>=*]+$/.test(version)) return { ok: false, error: 'Version invalide' };

      const mode = String(process.env.AI_PACKAGE_INSTALL_MODE || 'ask').toLowerCase();
      if (mode === 'blocked') return { ok: false, error: 'Installation de packages désactivée par l\'administrateur (AI_PACKAGE_INSTALL_MODE=blocked).' };

      // Blacklist admin + défaut (packages potentiellement dangereux)
      const adminBlacklist = (process.env.AI_PACKAGE_BLACKLIST || '').split(',').map(s => s.trim()).filter(Boolean);
      const defaultBlacklist = ['shelljs', 'node-shell', 'execa-shell'];
      const fullBlacklist = new Set([...adminBlacklist, ...defaultBlacklist]);
      if (fullBlacklist.has(pkg)) return { ok: false, error: `Package "${pkg}" blacklisté par l'admin.` };

      // Whitelist admin optionnelle
      const whitelist = (process.env.AI_PACKAGE_WHITELIST || '').split(',').map(s => s.trim()).filter(Boolean);
      if (whitelist.length && !whitelist.includes(pkg)) {
        return { ok: false, error: `Package "${pkg}" pas dans la whitelist admin. Demande à l'admin de l'ajouter à AI_PACKAGE_WHITELIST pour installer ce package.` };
      }

      // Cap: max N installs par jour/workspace (configurable)
      const maxPerDay = parseInt(process.env.AI_PACKAGE_INSTALL_MAX_PER_DAY || '20', 10);
      // Note: compteur simple en mémoire process — pour du prod, utiliser Redis/Mongo
      if (!global.__aiPackageInstallCounter) global.__aiPackageInstallCounter = { count: 0, day: new Date().toDateString() };
      const ctr = global.__aiPackageInstallCounter;
      const today = new Date().toDateString();
      if (ctr.day !== today) { ctr.count = 0; ctr.day = today; }
      if (ctr.count >= maxPerDay) return { ok: false, error: `Limite de ${maxPerDay} installs/jour atteinte.` };

      const { spawn } = require('child_process');
      const path = require('path');
      const fs = require('fs');
      const os = require('os');
      // CRITIQUE : on utilise `python -m pip` avec le MÊME interpréteur que la sandbox
      // (AI_SANDBOX_PYTHON). Et on install vers un `site-packages` dédié + partagé
      // entre install et run (PYTHONPATH du subprocess-sandbox). Sinon sur macOS,
      // le package peut être installé dans user site mais invisible au runtime
      // (HOME modifié par la sandbox pour l'isolation).
      const pythonBin = process.env.AI_SANDBOX_PYTHON || 'python3';
      const pipOverride = process.env.AI_SANDBOX_PIP; // optionnel, bypass si vraiment nécessaire
      const npmBin = process.env.AI_SANDBOX_NPM || 'npm';
      const sharedPyTarget = process.env.AI_SANDBOX_PY_SITE_PACKAGES
        || path.join(os.tmpdir(), 'kinn-sandbox-pkgs', 'python');
      try { fs.mkdirSync(sharedPyTarget, { recursive: true }); } catch { /* non-fatal */ }
      const sharedNodeTarget = process.env.AI_SANDBOX_NODE_MODULES
        || path.join(os.tmpdir(), 'kinn-sandbox-pkgs', 'node');
      try { fs.mkdirSync(sharedNodeTarget, { recursive: true }); } catch { /* non-fatal */ }
      const cmdArgs = language === 'python'
        ? (pipOverride
            ? [pipOverride, 'install', '--target', sharedPyTarget, '--upgrade', '--no-input', '--quiet', version ? `${pkg}==${version}` : pkg]
            : [pythonBin, '-m', 'pip', 'install', '--target', sharedPyTarget, '--upgrade', '--no-input', '--quiet', version ? `${pkg}==${version}` : pkg])
        : [npmBin, 'install', '--prefix', sharedNodeTarget, '--silent', version ? `${pkg}@${version}` : pkg];

      return new Promise((resolve) => {
        const child = spawn(cmdArgs[0], cmdArgs.slice(1), {
          env: { ...process.env, PIP_BREAK_SYSTEM_PACKAGES: '1', npm_config_yes: 'true' },
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        let stdout = '', stderr = '';
        const killTimer = setTimeout(() => { try { child.kill('SIGKILL'); } catch {} }, 180_000);
        child.stdout.on('data', d => { stdout += d.toString(); if (stdout.length > 8000) stdout = stdout.slice(-8000); });
        child.stderr.on('data', d => { stderr += d.toString(); if (stderr.length > 8000) stderr = stderr.slice(-8000); });
        child.on('error', (e) => { clearTimeout(killTimer); resolve({ ok: false, error: `spawn: ${e.message}` }); });
        child.on('close', (code) => {
          clearTimeout(killTimer);
          if (code === 0) {
            ctr.count++;
            resolve({
              ok: true,
              language,
              package: pkg,
              version: version || 'latest',
              reason: reason || null,
              message: `Package ${pkg}${version ? `@${version}` : ''} installé (${language}). Tu peux maintenant le require/import dans execute_code.`,
              stdoutTail: stdout.slice(-1000),
            });
          } else {
            resolve({
              ok: false,
              error: `Installation échouée (exit ${code})`,
              stderrTail: stderr.slice(-1500),
              hint: "Essaie un autre package ou vérifie l'orthographe. Les registries utilisés sont pypi.org pour python et npmjs.com pour node.",
            });
          }
        });
      });
    }

    case 'display_image': {
      if (!ctx.threadId) return { ok: false, error: 'threadId manquant' };
      const { fileId, url, caption, alt } = input || {};
      if (!fileId && !url) return { ok: false, error: 'fileId ou url requis' };
      try {
        const widgetId = _resolveWidgetId(input.widgetId);
        const collapsed = input.collapsed === true;
        const collapseTitle = input.collapseTitle ? String(input.collapseTitle).slice(0, 200) : null;
        const collapseMeta = { collapsed, ...(collapseTitle ? { collapseTitle } : {}) };
        const imagePayload = {
          fileId: fileId || null,
          url: url || null,
          caption: caption || null,
          alt: alt || 'image',
        };
        let doc;
        const existing = await _findWidgetByWidgetId(ctx.threadId, widgetId);
        if (existing) {
          existing.content = caption || '';
          existing.metadata = {
            ...(existing.metadata?.toObject?.() || existing.metadata || {}),
            kind: 'image_inline',
            imageInline: imagePayload,
            widgetId,
            widgetUpdatedAt: new Date(),
            collapse: collapseMeta,
          };
          await existing.save();
          doc = existing;
          _notifyInlineUpdate(ctx.threadId, String(doc._id), 'image_inline');
        } else {
          doc = await AiMessage.create({
            threadId: ctx.threadId,
            workspaceId: ctx.workspaceId,
            role: 'assistant',
            content: caption || '',
            metadata: {
              kind: 'image_inline',
              imageInline: imagePayload,
              widgetId,
              widgetUpdatedAt: new Date(),
              collapse: collapseMeta,
              ...(ctx._jobContext?.jobId ? { subagentJobId: String(ctx._jobContext.jobId) } : {}),
            },
          });
          _notifyInlineMessage(ctx.threadId, 'image_inline', doc._id);
        }
        return {
          ok: true,
          _silent: true,
          widgetId,
          messageId: String(doc._id),
          inlineMarker: `[[WIDGET:${widgetId}]]`,
          hint: `Image affichée. Insère [[WIDGET:${widgetId}]] sur sa propre ligne dans ton texte. Pas de description redondante.`,
        };
      } catch (e) {
        return { ok: false, error: e?.message };
      }
    }

    case 'display_file': {
      if (!ctx.threadId) return { ok: false, error: 'threadId manquant' };
      const { fileId, caption } = input || {};
      if (!fileId) return { ok: false, error: 'fileId requis' };
      try {
        // ── Anti-doublon : si ce fileId est déjà affiché dans le thread dans les
        // 30 dernières secondes (et que le LLM ne passe pas un widgetId explicite
        // qui forcerait l'update), on retourne silencieusement le widget existant.
        // Pattern observé en prod : LLM appelle display_file 2× pour le même fileId
        // avec des widgetId différents → 2 widgets visibles pour le même fichier.
        if (!input.widgetId) {
          const RECENT_THRESHOLD_MS = 30_000;
          const recentlySince = new Date(Date.now() - RECENT_THRESHOLD_MS);
          const dup = await AiMessage.findOne({
            threadId: ctx.threadId,
            'metadata.kind': 'file_inline',
            'metadata.fileInline.fileId': fileId,
            createdAt: { $gt: recentlySince },
          }, '_id metadata.widgetId').sort({ createdAt: -1 }).lean();
          if (dup) {
            const dupWidgetId = dup.metadata?.widgetId || `dup_${dup._id}`;
            console.log(`[meta-tools] display_file dedup: fileId=${fileId} already shown recently (msgId=${dup._id}, widgetId=${dupWidgetId})`);
            return {
              ok: true,
              _silent: true,
              widgetId: dupWidgetId,
              messageId: String(dup._id),
              inlineMarker: `[[WIDGET:${dupWidgetId}]]`,
              hint: `Fichier déjà affiché récemment dans le chat (widgetId=${dupWidgetId}). Insère [[WIDGET:${dupWidgetId}]] dans ton texte. PAS DE NOUVEL APPEL display_file pour ce fichier.`,
              deduplicated: true,
            };
          }
        }
        const FileRecord = require('../../db/models/file.model');
        const file = await FileRecord.findOne({ id: fileId }) || (require('mongoose').Types.ObjectId.isValid(fileId) ? await FileRecord.findById(fileId) : null);
        if (!file) return { ok: false, error: `Fichier ${fileId} introuvable` };
        const mime = (file.mimeType || '').toLowerCase();
        const ext = (file.name || '').toLowerCase().split('.').pop();
        let kind = 'other';
        if (mime.includes('wordprocessingml') || ext === 'docx') kind = 'docx';
        else if (mime.includes('spreadsheetml') || ext === 'xlsx') kind = 'xlsx';
        else if (mime.includes('presentationml') || ext === 'pptx') kind = 'pptx';
        else if (mime === 'application/pdf' || ext === 'pdf') kind = 'pdf';
        if (kind === 'other') {
          return { ok: false, error: `Type non supporté pour display_file (${mime || ext}). Utilise display_image pour les images.` };
        }
        const widgetId = _resolveWidgetId(input.widgetId);
        const collapsed = input.collapsed === true;
        const collapseTitle = input.collapseTitle ? String(input.collapseTitle).slice(0, 200) : null;
        const collapseMeta = { collapsed, ...(collapseTitle ? { collapseTitle } : {}) };
        const filePayload = {
          fileId: file.id,
          name: file.name,
          mimeType: file.mimeType,
          size: file.size,
          caption: caption || null,
          kind,
        };
        let doc;
        const existing = await _findWidgetByWidgetId(ctx.threadId, widgetId);
        if (existing) {
          existing.content = caption || file.name || '';
          existing.metadata = {
            ...(existing.metadata?.toObject?.() || existing.metadata || {}),
            kind: 'file_inline',
            fileInline: filePayload,
            widgetId,
            widgetUpdatedAt: new Date(),
            collapse: collapseMeta,
          };
          await existing.save();
          doc = existing;
          _notifyInlineUpdate(ctx.threadId, String(doc._id), 'file_inline');
        } else {
          doc = await AiMessage.create({
            threadId: ctx.threadId,
            workspaceId: ctx.workspaceId,
            role: 'assistant',
            content: caption || file.name || '',
            metadata: {
              kind: 'file_inline',
              fileInline: filePayload,
              widgetId,
              widgetUpdatedAt: new Date(),
              collapse: collapseMeta,
              ...(ctx._jobContext?.jobId ? { subagentJobId: String(ctx._jobContext.jobId) } : {}),
            },
          });
          _notifyInlineMessage(ctx.threadId, 'file_inline', doc._id);
        }
        return {
          ok: true,
          _silent: true,
          widgetId,
          messageId: String(doc._id),
          inlineMarker: `[[WIDGET:${widgetId}]]`,
          hint: `Fichier ${kind} affiché. Insère [[WIDGET:${widgetId}]] sur sa propre ligne dans ton texte.`,
        };
      } catch (e) {
        return { ok: false, error: e?.message };
      }
    }

    case 'render_interactive_canvas': {
      if (!ctx.threadId) return { ok: false, error: 'threadId manquant' };
      const { html, title, description, height, type } = input || {};
      if (!html || typeof html !== 'string') return { ok: false, error: 'html requis (document HTML complet)' };
      // Taille raisonnable : 400KB max pour éviter de stocker des payloads géants
      if (html.length > 400_000) return { ok: false, error: 'html trop volumineux (>400KB). Minimise le code ou charge via CDN.' };
      // Validation syntaxe JS des blocs <script> inline (non-module). Détecte les
      // erreurs classiques d'OpenAI (parens mal fermées, apostrophes non échappées,
      // template literals cassés) AVANT de stocker un canvas qui va planter en
      // runtime avec "Unexpected token ')'" côté user.
      const syntaxErr = _validateInlineScripts(html);
      if (syntaxErr) {
        return {
          ok: false,
          error: `js_syntax_error: ${syntaxErr.message}`,
          hint: `Le JS inline du canvas a une erreur de syntaxe (${syntaxErr.line ? 'ligne ~' + syntaxErr.line : 'position inconnue'}). Extrait : "${syntaxErr.snippet}". CAUSES FRÉQUENTES : (1) apostrophe française non échappée dans une string (ex: 'L\\'utilisateur' au lieu de "L\\'utilisateur"), (2) backticks/template literals mal fermés : préfère 'str'+var+'str', (3) parenthèses déséquilibrées dans une arrow function, (4) trailing comma dans un appel de fonction. Régénère en appliquant les règles anti-erreurs de la description du tool.`,
        };
      }
      const safeHeight = Math.max(200, Math.min(900, Number(height) || 420));
      try {
        const widgetId = _resolveWidgetId(input.widgetId);
        const collapsed = input.collapsed === true;
        const collapseTitle = input.collapseTitle ? String(input.collapseTitle).slice(0, 200) : null;
        const collapseMeta = { collapsed, ...(collapseTitle ? { collapseTitle } : {}) };
        const canvasPayload = {
          html,
          title: title || null,
          description: description || null,
          height: safeHeight,
          type: ['2d', '3d', 'animation', 'demo'].includes(type) ? type : 'demo',
        };
        let doc;
        const existing = await _findWidgetByWidgetId(ctx.threadId, widgetId);
        if (existing) {
          existing.content = title || '';
          existing.metadata = {
            ...(existing.metadata?.toObject?.() || existing.metadata || {}),
            kind: 'canvas_html',
            canvasHtml: canvasPayload,
            widgetId,
            widgetUpdatedAt: new Date(),
            collapse: collapseMeta,
          };
          await existing.save();
          doc = existing;
          _notifyInlineUpdate(ctx.threadId, String(doc._id), 'canvas_html');
        } else {
          doc = await AiMessage.create({
            threadId: ctx.threadId,
            workspaceId: ctx.workspaceId,
            role: 'assistant',
            content: title || '',
            metadata: {
              kind: 'canvas_html',
              canvasHtml: canvasPayload,
              widgetId,
              widgetUpdatedAt: new Date(),
              collapse: collapseMeta,
              ...(ctx._jobContext?.jobId ? { subagentJobId: String(ctx._jobContext.jobId) } : {}),
            },
          });
          _notifyInlineMessage(ctx.threadId, 'canvas_html', doc._id);
        }
        return {
          ok: true,
          _silent: true,
          widgetId,
          messageId: String(doc._id),
          inlineMarker: `[[WIDGET:${widgetId}]]`,
          hint: `Canvas affiché. Insère [[WIDGET:${widgetId}]] sur sa propre ligne dans ton texte. Ne décris pas le contenu, l'utilisateur le voit.`,
        };
      } catch (e) {
        return { ok: false, error: e?.message };
      }
    }

    default:
      return { error: `Unknown meta-tool: ${name}` };
  }
}

// Validation Mermaid stricte : détecte les pièges qui cassent le parser client
function _validateMermaidSyntax(type, code) {
  if (typeof code !== 'string' || !code.trim()) return 'code vide';
  const labelBlocks = code.match(/\[[^\]]*\]|\{[^}]*\}|\(\([^)]*\)\)|\([^)]*\)/g) || [];
  for (const block of labelBlocks) {
    if (block.includes('\\n')) return 'labels contiennent "\\n" littéral, remplace par " " ou scinde en plusieurs nodes';
    if (/\n/.test(block)) return 'labels multilignes détectés, remplace les retours à la ligne par " "';
    const inner = block.slice(1, -1);
    const hasQuotes = /^".*"$/.test(inner.trim());
    if (!hasQuotes) {
      // Les caractères suivants cassent systématiquement Mermaid dans un label non quoté
      if (/[()\[\]{}<>]/.test(inner)) {
        return `caractères spéciaux non quotés dans un label (${block.slice(0, 60)}...). Entoure le texte de guillemets : A["texte avec (parenthèses)"]`;
      }
      if (/[:;]/.test(inner) && inner.length > 5) {
        return `ponctuation ":" ou ";" non quotée dans (${block.slice(0, 60)}...). Utilise A["texte : valeur"]`;
      }
    }
  }
  if (type === 'flowchart' && /^flowchart\s*$/m.test(code)) {
    return 'flowchart sans direction, ajoute TD/LR/BT/RL (ex: "flowchart TD")';
  }
  return null;
}

// Resolve the linked project element (flow or form) from context metadata
function _resolveProjectElement(ctx) {
  // ctx is enriched by agent-runner with metadata from the thread
  if (ctx._metadata?.flowId) return { type: 'flow', id: String(ctx._metadata.flowId) };
  if (ctx._metadata?.formId) return { type: 'form', id: String(ctx._metadata.formId) };
  return null;
}

// Expose a merged definitions array so capsules / tool-groups can surface all
// tier-1 tools (including skill_* tools) without touching individual files.
const ALL_META_TOOL_DEFINITIONS = [...META_TOOL_DEFINITIONS, ...SKILL_META_TOOL_DEFINITIONS];

module.exports = {
  META_TOOL_DEFINITIONS,
  SKILL_META_TOOL_DEFINITIONS,
  ALL_META_TOOL_DEFINITIONS,
  executeMetaTool,
};
