const delay = time => new Promise(res=>setTimeout(res,time));
// Nombre aléatoire entre 10 et 20 inclus
const min = 1;
const max = 4;

module.exports = {
  crm_contact_create: async (_node, _msg, inputs) => {
    console.log("EXECUTER")
    const randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;
    await delay(randomNumber*1000);
    return { created: true, contact: { firstName: inputs.firstName || '', lastName: inputs.lastName || '', email: inputs.email || '' } };
  },
  crm_contact_update: async (_node, _msg, inputs) => {
    return { updated: true, id: inputs.id, email: inputs.email || null };
  }
};

