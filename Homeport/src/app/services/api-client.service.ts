import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { apiBase, apiRoot, apiSuffix } from '../shared/api-base';

type Envelope<T> = { success: true; data: T } | { success: false; error: { code?: string; message?: string; details?: any } };

@Injectable({ providedIn: 'root' })
export class ApiClientService {
  private root = apiRoot();
  private suffix = apiSuffix();

  constructor(private http: HttpClient) {}

  private buildUrl(path: string): string {
    // En production, le suffix est inclus dans la base; retirer un éventuel préfixe '/api' du path pour éviter les doublons
    const cleanPath = environment.production ? path.replace(/^\/api\b/, '') : path;
    return `${this.root}${this.suffix}${cleanPath}`;
  }

  get<T>(path: string, params?: Record<string, any>): Observable<T> {
    const p = this.buildParams(params);
    return this.http
      .get<Envelope<T>>(this.buildUrl(path), { params: p })
      .pipe(
        map(this.unwrap),
        catchError(err => throwError(() => this.normalizeHttpError(err)))
      );
  }
  post<T>(path: string, body?: any, params?: Record<string, any>): Observable<T> {
    const p = this.buildParams(params);
    return this.http
      .post<Envelope<T>>(this.buildUrl(path), body ?? {}, { params: p })
      .pipe(
        map(this.unwrap),
        catchError(err => throwError(() => this.normalizeHttpError(err)))
      );
  }
  put<T>(path: string, body?: any, params?: Record<string, any>): Observable<T> {
    const p = this.buildParams(params);
    return this.http
      .put<Envelope<T>>(this.buildUrl(path), body ?? {}, { params: p })
      .pipe(
        map(this.unwrap),
        catchError(err => throwError(() => this.normalizeHttpError(err)))
      );
  }
  patch<T>(path: string, body?: any, params?: Record<string, any>): Observable<T> {
    const p = this.buildParams(params);
    return this.http
      .patch<Envelope<T>>(this.buildUrl(path), body ?? {}, { params: p })
      .pipe(
        map(this.unwrap),
        catchError(err => throwError(() => this.normalizeHttpError(err)))
      );
  }
  delete<T>(path: string, params?: Record<string, any>): Observable<T> {
    const p = this.buildParams(params);
    return this.http
      .delete<Envelope<T>>(this.buildUrl(path), { params: p })
      .pipe(
        map(this.unwrap),
        catchError(err => throwError(() => this.normalizeHttpError(err)))
      );
  }

  private unwrap<T>(resp: Envelope<T>): T {
    if ((resp as any)?.success === true) return (resp as any).data as T;
    const err = (resp as any)?.error || {};
    throw { message: err.message || 'API error', code: err.code, details: err.details };
  }

  private buildParams(params?: Record<string, any>): HttpParams {
    let p = new HttpParams();
    if (!params) return p;
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') return;
      p = p.set(k, String(v));
    });
    return p;
  }

  // Transform HttpErrorResponse into a flat error object with code/message/details
  private normalizeHttpError(err: any): { code?: string; message?: string; details?: any } {
    try {
      // Angular HttpErrorResponse
      const payload = err?.error;
      // Our backend envelope: { success:false, error:{ code, message, details } }
      const env = payload && (payload.error || payload);
      const code = env?.code || err?.statusText || 'http_error';
      const message = env?.message || err?.message || 'HTTP error';
      const details = env?.details;
      return { code, message, details };
    } catch {
      return { code: 'http_error', message: 'HTTP error' };
    }
  }
}
