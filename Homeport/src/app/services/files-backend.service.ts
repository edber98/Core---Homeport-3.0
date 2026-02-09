import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpRequest } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApiClientService } from './api-client.service';
import { apiRoot, apiSuffix } from '../shared/api-base';
import { environment } from '../../environments/environment';

export interface FileRef {
  _type: 'fileRef';
  fileId: string;
  name: string;
  mimeType: string;
  size: number;
}

export interface FileMeta {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  lifecycle: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class FilesBackendService {
  private root = apiRoot();
  private suffix = apiSuffix();

  constructor(
    private http: HttpClient,
    private api: ApiClientService,
  ) {}

  private buildUrl(path: string): string {
    const cleanPath = environment.production ? path.replace(/^\/api\b/, '') : path;
    return `${this.root}${this.suffix}${cleanPath}`;
  }

  /**
   * Upload a file via multipart POST. Returns raw HttpEvents for progress tracking.
   */
  upload(wsId: string, file: File, lifecycle: string = 'temp'): Observable<HttpEvent<{ success: boolean; data: FileRef }>> {
    const fd = new FormData();
    fd.append('file', file, file.name);
    fd.append('lifecycle', lifecycle);

    const req = new HttpRequest('POST', this.buildUrl(`/api/workspaces/${encodeURIComponent(wsId)}/files/upload`), fd, {
      reportProgress: true,
    });

    return this.http.request<{ success: boolean; data: FileRef }>(req);
  }

  /**
   * Simple upload returning just the FileRef.
   */
  uploadSimple(wsId: string, file: File, lifecycle: string = 'temp'): Observable<FileRef> {
    const fd = new FormData();
    fd.append('file', file, file.name);
    fd.append('lifecycle', lifecycle);

    return this.http
      .post<{ success: boolean; data: FileRef }>(this.buildUrl(`/api/workspaces/${encodeURIComponent(wsId)}/files/upload`), fd)
      .pipe(map(r => r.data));
  }

  /**
   * Get file metadata.
   */
  getMeta(fileId: string): Observable<FileMeta> {
    return this.api.get<FileMeta>(`/api/files/${encodeURIComponent(fileId)}/meta`);
  }

  /**
   * Build a download URL for a file (for use in <a href> or window.open).
   */
  downloadUrl(fileId: string): string {
    return this.buildUrl(`/api/files/${encodeURIComponent(fileId)}`);
  }

  /**
   * Delete a file.
   */
  delete(fileId: string): Observable<any> {
    return this.api.delete<any>(`/api/files/${encodeURIComponent(fileId)}`);
  }
}
