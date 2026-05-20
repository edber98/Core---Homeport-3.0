const { trelloApi } = require("./utils").utils;

module.exports = {
  async trello_card_add_label(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return trelloApi('POST', '/cards/{idCard}/idLabels', inputs, opts?.credentials, {
        pathParams: ['idCard'],
        bodyParams: ['value']
      });
    }
};
