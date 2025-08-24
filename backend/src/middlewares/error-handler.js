function errorHandler(err, req, res, next){
  const status = err.status || 500;
  const code = err.code || (status === 404 ? 'not_found' : status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : status === 400 ? 'bad_request' : 'internal_error');
  const message = err.message || 'Internal error';
  const details = err.details || null;
  if (status >= 500) console.error('[error]', code, message, err.stack || '');
  const body = { success: false, error: { code, message, details }, requestId: req.requestId || null, ts: Date.now() };
  res.status(status).json(body);
}

module.exports = { errorHandler };
