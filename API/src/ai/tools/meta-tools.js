// Meta-tools — Tier 1 tools always available to the AI agent
const { toolIndex } = require('./tool-index');
const { executeTool } = require('./tool-executor');
const { argsToJsonSchema, extractOutputSchema } = require('./tool-converter');
const NodeTemplate = require('../../db/models/node-template.model');
const Credential = require('../../db/models/credential.model');
const Provider = require('../../db/models/provider.model');
const Flow = require('../../db/models/flow.model');
const AiUserContext = require('../../db/models/ai-user-context.model');

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
    description: 'Pose une question structurée à l\'utilisateur avec des choix ou en texte libre. Utilise quand tu as besoin de clarification.',
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'La question à poser' },
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
      },
      required: ['text', 'questionType'],
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
    name: 'save_memory',
    description: 'Sauvegarde une information dans la mémoire persistante de l\'utilisateur. Utilise pour retenir des préférences ou des informations utiles.',
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
    description: 'Récupère la mémoire persistante de l\'utilisateur (préférences, informations retenues).',
    parameters: { type: 'object', properties: {} },
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
];

// Execute a meta-tool by name
async function executeMetaTool(name, input, ctx) {
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
      return await executeTool(input.key, input.args || {}, {
        workspaceId: ctx.workspaceId,
        companyId: ctx.companyId,
        userId: ctx.userId,
      });
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
        'id name description status enabled'
      ).limit(limit).lean();
      return flows.map(f => ({ id: f.id, name: f.name, description: f.description || '', status: f.status, enabled: f.enabled }));
    }

    case 'run_workflow': {
      // Delegate to the engine — will be integrated with run system
      return { status: 'not_implemented', message: 'Workflow execution via AI will be available soon' };
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

    default:
      return { error: `Unknown meta-tool: ${name}` };
  }
}

module.exports = { META_TOOL_DEFINITIONS, executeMetaTool };
