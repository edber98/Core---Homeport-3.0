import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthTokenService } from './auth-token.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenSvc = inject(AuthTokenService);
  const token = tokenSvc.token;
  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(req);
};

