const Tool = require('../db/models/tool.model');

const DEFAULT_TOOLS = [
  // Args agent tools
  { name: 'get_node_info', label: 'Infos du nœud', description: "Infos du nœud (nom, description, template)", logo: '', component: '' },
  { name: 'get_node_schema', label: 'Schéma des arguments', description: "Schéma d'arguments du nœud", logo: '', component: '' },
  { name: 'list_predecessors', label: 'Lister les prédécesseurs', description: 'Liste des nœuds précédents', logo: '', component: '' },
  { name: 'get_scenarios', label: 'Lister le(s) scénario(s)', description: 'Simulations et msgIn', logo: '', component: '' },
  { name: 'get_msgin_preview', label: 'Apercu du payload', description: 'Résumé des clés utiles', logo: '', component: '' },
  { name: 'search_predecessors', label: 'Rechercher un nœud précédent', description: 'Recherche textuelle (nom/description/type) parmi les nœuds précédents', logo: '', component: '' },
  { name: 'get_predecessor_context', label: 'Contexte des prédécesseurs', description: "Descriptions, schémas d'arguments et de sorties des nœuds précédents", logo: '', component: '' },
  { name: 'set_node_args', label: 'Définir les arguments', description: 'Proposer les arguments (final)', logo: '', component: '' },
  { name: 'set_node_description', label: 'Définir la description', description: 'Proposer la description', logo: '', component: '' },

  // Create-node agent tools
  { name: 'list_templates', label: 'Lister les templates', description: 'Lister les templates disponibles', logo: '', component: '' },
  { name: 'get_template_schema', label: 'Schéma du template', description: "Schéma d'arguments pour un template", logo: '', component: '' },
  { name: 'list_seed_predecessors', label: 'Observer les prédécesseurs', description: 'Prédécesseurs de la source', logo: '', component: '' },
  { name: 'get_source_info', label: 'Infos source', description: 'Infos de la source/handle', logo: '', component: '' },
  { name: 'args_fill_via_node_assistant', label: 'Assistant paramétrage', description: 'Sous-agent de paramétrage des arguments', logo: '', component: '' },
  { name: 'emit_graph', label: 'Émettre le graphe', description: 'Émettre la proposition de graphe', logo: '', component: '' },

  // Create-node seed-only subtools
  { name: 'get_seed_scenarios', label: 'Scénarios', description: 'Simulations', logo: '', component: '' },
  { name: 'set_args', label: 'Définir les arguments', description: 'Définir les arguments', logo: '', component: '' },
  { name: 'set_desc', label: 'Définir la description', description: 'Définir la description', logo: '', component: '' },
];

async function seedToolsIfMissing() {
  for (const it of DEFAULT_TOOLS) {
    try {
      const existing = await Tool.findOne({ name: it.name });
      if (!existing) {
        await Tool.create({
          name: it.name,
          label: it.label || '',
          description: it.description || '',
          logo: it.logo || '',
          component: it.component || '',
          template: it.template || '',
        });
        try { console.log('[seed-tools] created', it.name, 'label=', it.label || ''); } catch {}
      } else {
        const patch = {};
        // Mettre à jour si la valeur diffère (et non pas seulement si vide)
        if (it.label != null && String(existing.label || '') !== String(it.label)) patch.label = it.label;
        if (it.description != null && String(existing.description || '') !== String(it.description)) patch.description = it.description;
        if (it.template != null && String(existing.template || '') !== String(it.template)) patch.template = it.template;
        if (it.logo != null && String(existing.logo || '') !== String(it.logo)) patch.logo = it.logo;
        if (it.component != null && String(existing.component || '') !== String(it.component)) patch.component = it.component;
        if (Object.keys(patch).length) {
          await Tool.updateOne({ _id: existing._id }, { $set: patch });
          try { console.log('[seed-tools] updated', it.name, patch); } catch {}
        } else {
          try { console.log('[seed-tools] exists', it.name, 'label=', existing.label || ''); } catch {}
        }
      }
    } catch (e) {
      try { console.error('[seed-tools] fail', it.name, e.message); } catch {}
    }
  }
  try { console.log('[seed-tools] ensured', DEFAULT_TOOLS.length, 'tools total'); } catch {}
}

module.exports = { seedToolsIfMissing };
