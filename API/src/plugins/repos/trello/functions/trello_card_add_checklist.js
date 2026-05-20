const { trelloApi } = require("./utils").utils;

module.exports = {
  async trello_card_add_checklist(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return trelloApi('POST', '/cards/{idCard}/checklists', inputs, opts?.credentials, {
        pathParams: ['idCard'],
        bodyParams: ['name', 'idChecklistSource', 'pos']
      });
    }
};
