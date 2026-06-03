const { trelloApi } = require("./utils").utils;
module.exports = {
  async trello_board_delete(node, msg, inputs, opts) {
    return trelloApi('DELETE', '/boards/{boardId}', inputs, opts?.credentials, { pathParams: ['boardId'] });
  }
};
