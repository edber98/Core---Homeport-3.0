const { randomUUID } = require('crypto');

function apiResponse(){
  return (req, res, next) => {
    req.requestId = req.headers['x-request-id'] || randomUUID();
    res.apiOk = (data) => res.json({ success: true, data, requestId: req.requestId, ts: Date.now() });
    res.apiError = (status, code, message, details=null) => res.status(status).json({ success: false, error: { code, message, details }, requestId: req.requestId, ts: Date.now() });
    next();
  };
}

module.exports = { apiResponse };

