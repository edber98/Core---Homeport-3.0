// Tools registry helper: ensure Tool metadata exists per agent tool set.
const ToolModel = require('../db/models/tool.model');

function normalizeToolInput(t){
  // Accept either a DynamicStructuredTool instance or a plain object { name, description, logo, component, template }
  try {
    if (!t) return null;
    if (typeof t === 'object' && t.name) {
      const name = String(t.name);
      // LangChain DynamicStructuredTool often stores description in t.description or t.description?.lc_kwargs?.description
      let description = '';
      try { description = String(t.description || (t?.lc_kwargs?.description ?? '')); } catch {}
      const plain = { name, description };
      // If already a plain object with logo/component/template, preserve
      if (t.logo) plain.logo = String(t.logo);
      if (t.component) plain.component = String(t.component);
      if (t.template) plain.template = String(t.template);
      return plain;
    }
    return null;
  } catch { return null; }
}

async function ensureToolMetadata(tools){
  try {
    const items = (Array.isArray(tools) ? tools : []).map(normalizeToolInput).filter(Boolean);
    for (const it of items){
      try {
        await ToolModel.findOneAndUpdate(
          { name: it.name },
          { $setOnInsert: { description: it.description || '', logo: it.logo || '', component: it.component || '', template: it.template || '' } },
          { upsert: true, new: true }
        );
        try {
          const t = await ToolModel.findOne({ name: it.name }).lean();
          console.info('[tools-registry] ensured', it.name, { label: t?.label || '', hasTemplate: !!(t?.template) });
        } catch {}
      } catch (e) { try { console.warn('[tools-registry][ensure] failed', it.name, e.message); } catch {} }
    }
    if (items.length) try { console.info('[tools-registry] ensured', items.length, 'tools'); } catch {}
  } catch {}
}

module.exports = { ensureToolMetadata };
