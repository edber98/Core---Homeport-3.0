import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

type Envelope<T> = { success: true; data: T } | { success: false; error: { code?: string; message?: string; details?: any } };

@Injectable({ providedIn: 'root' })
export class ApiClientService {
  private base = environment.apiBaseUrl.replace(/\/$/, '');

  constructor(private http: HttpClient) {}

  get<T>(path: string, params?: Record<string, any>): Observable<T> {
    const p = this.buildParams(params);
    return this.http.get<Envelope<T>>(`${this.base}${path}`, { params: p }).pipe(map(this.unwrap));
  }
  post<T>(path: string, body?: any, params?: Record<string, any>): Observable<T> {
    const p = this.buildParams(params);
    return this.http.post<Envelope<T>>(`${this.base}${path}`, body ?? {}, { params: p }).pipe(map(this.unwrap));
  }
  put<T>(path: string, body?: any, params?: Record<string, any>): Observable<T> {
    const p = this.buildParams(params);
    return this.http.put<Envelope<T>>(`${this.base}${path}`, body ?? {}, { params: p }).pipe(map(this.unwrap));
  }
  delete<T>(path: string, params?: Record<string, any>): Observable<T> {
    const p = this.buildParams(params);
    return this.http.delete<Envelope<T>>(`${this.base}${path}`, { params: p }).pipe(map(this.unwrap));
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
}
