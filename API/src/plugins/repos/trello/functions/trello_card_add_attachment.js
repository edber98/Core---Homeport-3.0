const { trelloApi } = require("./utils").utils;

module.exports = {
  async trello_card_add_attachment(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return trelloApi('POST', '/cards/{idCard}/attachments', inputs, opts?.credentials, {
        pathParams: ['idCard'],
        bodyParams: ['name', 'url', 'mimeType']
      });
    }
};
