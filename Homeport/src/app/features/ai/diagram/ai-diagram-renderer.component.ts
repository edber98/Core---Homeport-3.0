import {
  Component, Input, OnChanges, ElementRef, ViewChild, AfterViewInit,
  inject, NgZone, ChangeDetectorRef, SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';

let _mermaidModule: any = null;
let _mermaidInitialized = false;
let _renderSeq = 0;

async function ensureMermaid(): Promise<any> {
  if (_mermaidModule) return _mermaidModule;
  const mod = await import('mermaid');
  _mermaidModule = mod.default || mod;
  if (!_mermaidInitialized) {
    try {
      _mermaidModule.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'strict',
        fontFamily: 'inherit',
      });
      _mermaidInitialized = true;
    } catch (e) {
      console.warn('[mermaid] initialize error', e);
    }
  }
  return _mermaidModule;
}

@Component({
  selector: 'ai-diagram-renderer',
  standalone: true,
  imports: [CommonModule, NzButtonModule, NzIconModule],
  template: `
    <div class="diagram-wrap" [class.compact]="!interactive">
      <div class="diagram-toolbar" *ngIf="interactive">
        <span class="diagram-title" *ngIf="title">{{ title }}</span>
        <div class="diagram-actions">
          <button nz-button nzSize="small" (click)="copyCode()">
            <span nz-icon nzType="copy" nzTheme="outline"></span> Copier le code
          </button>
          <button nz-button nzSize="small" (click)="downloadSvg()" [disabled]="!_lastSvg">
            <span nz-icon nzType="download" nzTheme="outline"></span> Télécharger SVG
          </button>
        </div>
      </div>

      <div class="diagram-body">
        <div #host class="diagram-host"></div>
        <div class="diagram-adjusting-badge" *ngIf="errorMessage">
          <span nz-icon nzType="loading" nzTheme="outline" [nzSpin]="true"></span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .diagram-wrap { display: flex; flex-direction: column; background: #fff; border-radius: 8px; }
    .diagram-wrap.compact { border: 1px solid #f0f0f0; overflow: hidden; }
    .diagram-toolbar {
      display: flex; align-items: center; gap: 12px;
      padding: 6px 10px; border-bottom: 1px solid #f0f0f0; background: #fafafa;
    }
    .diagram-title { font-weight: 600; font-size: 13px; color: #333; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .diagram-actions { display: flex; gap: 6px; flex-shrink: 0; }
    .diagram-body { flex: 1; overflow: auto; padding: 12px; display: flex; justify-content: center; }
    .diagram-host { max-width: 100%; }
    .diagram-host ::ng-deep svg { max-width: 100%; height: auto; }
    .compact .diagram-body { padding: 6px; max-height: 140px; overflow: hidden; }
    .compact .diagram-host ::ng-deep svg { max-height: 120px; }
    .diagram-body { position: relative; }
    .diagram-adjusting-badge {
      position: absolute; bottom: 8px; right: 8px;
      width: 24px; height: 24px; border-radius: 50%;
      background: rgba(230, 25, 130, 0.12); color: #e61982;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      animation: badge-fade-in 160ms ease-out;
    }
    @keyframes badge-fade-in { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
  `],
})
export class AiDiagramRendererComponent implements AfterViewInit, OnChanges {
  @Input() mermaid = '';
  @Input() title?: string;
  @Input() interactive = true;

  @ViewChild('host', { static: true }) host!: ElementRef<HTMLDivElement>;

  private zone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);
  private msg = inject(NzMessageService);

  errorMessage = '';
  _lastSvg = '';

  ngAfterViewInit() {
    this.renderDiagram();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['mermaid'] && !changes['mermaid'].firstChange) {
      this.renderDiagram();
    }
  }

  private async renderDiagram() {
    const code = (this.mermaid || '').trim();
    if (!code) {
      this.host.nativeElement.innerHTML = '';
      this.errorMessage = '';
      return;
    }
    try {
      const m = await ensureMermaid();
      const id = `ai-diagram-${++_renderSeq}-${Date.now()}`;
      const { svg } = await m.render(id, code);
      this._lastSvg = svg;
      this.zone.run(() => {
        this.host.nativeElement.innerHTML = svg;
        this.errorMessage = '';
        this.cdr.markForCheck();
      });
    } catch (e: any) {
      // Erreur de rendu → garde l'ancien SVG visible + affiche juste un petit indicateur discret
      this.zone.run(() => {
        this.errorMessage = 'adjusting';
        // NE PAS écraser host.innerHTML : le dernier rendu valide reste affiché
        this.cdr.markForCheck();
      });
    }
  }

  copyCode() {
    try {
      navigator.clipboard.writeText(this.mermaid || '');
      this.msg.success('Code Mermaid copié');
    } catch {
      this.msg.error('Impossible de copier');
    }
  }

  downloadSvg() {
    if (!this._lastSvg) return;
    const blob = new Blob([this._lastSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const name = (this.title || 'diagramme').replace(/[^a-z0-9-_]+/gi, '_').toLowerCase();
    a.href = url;
    a.download = `${name}.svg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
}
