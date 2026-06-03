const { trelloApi } = require("./utils").utils;

module.exports = {
  async trello_checklist_delete_item(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return trelloApi('DELETE', '/checklists/{idChecklist}/checkItems/{idCheckItem}', inputs, opts?.credentials, {
        pathParams: ['idChecklist', 'idCheckItem']
      });
    }
};
