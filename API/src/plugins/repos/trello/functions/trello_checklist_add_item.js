const { trelloApi } = require("./utils").utils;

module.exports = {
  async trello_checklist_add_item(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return trelloApi('POST', '/checklists/{idChecklist}/checkItems', inputs, opts?.credentials, {
        pathParams: ['idChecklist'],
        bodyParams: ['name', 'pos', 'checked']
      });
    }
};
