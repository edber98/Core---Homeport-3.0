const { trelloApi } = require("./utils").utils;

module.exports = {
  async trello_checklist_get(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return trelloApi('GET', '/checklists/{idChecklist}', inputs, opts?.credentials, {
        pathParams: ['idChecklist'],
        queryParams: ['fields', 'checkItems']
      });
    }
};
