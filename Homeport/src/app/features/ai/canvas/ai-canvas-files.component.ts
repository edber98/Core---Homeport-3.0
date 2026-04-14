import { ChangeDetectorRef, Component, Input, OnInit, inject, computed, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTreeModule, NzFormatEmitEvent, NzTreeNodeOptions } from 'ng-zorro-antd/tree';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzMessageService } from 'ng-zorro-antd/message';
import { AiService } from '../ai.service';

@Component({
  selector: 'ai-canvas-files',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzIconModule, NzTreeModule, NzEmptyModule, NzModalModule],
  template: `
    <div class="files-wrap">
      <!-- Section 1 : Fichiers du projet (uniquement si mode projet) -->
      <div class="files-section" *ngIf="isProject()">
        <div class="section-head">
          <span nz-icon nzType="cloud" nzTheme="outline" class="sec-icon"></span>
          <span class="sec-label">{{ files()?.rootLabel || 'Fichiers du projet' }}</span>
          <button nz-button nzSize="small" nzType="text" (click)="refresh()" [disabled]="refreshing" title="Actualiser">
            <span nz-icon nzType="reload" nzTheme="outline" [nzSpin]="refreshing"></span>
          </button>
        </div>
        <div class="tree-body" *ngIf="nodes().length; else emptyProject">
          <nz-tree [nzData]="nodes()" nzBlockNode (nzClick)="onClick($event)"></nz-tree>
        </div>
        <ng-template #emptyProject>
          <div class="files-empty-mini">Aucun fichier dans le projet</div>
        </ng-template>
      </div>

      <!-- Section 2 : Fichiers partagés dans le chat -->
      <div class="files-section">
        <div class="section-head">
          <span nz-icon nzType="message" nzTheme="outline" class="sec-icon"></span>
          <span class="sec-label">Fichiers du chat ({{ chatFiles().length }})</span>
          <button nz-button nzSize="small" nzType="text" (click)="refreshChatFiles()" [disabled]="refreshingChat" title="Actualiser">
            <span nz-icon nzType="reload" nzTheme="outline" [nzSpin]="refreshingChat"></span>
          </button>
        </div>
        <div class="chat-files-list" *ngIf="chatFiles().length; else emptyChat">
          <div class="chat-file-item" *ngFor="let f of chatFiles(); trackBy: trackFile">
            <span nz-icon [nzType]="fileIcon(f.mimeType)" nzTheme="outline" class="chat-file-icon"></span>
            <div class="chat-file-info">
              <div class="chat-file-name" [title]="f.name">{{ f.name }}</div>
              <div class="chat-file-meta">
                <span>{{ formatSize(f.size) }}</span>
                <span *ngIf="f.createdAt">· {{ f.createdAt | date:'short' }}</span>
                <span *ngIf="f.origin === 'ai'" class="badge-ai">IA</span>
                <span *ngIf="f.origin === 'upload'" class="badge-user">Envoyé</span>
              </div>
            </div>
            <button nz-button nzSize="small" nzType="text" (click)="downloadChatFile(f)" title="Télécharger">
              <span nz-icon nzType="download" nzTheme="outline"></span>
            </button>
          </div>
        </div>
        <ng-template #emptyChat>
          <div class="files-empty-mini">Aucun fichier partagé dans ce chat</div>
        </ng-template>
      </div>
    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; height: 100%; }
    .files-wrap { display: flex; flex-direction: column; height: 100%; overflow: auto; gap: 12px; padding: 8px 0; }
    .files-section { display: flex; flex-direction: column; background: #fff; border: 1px solid #f0f0f0; border-radius: 8px; margin: 0 8px; overflow: hidden; }
    .section-head { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #fafafa; border-bottom: 1px solid #f0f0f0; }
    .sec-icon { color: #e61982; font-size: 14px; }
    .sec-label { flex: 1; font-size: 13px; font-weight: 500; color: #333; }
    .tree-body { max-height: 360px; overflow: auto; padding: 8px; }
    .files-empty-mini { padding: 16px; text-align: center; color: #999; font-size: 12px; font-style: italic; }
    .chat-files-list { max-height: 400px; overflow-y: auto; padding: 4px 0; }
    .chat-file-item { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-bottom: 1px solid #f5f5f5; transition: background 0.15s; }
    .chat-file-item:last-child { border-bottom: none; }
    .chat-file-item:hover { background: #fafafa; }
    .chat-file-icon { color: #666; font-size: 18px; flex-shrink: 0; }
    .chat-file-info { flex: 1; min-width: 0; }
    .chat-file-name { font-size: 13px; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .chat-file-meta { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #999; margin-top: 2px; }
    .badge-ai { background: rgba(230,25,130,0.1); color: #e61982; padding: 1px 6px; border-radius: 3px; font-weight: 500; }
    .badge-user { background: rgba(22,119,255,0.1); color: #1677ff; padding: 1px 6px; border-radius: 3px; font-weight: 500; }
  `],
})
export class AiCanvasFilesComponent implements OnInit {
  @Input() threadId!: string;
  public ai = inject(AiService);
  private modal = inject(NzModalService);
  private nzMsg = inject(NzMessageService);
  private cdr = inject(ChangeDetectorRef);

  refreshing = false;
  refreshingChat = false;
  chatFiles = signal<Array<{ id: string; name: string; mimeType: string; size: number; createdAt?: string; origin?: string }>>([]);

  files = computed(() => this.ai.canvasState()?.files);

  nodes = computed<NzTreeNodeOptions[]>(() => {
    const tree = this.files()?.tree;
    if (!tree) return [];
    return Array.isArray(tree) ? this.mapNodes(tree) : this.mapNodes([tree]);
  });

  isProject(): boolean {
    return this.ai.currentThread()?.mode === 'project';
  }

  trackFile(_i: number, f: any) { return f.id; }

  fileIcon(mime?: string): string {
    if (!mime) return 'file';
    if (mime.startsWith('image/')) return 'file-image';
    if (mime === 'application/pdf') return 'file-pdf';
    if (mime.includes('spreadsheet') || mime.includes('excel')) return 'file-excel';
    if (mime.includes('word') || mime.includes('document')) return 'file-word';
    if (mime.includes('presentation')) return 'file-ppt';
    if (mime.startsWith('text/')) return 'file-text';
    if (mime.startsWith('video/')) return 'video-camera';
    if (mime.startsWith('audio/')) return 'sound';
    if (mime.includes('zip') || mime.includes('tar') || mime.includes('gzip')) return 'file-zip';
    return 'file';
  }

  formatSize(bytes: number): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  }

  async refreshChatFiles() {
    if (!this.threadId) return;
    this.refreshingChat = true;
    try {
      const list = await this.ai.listThreadFiles(this.threadId);
      this.chatFiles.set(list || []);
    } catch (e: any) {
      this.nzMsg.error(e?.message || 'Erreur chargement fichiers');
    } finally {
      this.refreshingChat = false;
      this.cdr.markForCheck();
    }
  }

  downloadChatFile(f: any) {
    if (!f?.id) return;
    window.open(this.ai.fileUrl(f.id), '_blank');
  }

  constructor() {
    effect(() => {
      this.ai.canvasState()?.files;
      queueMicrotask(() => this.cdr.markForCheck());
    });
  }

  ngOnInit() {
    // Charge fichiers du chat systématiquement
    if (this.threadId) this.refreshChatFiles();
    // Auto-refresh arborescence projet si vide (en mode projet uniquement)
    if (this.isProject()) {
      const tree = this.files()?.tree;
      const hasData = Array.isArray(tree) ? tree.length > 0 : !!tree;
      if (this.threadId && !hasData) this.refresh();
    }
  }

  private mapNodes(arr: any[]): NzTreeNodeOptions[] {
    return (arr || []).map((n, i) => ({
      title: n.name || n.label || n.path || '—',
      key: n.id || n.path || `${i}_${n.name}`,
      isLeaf: !n.children || !n.children.length,
      icon: n.type === 'directory' || n.children ? 'folder' : 'file',
      expanded: false,
      children: n.children ? this.mapNodes(n.children) : [],
      origin: n,
    })) as any;
  }

  async refresh() {
    if (!this.threadId) return;
    this.refreshing = true;
    try {
      await this.ai.refreshProjectRoot(this.threadId);
      this.nzMsg.success('Arborescence actualisée');
    } catch (e: any) {
      this.nzMsg.error(e?.message || 'Erreur lors de l\'actualisation');
    } finally {
      this.refreshing = false;
    }
  }

  onClick(evt: NzFormatEmitEvent) {
    const node = evt.node?.origin as any;
    if (!node || !node.origin) return;
    const file = node.origin;
    if (file.type === 'directory' || file.children) return;
    this.preview(file);
  }

  async preview(file: any) {
    // Open a modal with file content preview
    this.modal.create({
      nzTitle: file.name || file.path,
      nzContent: `<pre style="max-height:60vh;overflow:auto;font-size:12px;">Chargement…</pre>`,
      nzWidth: 820,
      nzFooter: null,
    });
    // Note: actual file content read would use a dedicated API call
  }
}
