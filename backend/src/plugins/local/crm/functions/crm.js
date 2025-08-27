module.exports = {
  crm_contact_create: async (_node, _msg, inputs) => {
    console.log("EXECUTER")
    return { created: true, contact: { firstName: inputs.firstName || '', lastName: inputs.lastName || '', email: inputs.email || '' } };
  },
  crm_contact_update: async (_node, _msg, inputs) => {
    return { updated: true, id: inputs.id, email: inputs.email || null };
  }
};

