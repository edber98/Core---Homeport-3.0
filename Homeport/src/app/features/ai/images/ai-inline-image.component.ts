import { Component, Input, ChangeDetectionStrategy, inject, signal, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { AiService, AiInlineImagePayload } from '../ai.service';
import { WidgetExportService } from '../widgets/widget-export.service';

@Component({
  selector: 'ai-inline-image',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NzIconModule, NzButtonModule, NzDropDownModule],
  template: `
    <figure class="ai-inline-image" *ngIf="data && resolvedSrc()">
      <div class="img-box" [class.loading]="!loaded()">
        <div class="skeleton" *ngIf="!loaded() && !errored()"></div>
        <div class="error" *ngIf="errored()">
          <span nz-icon nzType="picture" nzTheme="outline"></span>
          <span>Image introuvable</span>
        </div>
        <img
          *ngIf="!errored()"
          [src]="resolvedSrc()"
          [alt]="data.alt || data.caption || 'image'"
          loading="lazy"
          (load)="onLoad()"
          (error)="onError()"
          (click)="openFullscreen($event)"
          class="inline-img"
        />
        <div class="actions" *ngIf="loaded()">
          <button
            nz-button nzType="text" nzSize="small" class="act-btn"
            (click)="openFullscreen($event)" title="Agrandir">
            <span nz-icon nzType="fullscreen" nzTheme="outline"></span>
          </button>
          <button
            nz-button nzType="text" nzSize="small" class="act-btn"
            nz-dropdown [nzDropdownMenu]="menu" [nzTrigger]="'click'" nzPlacement="bottomRight"
            title="Options">
            <span nz-icon nzType="more" nzTheme="outline"></span>
          </button>
          <nz-dropdown-menu #menu="nzDropdownMenu">
            <ul nz-menu>
              <li nz-menu-item (click)="download()">
                <span nz-icon nzType="download" nzTheme="outline"></span>
                &nbsp;Télécharger
              </li>
              <li nz-menu-item (click)="copyUrl()">
                <span nz-icon nzType="link" nzTheme="outline"></span>
                &nbsp;Copier l'URL
              </li>
              <li nz-menu-item (click)="openFullscreen($event)">
                <span nz-icon nzType="fullscreen" nzTheme="outline"></span>
                &nbsp;Ouvrir en grand
              </li>
            </ul>
          </nz-dropdown-menu>
        </div>
      </div>
      <figcaption *ngIf="data.caption">{{ data.caption }}</figcaption>
    </figure>
  `,
  styles: [`
    :host { display: block; max-width: 100%; }
    .ai-inline-image {
      margin: 4px 0;
      max-width: min(720px, 100%);
      display: inline-block;
    }
    .img-box {
      position: relative;
      background: #f5f5f5;
      border-radius: 8px;
      overflow: hidden;
      min-height: 80px;
      min-width: 80px;
      line-height: 0;
    }
    .img-box.loading { min-height: 180px; min-width: 240px; }
    .skeleton {
      position: absolute; inset: 0;
      background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: skeleton-shimmer 1.2s ease-in-out infinite;
    }
    @keyframes skeleton-shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    .error {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 6px; padding: 24px; color: #999; font-size: 12px;
      min-height: 120px;
    }
    .inline-img {
      display: block;
      max-width: 100%;
      max-height: 60vh;
      height: auto;
      border-radius: 8px;
      cursor: zoom-in;
      transition: opacity 0.2s;
    }
    .inline-img:hover { opacity: 0.92; }
    .actions {
      position: absolute;
      bottom: 8px; right: 8px;
      display: flex; gap: 4px;
      opacity: 0;
      transition: opacity 0.15s;
    }
    .img-box:hover .actions { opacity: 1; }
    .act-btn {
      background: rgba(255, 255, 255, 0.92) !important;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
      border-radius: 6px !important;
      width: 28px; height: 28px;
      display: flex; align-items: center; justify-content: center;
      padding: 0 !important;
    }
    .act-btn:hover { background: #fff !important; }
    figcaption {
      margin-top: 6px;
      font-size: 12px;
      color: #666;
      text-align: left;
      line-height: 1.4;
    }
  `],
})
export class AiInlineImageComponent {
  @Input() data!: AiInlineImagePayload;

  private ai = inject(AiService);
  private msg = inject(NzMessageService);
  private modal = inject(NzModalService);
  private exp = inject(WidgetExportService);
  private cdr = inject(ChangeDetectorRef);

  loaded = signal(false);
  errored = signal(false);
  private _modalRef: any = null;

  resolvedSrc = computed(() => {
    const d = this.data;
    if (!d) return '';
    if (d.url) return d.url;
    if (d.fileId) return this.ai.fileUrl(d.fileId);
    return '';
  });

  onLoad() { this.loaded.set(true); this.cdr.markForCheck(); }
  onError() { this.errored.set(true); this.loaded.set(true); this.cdr.markForCheck(); }

  private _lightboxEl: HTMLElement | null = null;
  private _onEsc: ((e: KeyboardEvent) => void) | null = null;

  openFullscreen(event?: Event) {
    if (event) { event.stopPropagation(); event.preventDefault(); }
    if (this._lightboxEl) return;
    const src = this.resolvedSrc();
    if (!src || this.errored()) return;
    const safeUrl = this.escapeHtml(src);
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;animation:aiFadeIn .15s ease';
    overlay.innerHTML = `
      <div style="position:absolute;inset:0;background:rgba(0,0,0,0.8)" data-ai-close></div>
      <div style="position:relative;max-width:92vw;max-height:92vh;display:flex;align-items:center;justify-content:center">
        <img src="${safeUrl}" style="max-width:92vw;max-height:92vh;object-fit:contain;border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,0.5);background:#fff" />
        <div style="position:absolute;top:-44px;right:0;display:flex;gap:8px">
          <a href="${safeUrl}" target="_blank" download style="width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.15);color:#fff;display:flex;align-items:center;justify-content:center;text-decoration:none;font-size:16px;cursor:pointer;border:none" title="Télécharger"><i class="fa-solid fa-download"></i></a>
          <button style="width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.15);color:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;cursor:pointer;border:none" data-ai-close title="Fermer"><i class="fa-solid fa-xmark"></i></button>
        </div>
      </div>
    `;
    if (!document.getElementById('ai-lightbox-style')) {
      const s = document.createElement('style');
      s.id = 'ai-lightbox-style';
      s.textContent = '@keyframes aiFadeIn{from{opacity:0}to{opacity:1}}';
      document.head.appendChild(s);
    }
    overlay.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('[data-ai-close]')) this.closeLightbox();
    });
    this._onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') this.closeLightbox(); };
    document.addEventListener('keydown', this._onEsc);
    document.body.appendChild(overlay);
    this._lightboxEl = overlay;
  }

  closeLightbox() {
    if (this._lightboxEl) {
      try { this._lightboxEl.remove(); } catch {}
      this._lightboxEl = null;
    }
    if (this._onEsc) {
      document.removeEventListener('keydown', this._onEsc);
      this._onEsc = null;
    }
  }

  async download() {
    const src = this.resolvedSrc();
    if (!src) return;
    try {
      const res = await fetch(src, { credentials: 'include' });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = this.suggestFilename();
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      // Fallback: open in new tab
      window.open(src, '_blank');
    }
  }

  async copyUrl() {
    const src = this.resolvedSrc();
    if (!src) return;
    const abs = src.startsWith('http') ? src : window.location.origin + src;
    const ok = await this.exp.copyText(abs);
    this.msg.success(ok ? 'URL copiée' : "Impossible de copier l'URL");
  }

  private suggestFilename(): string {
    const base = (this.data?.caption || this.data?.alt || 'image').replace(/[^a-z0-9\-_.]/gi, '_').slice(0, 60);
    const src = this.resolvedSrc();
    const ext = (src.match(/\.(png|jpg|jpeg|gif|webp|svg)(\?|$)/i)?.[1] || 'png').toLowerCase();
    return `${base || 'image'}.${ext}`;
  }

  private escapeHtml(s: string): string {
    return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
  }
}
