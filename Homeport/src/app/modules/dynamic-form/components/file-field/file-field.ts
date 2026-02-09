import { Component, Input, OnInit, OnDestroy, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { HttpClient, HttpRequest, HttpResponse, HttpEventType } from '@angular/common/http';
import { NzUploadModule, NzUploadFile, NzUploadChangeParam, NzUploadXHRArgs } from 'ng-zorro-antd/upload';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { Subscription } from 'rxjs';
import { AccessControlService } from '../../../../services/access-control.service';
import { apiRoot, apiSuffix } from '../../../../shared/api-base';
import { environment } from '../../../../../environments/environment';

export interface FileFieldConfig {
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
  maxCount?: number;
  lifecycle?: 'temp' | 'execution' | 'permanent';
  preview?: boolean;
  dragDrop?: boolean;
  listType?: 'text' | 'picture' | 'picture-card';
  buttonText?: string;
  hint?: string;
}

interface FileRef {
  _type: 'fileRef';
  fileId: string;
  name: string;
  mimeType: string;
  size: number;
}

@Component({
  selector: 'df-file-field',
  standalone: true,
  imports: [CommonModule, NzUploadModule, NzButtonModule, NzIconModule],
  templateUrl: './file-field.html',
  styles: [`
    .df-file-hint {
      margin-top: 4px;
      font-size: 12px;
      color: #999;
    }
    :host ::ng-deep .ant-upload-drag {
      border-radius: 8px;
    }
  `],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => FileFieldComponent),
    multi: true,
  }],
})
export class FileFieldComponent implements ControlValueAccessor, OnInit, OnDestroy {
  @Input() config: FileFieldConfig = {};

  fileList: NzUploadFile[] = [];
  uploadUrl = '';

  private onChange: (val: any) => void = () => {};
  private onTouched: () => void = () => {};
  private root = apiRoot();
  private suffix = apiSuffix();

  get maxSizeKb(): number {
    return this.config.maxSize ? Math.ceil(this.config.maxSize / 1024) : 0;
  }

  get canUploadMore(): boolean {
    if (!this.config.multiple) return this.fileList.length === 0;
    return this.fileList.length < (this.config.maxCount || 10);
  }

  get showUploadList() {
    return {
      showPreviewIcon: this.config.preview !== false,
      showRemoveIcon: true,
      showDownloadIcon: false,
    };
  }

  constructor(
    private http: HttpClient,
    private acl: AccessControlService,
  ) {}

  ngOnInit(): void {
    this.updateUploadUrl();
  }

  ngOnDestroy(): void {}

  private updateUploadUrl(): void {
    const ws = this.acl.currentWorkspace();
    const wsId = ws?.backendId || ws?.id || '';
    const cleanPath = environment.production
      ? `/workspaces/${encodeURIComponent(wsId)}/files/upload`
      : `/api/workspaces/${encodeURIComponent(wsId)}/files/upload`;
    this.uploadUrl = `${this.root}${this.suffix}${cleanPath}`;
  }

  customRequest = (item: NzUploadXHRArgs): Subscription => {
    this.updateUploadUrl();
    const fd = new FormData();
    fd.append('file', item.file as any);
    fd.append('lifecycle', this.config.lifecycle || 'execution');

    const req = new HttpRequest('POST', this.uploadUrl, fd, { reportProgress: true });

    return this.http.request(req).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress) {
          const percent = event.total ? Math.round((event.loaded / event.total) * 100) : 0;
          item.onProgress!({ percent }, item.file);
        } else if (event instanceof HttpResponse) {
          const body = event.body as any;
          const fileRef = body?.data || body;
          item.onSuccess!(fileRef, item.file, event);
        }
      },
      error: (err) => {
        item.onError!(err, item.file);
      },
    });
  };

  onUploadChange(info: NzUploadChangeParam): void {
    this.fileList = [...info.fileList];

    const allDone = this.fileList.every(f => f.status === 'done' || f.status === 'error');
    if (!allDone) return;

    const successFiles = this.fileList.filter(f => f.status === 'done');
    const refs = successFiles.map(f => f.response as FileRef).filter(Boolean);

    if (this.config.multiple) {
      this.onChange(refs);
    } else {
      this.onChange(refs[0] || null);
    }
    this.onTouched();
  }

  onRemove = (file: NzUploadFile): boolean => {
    this.fileList = this.fileList.filter(f => f.uid !== file.uid);

    const successFiles = this.fileList.filter(f => f.status === 'done');
    const refs = successFiles.map(f => f.response as FileRef).filter(Boolean);

    if (this.config.multiple) {
      this.onChange(refs);
    } else {
      this.onChange(refs[0] || null);
    }
    this.onTouched();
    return true;
  };

  // ControlValueAccessor
  writeValue(val: any): void {
    if (!val) {
      this.fileList = [];
      return;
    }
    const refs: FileRef[] = Array.isArray(val) ? val : [val];
    this.fileList = refs
      .filter(r => r && r._type === 'fileRef')
      .map((r, i) => ({
        uid: r.fileId || `${i}`,
        name: r.name || 'file',
        status: 'done' as const,
        response: r,
        size: r.size,
        type: r.mimeType,
      }));
  }

  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }
}
