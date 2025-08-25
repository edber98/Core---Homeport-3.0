import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthTokenService } from './auth-token.service';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { NzMessageService } from 'ng-zorro-antd/message';

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const tokens = inject(AuthTokenService);
  const msg = inject(NzMessageService);
  return next(req).pipe(
    catchError((err: any) => {
      if (err instanceof HttpErrorResponse) {
        if (err.status === 401) {
          try { tokens.clear(); } catch {}
          try { router.navigateByUrl('/login'); } catch {}
          msg.error('Session expirée. Merci de vous reconnecter.');
        } else {
          const m = (err.error && (err.error.message || err.error?.error?.message)) || err.statusText || 'Erreur réseau';
          if (m) msg.error(m);
        }
      } else {
        const m = (err && (err.message || err?.error?.message)) || 'Erreur';
        if (m) msg.error(m);
      }
      return throwError(() => err);
    })
  );
};
