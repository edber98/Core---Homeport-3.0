const { trelloApi } = require("./utils").utils;

module.exports = {
  async trello_label_create(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return trelloApi('POST', '/labels', inputs, opts?.credentials, {
        bodyParams: ['name', 'color', 'idBoard']
      });
    }
};
