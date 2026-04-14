import { Component, Input, inject, computed } from '@angular/core';
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
      <div class="files-toolbar" *ngIf="files()">
        <div class="files-root">
          <span nz-icon nzType="folder-open" nzTheme="outline"></span>
          <span>{{ files()?.rootLabel || 'Racine' }}</span>
          <span class="refresh-at" *ngIf="files()?.lastRefreshedAt">· {{ files()?.lastRefreshedAt | date:'short' }}</span>
        </div>
        <button nz-button nzSize="small" (click)="refresh()" [disabled]="refreshing">
          <span nz-icon nzType="reload" nzTheme="outline" [nzSpin]="refreshing"></span> Actualiser
        </button>
      </div>
      <div class="tree-body" *ngIf="nodes().length; else empty">
        <nz-tree
          [nzData]="nodes()"
          nzBlockNode
          (nzClick)="onClick($event)">
        </nz-tree>
      </div>
      <ng-template #empty>
        <div class="files-empty">
          <nz-empty nzNotFoundContent="Aucun fichier"></nz-empty>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; height: 100%; }
    .files-wrap { display: flex; flex-direction: column; height: 100%; }
    .files-toolbar { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-bottom: 1px solid #f0f0f0; background: #fafafa; }
    .files-root { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 500; color: #333; flex: 1; }
    .refresh-at { color: #bbb; font-weight: 400; font-size: 11px; }
    .tree-body { flex: 1; overflow: auto; padding: 8px; }
    .files-empty { flex: 1; display: flex; align-items: center; justify-content: center; padding: 20px; }
  `],
})
export class AiCanvasFilesComponent {
  @Input() threadId!: string;
  public ai = inject(AiService);
  private modal = inject(NzModalService);
  private nzMsg = inject(NzMessageService);

  refreshing = false;

  files = computed(() => this.ai.canvasState()?.files);

  nodes = computed<NzTreeNodeOptions[]>(() => {
    const tree = this.files()?.tree;
    if (!tree) return [];
    return Array.isArray(tree) ? this.mapNodes(tree) : this.mapNodes([tree]);
  });

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
