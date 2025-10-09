class AppError extends Error {
  constructor(status = 500, code = 'internal_error', message = 'Internal error', details = null){
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const errors = {
  unauthorized: (msg='unauthorized', details=null) => new AppError(401, 'unauthorized', msg, details),
  forbidden: (msg='forbidden', details=null) => new AppError(403, 'forbidden', msg, details),
  notFound: (msg='not_found', details=null) => new AppError(404, 'not_found', msg, details),
  badRequest: (msg='bad_request', details=null) => new AppError(400, 'bad_request', msg, details),
  conflict: (msg='conflict', details=null) => new AppError(409, 'conflict', msg, details),
  internal: (msg='internal_error', details=null) => new AppError(500, 'internal_error', msg, details),
};

module.exports = { AppError, errors };

