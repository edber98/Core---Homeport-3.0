const { trelloApi } = require("./utils").utils;

module.exports = {
  async trello_checklist_delete(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return trelloApi('DELETE', '/checklists/{idChecklist}', inputs, opts?.credentials, {
        pathParams: ['idChecklist']
      });
    }
};
