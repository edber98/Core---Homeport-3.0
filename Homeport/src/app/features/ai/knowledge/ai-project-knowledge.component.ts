import { ChangeDetectorRef, Component, Input, OnChanges, OnInit, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzUploadModule, NzUploadFile } from 'ng-zorro-antd/upload';
import { AiService, AiProjectKnowledge, AiProjectKnowledgeEntry, AiProjectKnowledgeType } from '../ai.service';
import { AiKnowledgeEntryDialogComponent, AiKnowledgeDialogData } from './ai-knowledge-entry-dialog.component';

@Component({
  selector: 'ai-project-knowledge',
  standalone: true,
  imports: [
    CommonModule, FormsModule, NzTableModule, NzButtonModule, NzIconModule, NzTagModule,
    NzInputModule, NzSelectModule, NzPopconfirmModule, NzToolTipModule, NzEmptyModule, NzUploadModule,
  ],
  template: `
    <div class="kb-root">
      <div class="kb-toolbar">
        <div class="kb-filters">
          <nz-input-group [nzPrefix]="searchIcon" class="search">
            <input nz-input type="text" placeholder="Rechercher une clé…" [(ngModel)]="searchQuery" />
          </nz-input-group>
          <ng-template #searchIcon><span nz-icon nzType="search"></span></ng-template>

          <nz-select *ngIf="allTags.length" [(ngModel)]="selectedTag" nzAllowClear nzPlaceHolder="Tous les tags" style="min-width: 160px;">
            <nz-option *ngFor="let t of allTags" [nzValue]="t" [nzLabel]="t"></nz-option>
          </nz-select>
        </div>
        <div class="kb-actions">
          <button nz-button nzType="primary" (click)="openEntryDialog()">
            <span nz-icon nzType="plus"></span> Ajouter une entrée
          </button>
          <nz-upload [nzBeforeUpload]="beforeImport" [nzShowUploadList]="false" [nzAccept]="'.json,.csv'">
            <button nz-button>
              <span nz-icon nzType="import"></span> Importer
            </button>
          </nz-upload>
          <button nz-button (click)="exportAs('json')">
            <span nz-icon nzType="export"></span> JSON
          </button>
          <button nz-button (click)="exportAs('csv')">
            <span nz-icon nzType="export"></span> CSV
          </button>
        </div>
      </div>

      <nz-table *ngIf="filtered().length; else emptyTpl"
                #tbl [nzData]="filtered()" nzSize="small" [nzShowPagination]="false" [nzBordered]="false">
        <thead>
          <tr>
            <th style="width:40px;"></th>
            <th>Clé</th>
            <th>Valeur</th>
            <th style="width:90px;">Type</th>
            <th>Description</th>
            <th style="width:140px;">Tags</th>
            <th style="width:110px;">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let e of tbl.data" [class.pinned]="e.pinned">
            <td>
              <button nz-button nzType="text" nzSize="small"
                      (click)="togglePin(e)"
                      [nz-tooltip]="e.pinned ? 'Détacher' : 'Épingler'">
                <span nz-icon [nzType]="'pushpin'" [nzTheme]="e.pinned ? 'fill' : 'outline'"
                      [class.pinned-icon]="e.pinned"></span>
              </button>
            </td>
            <td><code class="kb-key">{{ e.key }}</code></td>
            <td><span class="kb-value" [innerHTML]="renderValue(e)"></span></td>
            <td><nz-tag [nzColor]="typeColor(e.type)">{{ typeLabel(e.type) }}</nz-tag></td>
            <td class="kb-desc">{{ e.description || '—' }}</td>
            <td>
              <nz-tag *ngFor="let t of e.tags" nzColor="default">{{ t }}</nz-tag>
            </td>
            <td class="kb-row-actions">
              <button nz-button nzType="text" nzSize="small" (click)="openEntryDialog(e)" nz-tooltip nzTooltipTitle="Modifier">
                <span nz-icon nzType="edit"></span>
              </button>
              <button nz-button nzType="text" nzSize="small" nzDanger
                      nz-popconfirm nzPopconfirmTitle="Supprimer cette entrée ?"
                      (nzOnConfirm)="removeEntry(e)" nz-tooltip nzTooltipTitle="Supprimer">
                <span nz-icon nzType="delete"></span>
              </button>
            </td>
          </tr>
        </tbody>
      </nz-table>
      <ng-template #emptyTpl>
        <nz-empty nzNotFoundContent="Aucune entrée — commence par ajouter les informations clés du projet (client, budget, contacts…)"></nz-empty>
      </ng-template>
    </div>
  `,
  styles: [`
    .kb-root { display: flex; flex-direction: column; gap: 12px; }
    .kb-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    .kb-filters { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
    .kb-filters .search { max-width: 280px; }
    .kb-actions { display: flex; align-items: center; gap: 6px; }
    .kb-key { font-size: 12px; background: #f5f5f5; padding: 2px 6px; border-radius: 4px; color: #1677ff; }
    .kb-value { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 340px; display: inline-block; vertical-align: middle; }
    .kb-desc { color: #8c8c8c; font-size: 12px; }
    .kb-row-actions { display: flex; gap: 2px; }
    tr.pinned { background: #fffbe6; }
    tr.pinned:hover { background: #fff1b8 !important; }
    .pinned-icon { color: #faad14; }
  `],
})
export class AiProjectKnowledgeComponent implements OnInit, OnChanges {
  @Input() threadId!: string;

  private ai = inject(AiService);
  private modal = inject(NzModalService);
  private msg = inject(NzMessageService);
  private cdr = inject(ChangeDetectorRef);

  doc: AiProjectKnowledge | null = null;
  entries: AiProjectKnowledgeEntry[] = [];
  searchQuery = '';
  selectedTag: string | null = null;

  ngOnInit() { if (this.threadId) this.load(); }
  ngOnChanges(changes: SimpleChanges) {
    if (changes['threadId'] && !changes['threadId'].firstChange) this.load();
  }

  get allTags(): string[] {
    const s = new Set<string>();
    for (const e of this.entries) for (const t of e.tags || []) s.add(t);
    return Array.from(s).sort();
  }

  filtered(): AiProjectKnowledgeEntry[] {
    const q = this.searchQuery.trim().toLowerCase();
    let list = this.entries;
    if (this.selectedTag) list = list.filter(e => (e.tags || []).includes(this.selectedTag!));
    if (q) list = list.filter(e =>
      e.key.toLowerCase().includes(q) ||
      (e.description || '').toLowerCase().includes(q) ||
      String(e.value ?? '').toLowerCase().includes(q)
    );
    // Pinned first, then alphabetical
    return [...list].sort((a, b) => {
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
      return a.key.localeCompare(b.key);
    });
  }

  load() {
    this.ai.getProjectKnowledge(this.threadId).subscribe({
      next: (res: any) => {
        const doc = res?.data || res;
        this.doc = doc;
        this.entries = doc?.entries || [];
        this.cdr.detectChanges();
      },
      error: (e) => {
        console.error('[ai-knowledge] load error', e);
        this.entries = [];
        this.cdr.detectChanges();
      },
    });
  }

  openEntryDialog(entry?: AiProjectKnowledgeEntry) {
    const data: AiKnowledgeDialogData = {
      entry: entry || null,
      existingKeys: this.entries.map(e => e.key),
    };
    const ref = this.modal.create({
      nzTitle: entry ? `Modifier : ${entry.key}` : 'Ajouter une entrée',
      nzContent: AiKnowledgeEntryDialogComponent,
      nzData: data,
      nzFooter: null,
      nzWidth: 560,
      nzMaskClosable: false,
    });
    ref.afterClose.subscribe((result: AiProjectKnowledgeEntry | null) => {
      if (!result) return;
      if (entry?._id) {
        this.ai.updateKnowledgeEntry(this.threadId, entry._id, result).subscribe({
          next: () => { this.msg.success('Entrée mise à jour'); this.load(); },
          error: (e) => this.msg.error(e?.error?.error?.message || 'Erreur mise à jour'),
        });
      } else {
        this.ai.addKnowledgeEntry(this.threadId, result).subscribe({
          next: () => { this.msg.success('Entrée ajoutée'); this.load(); },
          error: (e) => this.msg.error(e?.error?.error?.message || 'Erreur ajout'),
        });
      }
    });
  }

  togglePin(entry: AiProjectKnowledgeEntry) {
    if (!entry._id) return;
    this.ai.updateKnowledgeEntry(this.threadId, entry._id, { pinned: !entry.pinned }).subscribe({
      next: () => this.load(),
      error: () => this.msg.error('Erreur épinglage'),
    });
  }

  removeEntry(entry: AiProjectKnowledgeEntry) {
    if (!entry._id) return;
    this.ai.deleteKnowledgeEntry(this.threadId, entry._id).subscribe({
      next: () => { this.msg.success('Entrée supprimée'); this.load(); },
      error: () => this.msg.error('Erreur suppression'),
    });
  }

  // ── Import / export ──
  beforeImport = (file: NzUploadFile): boolean => {
    const reader = new FileReader();
    const ext = (file.name || '').toLowerCase().endsWith('.csv') ? 'csv' : 'json';
    reader.onload = () => {
      const text = String(reader.result || '');
      this.ai.importKnowledge(this.threadId, ext as 'csv' | 'json', text, 'merge').subscribe({
        next: (res: any) => {
          const r = res?.data || res;
          this.msg.success(`${r.imported || 0} entrée(s) importée(s)` + (r.errors?.length ? ` (${r.errors.length} erreur(s))` : ''));
          this.load();
        },
        error: (e) => this.msg.error(e?.error?.error?.message || 'Erreur import'),
      });
    };
    reader.readAsText(file as any);
    return false; // prevent auto upload
  };

  async exportAs(format: 'json' | 'csv') {
    try {
      const blob = await this.ai.exportKnowledge(this.threadId, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `knowledge-${this.threadId}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      this.msg.error(e?.message || 'Erreur export');
    }
  }

  // ── Rendering helpers ──
  renderValue(e: AiProjectKnowledgeEntry): string {
    const v = e.value;
    if (v == null || v === '') return '<span style="color:#bfbfbf">—</span>';
    switch (e.type) {
      case 'url':
        return `<a href="${this.escape(String(v))}" target="_blank" rel="noopener">${this.escape(String(v))}</a>`;
      case 'email':
        return `<a href="mailto:${this.escape(String(v))}">${this.escape(String(v))}</a>`;
      case 'date': {
        try { return this.escape(new Date(v).toLocaleDateString('fr-FR')); } catch { return this.escape(String(v)); }
      }
      case 'boolean':
        return v ? '<span style="color:#52c41a">Oui</span>' : '<span style="color:#8c8c8c">Non</span>';
      case 'list':
        return Array.isArray(v) ? v.map(x => `<span class="list-chip">${this.escape(String(x))}</span>`).join(' ') : this.escape(String(v));
      case 'number':
        return this.escape(String(v));
      case 'json':
        return `<code>${this.escape(typeof v === 'string' ? v : JSON.stringify(v))}</code>`;
      default:
        return this.escape(String(v));
    }
  }
  private escape(s: string): string {
    return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
  }
  typeLabel(t?: AiProjectKnowledgeType): string {
    const map: Record<string, string> = {
      text: 'Texte', number: 'Nombre', date: 'Date', url: 'URL', email: 'Email',
      file: 'Fichier', list: 'Liste', boolean: 'Booléen', json: 'JSON',
    };
    return map[t || 'text'] || String(t || '');
  }
  typeColor(t?: AiProjectKnowledgeType): string {
    const map: Record<string, string> = {
      text: 'default', number: 'blue', date: 'purple', url: 'geekblue', email: 'cyan',
      file: 'gold', list: 'orange', boolean: 'green', json: 'magenta',
    };
    return map[t || 'text'] || 'default';
  }
}
