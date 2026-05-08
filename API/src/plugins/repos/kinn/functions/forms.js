// Handlers pour les nodes Forms du plugin Kinn.
const { buildKinnClient, ok, fail } = require('./_helpers');

module.exports = {
  async kinn_list_forms(node, msg, inputs, opts) {
    try {
      const c = await buildKinnClient(opts);
      const wsId = c.resolveWorkspaceId(inputs);
      if (!wsId) return fail('workspaceId requis');
      const limit = Math.min(parseInt(inputs.limit || 100, 10), 200);
      const res = await c.fetchKinn(`/api/workspaces/${encodeURIComponent(wsId)}/forms?limit=${limit}`);
      const forms = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      return ok({ forms, count: forms.length });
    } catch (e) { return fail(e); }
  },

  async kinn_get_form(node, msg, inputs, opts) {
    try {
      const c = await buildKinnClient(opts);
      const formId = String(inputs.formId || '').trim();
      if (!formId) return fail('formId requis');
      const res = await c.fetchKinn(`/api/forms/${encodeURIComponent(formId)}`);
      return ok({ form: res?.data || res });
    } catch (e) { return fail(e); }
  },

  async kinn_submit_form(node, msg, inputs, opts) {
    try {
      const c = await buildKinnClient(opts);
      const formId = String(inputs.formId || '').trim();
      if (!formId) return fail('formId requis');
      const data = inputs.data || {};
      const res = await c.fetchKinn(`/api/forms/${encodeURIComponent(formId)}/submit`, {
        method: 'POST',
        body: JSON.stringify({ data }),
      });
      return ok({ run: res?.data || res });
    } catch (e) { return fail(e); }
  },

  async kinn_create_form(node, msg, inputs, opts) {
    try {
      const c = await buildKinnClient(opts);
      const wsId = c.resolveWorkspaceId(inputs);
      if (!wsId) return fail('workspaceId requis');
      const body = {
        name: String(inputs.name || 'Nouveau form'),
        schema: inputs.schema || { fields: [] },
      };
      if (inputs.flowId) body.flowId = String(inputs.flowId);
      const res = await c.fetchKinn(`/api/workspaces/${encodeURIComponent(wsId)}/forms`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      return ok({ form: res?.data || res });
    } catch (e) { return fail(e); }
  },
};
