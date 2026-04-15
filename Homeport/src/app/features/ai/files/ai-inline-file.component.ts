import { Component, Input, ChangeDetectionStrategy, inject, signal, computed, ElementRef, ViewChild, AfterViewInit, OnChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { AiService, AiInlineFilePayload } from '../ai.service';

@Component({
  selector: 'ai-inline-file',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NzIconModule, NzButtonModule],
  template: `
    <figure class="ai-inline-file" *ngIf="data">
      <header class="file-head">
        <div class="ico" [attr.data-kind]="data.kind || 'other'">
          <span nz-icon [nzType]="iconFor(data.kind)" nzTheme="outline"></span>
        </div>
        <div class="meta">
          <div class="name" [title]="data.name || ''">{{ data.name || 'Document' }}</div>
          <div class="sub">
            <span class="badge">{{ (data.kind || 'file').toUpperCase() }}</span>
            <span *ngIf="data.size" class="size">{{ humanSize(data.size) }}</span>
            <span *ngIf="data.caption" class="caption">· {{ data.caption }}</span>
          </div>
        </div>
        <div class="actions">
          <button nz-button nzType="text" nzSize="small" class="act-btn"
            (click)="toggleFullscreen()" [title]="fullscreen() ? 'Réduire' : 'Plein écran'">
            <span nz-icon [nzType]="fullscreen() ? 'fullscreen-exit' : 'fullscreen'" nzTheme="outline"></span>
          </button>
          <a nz-button nzType="text" nzSize="small" class="act-btn"
            [href]="downloadUrl()" [download]="data.name || 'file'" title="Télécharger">
            <span nz-icon nzType="download" nzTheme="outline"></span>
          </a>
        </div>
      </header>
      <div class="viewer" [class.fullscreen]="fullscreen()" [style.height.px]="viewerHeight()">
        <div class="skeleton" *ngIf="!loaded() && !errored()">
          <span nz-icon nzType="loading" nzTheme="outline"></span>
          <span>Chargement de l'aperçu…</span>
        </div>
        <div class="err" *ngIf="errored()">
          <span nz-icon nzType="exclamation-circle" nzTheme="outline"></span>
          <span>Aperçu indisponible</span>
          <a [href]="downloadUrl()" target="_blank" download>Télécharger le fichier</a>
        </div>
        <iframe
          #frame
          *ngIf="!errored()"
          [src]="safeSrc()"
          (load)="onLoad()"
          (error)="onError()"
          [title]="data.name || 'preview'"
          [attr.sandbox]="'allow-scripts allow-same-origin allow-popups allow-downloads'"
          loading="lazy"
        ></iframe>
      </div>
    </figure>
  `,
  styles: [`
    :host { display: block; max-width: 100%; }
    .ai-inline-file {
      margin: 6px 0;
      max-width: min(820px, 100%);
      background: #fff;
      border: 1px solid #e5e5e5;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 1px 4px rgba(0,0,0,.04);
      transition: box-shadow .15s;
    }
    .ai-inline-file:hover { box-shadow: 0 4px 14px rgba(0,0,0,.08); }
    .file-head {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 14px;
      background: linear-gradient(135deg, #fff5fa 0%, #fafafa 100%);
      border-bottom: 1px solid #f0f0f0;
    }
    .ico {
      width: 36px; height: 36px; border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px;
      background: #e61982; color: #fff;
      flex: 0 0 auto;
    }
    .ico[data-kind="xlsx"] { background: #13a456; }
    .ico[data-kind="pptx"] { background: #e8732c; }
    .ico[data-kind="pdf"]  { background: #c62828; }
    .meta { flex: 1; min-width: 0; }
    .name { font-size: 13px; font-weight: 600; color: #262626; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .sub { display: flex; align-items: center; gap: 6px; margin-top: 2px; font-size: 11px; color: #8c8c8c; }
    .badge {
      background: #e61982; color: #fff;
      padding: 1px 6px; border-radius: 4px; font-weight: 600; font-size: 10px; letter-spacing: .3px;
    }
    .ico[data-kind="xlsx"] + .meta .badge { background: #13a456; }
    .ico[data-kind="pptx"] + .meta .badge { background: #e8732c; }
    .ico[data-kind="pdf"]  + .meta .badge { background: #c62828; }
    .size { color: #8c8c8c; }
    .caption { color: #595959; }
    .actions { display: flex; gap: 2px; }
    .act-btn { width: 28px; height: 28px; padding: 0 !important; border-radius: 6px !important; color: #595959 !important; }
    .act-btn:hover { background: #fff !important; color: #e61982 !important; }
    .viewer {
      position: relative;
      background: #fafafa;
      min-height: 280px;
      height: 520px;
      max-height: 70vh;
    }
    .viewer.fullscreen {
      position: fixed; inset: 0; z-index: 99999;
      max-height: 100vh !important;
      height: 100vh !important;
      background: rgba(0,0,0,.8);
      padding: 40px;
      border-radius: 0;
    }
    .viewer iframe {
      width: 100%; height: 100%;
      border: 0;
      background: #fff;
      display: block;
    }
    .viewer.fullscreen iframe {
      border-radius: 8px;
      box-shadow: 0 8px 32px rgba(0,0,0,.4);
    }
    .skeleton, .err {
      position: absolute; inset: 0;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 8px; color: #8c8c8c; font-size: 12px;
      pointer-events: none;
    }
    .err { pointer-events: auto; }
    .err a { color: #e61982; font-weight: 600; pointer-events: auto; }
    .skeleton [nz-icon] { font-size: 22px; color: #e61982; }
    @media (max-width: 600px) {
      .viewer { height: 420px; }
    }
  `],
})
export class AiInlineFileComponent implements AfterViewInit, OnChanges {
  @Input() data!: AiInlineFilePayload;
  @ViewChild('frame') frameEl?: ElementRef<HTMLIFrameElement>;

  private ai = inject(AiService);
  private msg = inject(NzMessageService);
  private cdr = inject(ChangeDetectorRef);
  private sanitizer = inject(DomSanitizer);

  loaded = signal(false);
  errored = signal(false);
  fullscreen = signal(false);

  previewUrl = computed(() => this.data ? this.ai.filePreviewUrl(this.data.fileId) : '');

  safeSrc(): SafeResourceUrl {
    // Angular bloque les iframe [src] par défaut → bypass pour notre endpoint same-origin.
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.previewUrl());
  }

  downloadUrl(): string {
    return this.data ? this.ai.fileUrl(this.data.fileId) : '';
  }

  viewerHeight(): number | null {
    if (this.fullscreen()) return null; // CSS override
    const k = this.data?.kind;
    if (k === 'xlsx') return 560;
    if (k === 'pptx') return 600;
    if (k === 'pdf')  return 720;
    return 520;
  }

  iconFor(kind?: string): string {
    switch (kind) {
      case 'docx': return 'file-word';
      case 'xlsx': return 'file-excel';
      case 'pptx': return 'file-ppt';
      case 'pdf':  return 'file-pdf';
      default:     return 'file';
    }
  }

  humanSize(bytes?: number): string {
    if (!bytes || bytes <= 0) return '';
    const units = ['B', 'Ko', 'Mo', 'Go'];
    let i = 0; let n = bytes;
    while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
    return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
  }

  onLoad() { this.loaded.set(true); this.cdr.markForCheck(); }
  onError() { this.errored.set(true); this.loaded.set(true); this.cdr.markForCheck(); }

  toggleFullscreen() {
    this.fullscreen.update(v => !v);
    if (this.fullscreen()) {
      document.body.style.overflow = 'hidden';
      // esc key
      this._onEsc = (e) => { if (e.key === 'Escape') this.toggleFullscreen(); };
      document.addEventListener('keydown', this._onEsc);
    } else {
      document.body.style.overflow = '';
      if (this._onEsc) { document.removeEventListener('keydown', this._onEsc); this._onEsc = null; }
    }
  }
  private _onEsc: ((e: KeyboardEvent) => void) | null = null;

  ngAfterViewInit(): void {}

  ngOnChanges(): void {
    this.loaded.set(false);
    this.errored.set(false);
  }
}
