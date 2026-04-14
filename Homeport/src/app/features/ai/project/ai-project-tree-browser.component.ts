import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzTreeModule, NzTreeNodeOptions, NzFormatEmitEvent } from 'ng-zorro-antd/tree';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { AiService } from '../ai.service';

@Component({
  selector: 'ai-project-tree-browser',
  standalone: true,
  imports: [CommonModule, FormsModule, NzTreeModule, NzIconModule, NzSpinModule],
  template: `
    <div class="tree-wrap">
      <nz-spin [nzSpinning]="loading">
        <div class="path-breadcrumb">
          <span nz-icon nzType="folder" nzTheme="outline"></span>
          <span class="path">{{ selectedPath || '/' }}</span>
        </div>
        <nz-tree
          [nzData]="nodes"
          nzBlockNode
          nzAsyncData
          (nzClick)="onClick($event)"
          (nzExpandChange)="onExpand($event)">
        </nz-tree>
      </nz-spin>
    </div>
  `,
  styles: [`
    .tree-wrap { min-height: 220px; max-height: 360px; overflow: auto; border: 1px solid #f0f0f0; border-radius: 6px; padding: 8px; background: #fff; }
    .path-breadcrumb { display: flex; align-items: center; gap: 6px; padding: 4px 8px; background: #fafafa; border-radius: 4px; margin-bottom: 6px; font-size: 12px; color: #555; }
    .path { font-family: monospace; }
  `],
})
export class AiProjectTreeBrowserComponent implements OnInit {
  @Input() connectorType!: string;
  @Input() credentialId!: string;
  @Output() pathSelected = new EventEmitter<string>();

  public ai = inject(AiService);
  private cdr = inject(ChangeDetectorRef);
  nodes: NzTreeNodeOptions[] = [];
  selectedPath = '/';
  loading = false;

  ngOnInit() { this.loadPath('/', null); }

  private isDir(e: any): boolean {
    const t = (e.type || '').toLowerCase();
    if (t === 'directory' || t === 'folder' || t === 'dir') return true;
    if (e.isFolder || e.is_dir) return true;
    if (e['.tag'] === 'folder') return true;
    if (e.mimeType === 'application/vnd.google-apps.folder') return true;
    if (e.mime === 'httpd/unix-directory') return true;
    return false;
  }

  loadPath(path: string, parent: any) {
    if (!this.connectorType || !this.credentialId) return;
    this.loading = !parent;
    this.ai.browseProjectPath(this.connectorType, this.credentialId, path).subscribe({
      next: (data: any) => {
        const rawList = data?.entries || data?.files || data?.items || data?.raw?.entries || data?.raw?.files || data?.raw || data || [];
        const items = (Array.isArray(rawList) ? rawList : []).map((e: any) => ({
          title: e.name || e.title || (e.path ? e.path.split('/').filter(Boolean).pop() : '(sans nom)'),
          key: e.path || e.fullPath || `${path.replace(/\/$/, '')}/${e.name || ''}`,
          isLeaf: !this.isDir(e),
          icon: this.isDir(e) ? 'folder' : 'file',
          expanded: false,
          children: [],
        }));
        if (!parent) {
          this.nodes = items;
        } else if (typeof parent.addChildren === 'function') {
          parent.addChildren(items);
        } else {
          parent.children = items;
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loading = false; this.cdr.detectChanges(); },
    });
  }

  onClick(evt: NzFormatEmitEvent) {
    const node = evt.node;
    if (!node) return;
    this.selectedPath = String(node.key);
    this.pathSelected.emit(this.selectedPath);
  }

  onExpand(evt: NzFormatEmitEvent) {
    const node = evt.node;
    if (!node || !node.isExpanded) return;
    if (node.getChildren().length) return;
    this.loadPath(String(node.key), node);
  }
}
