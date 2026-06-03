const { trelloApi } = require("./utils").utils;

module.exports = {
  async trello_checklist_update_item(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return trelloApi('PUT', '/cards/{idCard}/checklist/{idChecklist}/checkItem/{idCheckItem}', inputs, opts?.credentials, {
        pathParams: ['idCard', 'idChecklist', 'idCheckItem'],
        bodyParams: ['name', 'state', 'pos']
      });
    }
};
