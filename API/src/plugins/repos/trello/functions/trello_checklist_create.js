const { trelloApi } = require("./utils").utils;

module.exports = {
  async trello_checklist_create(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return trelloApi('POST', '/checklists', inputs, opts?.credentials, {
        bodyParams: ['idCard', 'name', 'pos']
      });
    }
};
