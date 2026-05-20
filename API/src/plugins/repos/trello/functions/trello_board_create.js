const { trelloApi } = require("./utils").utils;

module.exports = {
  async trello_board_create(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return trelloApi('POST', '/boards', inputs, opts?.credentials, {
        bodyParams: ['name', 'desc', 'idOrganization', 'defaultLists', 'defaultLabels', 'prefs_permissionLevel']
      });
    }
};
