// Skill meta-tools — expose the SKILL.md registry to the AI agent.
//
// Three tools:
//   - skill_list({runtime?, query?})      → catalog for discovery
//   - skill_get({name})                   → full markdown body (so the agent can
//                                            read the authoritative instructions)
//   - skill_execute({name, input, files?}) → sandbox execution, returns fileRef
//                                            when the skill produces a file.
//
// These tools are imported from `meta-tools.js` so the rest of the agent
// runtime doesn't need to change.

const { listSkills, getSkill } = require('../skills/skill-loader');
const { executeSkill } = require('../skills/skill-executor');

const SKILL_META_TOOL_DEFINITIONS = [
  {
    name: 'skill_list',
    description:
      "Liste les skills disponibles dans le bundle Homeport (documents, présentations, HTML, sites web, etc.). "
      + "Chaque skill est décrit par un fichier SKILL.md (frontmatter + instructions). Utilise ce tool pour "
      + "découvrir les skills puis `skill_get` pour lire les instructions complètes avant d'appeler `skill_execute`.",
    parameters: {
      type: 'object',
      properties: {
        runtime: { type: 'string', enum: ['node', 'python', 'shell'], description: 'Filtrer par runtime.' },
        query:   { type: 'string', description: 'Recherche libre dans name/description/tags.' },
      },
    },
  },
  {
    name: 'skill_get',
    description:
      "Récupère la description complète d'un skill : frontmatter (runtime, entrypoint, mimeType, etc.) + "
      + "corps markdown avec instructions détaillées, schéma d'entrée, exemples, limitations. "
      + "Lis TOUJOURS le SKILL.md avant d'appeler `skill_execute`.",
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nom du skill (ex: pptx-create, pptx-designed, docx-create).' },
      },
      required: ['name'],
    },
  },
  {
    name: 'skill_execute',
    description:
      "Exécute un skill dans la sandbox. Le skill reçoit `input` (JSON) sur stdin et écrit un fichier "
      + "dans /workspace/out/. Retourne un fileRef ({fileId, name, size, mimeType}) utilisable par l'utilisateur.",
    parameters: {
      type: 'object',
      properties: {
        name:  { type: 'string', description: 'Nom du skill à exécuter.' },
        input: { type: 'object', description: 'Spec JSON envoyée sur stdin — voir SKILL.md pour le schéma.' },
        files: {
          type: 'array',
          description: 'Fichiers d\'entrée à stager sous /workspace/in/<path>.',
          items: {
            type: 'object',
            properties: {
              path:   { type: 'string' },
              fileId: { type: 'string' },
            },
            required: ['path', 'fileId'],
          },
        },
      },
      required: ['name', 'input'],
    },
  },
];

async function executeSkillMetaTool(name, input, ctx) {
  switch (name) {
    case 'skill_list': {
      const items = listSkills({ runtime: input?.runtime, query: input?.query });
      return { items, count: items.length };
    }

    case 'skill_get': {
      if (!input?.name) return { error: 'missing_name' };
      const skill = getSkill(input.name);
      if (!skill) return { error: `unknown_skill:${input.name}` };
      return {
        name: skill.name,
        description: skill.description,
        runtime: skill.runtime,
        entrypoint: skill.entrypoint,
        version: skill.version,
        license: skill.license,
        mimeType: skill.mimeType,
        outputExt: skill.outputExt,
        tools: skill.tools,
        tags: skill.tags,
        allowNetwork: skill.allowNetwork,
        body: skill.body,
      };
    }

    case 'skill_execute': {
      if (!input?.name) return { error: 'missing_name' };
      if (input.input != null && typeof input.input !== 'object') {
        return { error: 'input_must_be_object' };
      }
      try {
        const result = await executeSkill({
          skillName: input.name,
          input: input.input || {},
          inputFiles: Array.isArray(input.files) ? input.files : [],
          workspaceId: ctx?.workspaceId,
          companyId: ctx?.companyId,
          threadId: ctx?._metadata?.threadId || ctx?.threadId,
          uploadedBy: ctx?.userId ? String(ctx.userId) : 'ai-agent',
          emit: ctx?.emit,
        });
        return result;
      } catch (e) {
        return {
          error: e.message || String(e),
          stderr: e.stderr || null,
          stdout: e.stdout || null,
          exitCode: e.exitCode != null ? e.exitCode : null,
        };
      }
    }

    default:
      return { error: `unknown_skill_meta_tool:${name}` };
  }
}

const SKILL_META_TOOL_NAMES = new Set(SKILL_META_TOOL_DEFINITIONS.map((t) => t.name));

module.exports = {
  SKILL_META_TOOL_DEFINITIONS,
  SKILL_META_TOOL_NAMES,
  executeSkillMetaTool,
};
