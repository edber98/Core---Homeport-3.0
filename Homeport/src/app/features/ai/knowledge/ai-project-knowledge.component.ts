import { ChangeDetectorRef, Component, Input, OnChanges, OnInit, SimpleChanges, inject, signal, computed } from '@angular/core';
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
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzUploadModule, NzUploadFile } from 'ng-zorro-antd/upload';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { AiService, AiProjectKnowledge, AiProjectKnowledgeEntry, AiProjectKnowledgeType, AiProjectKnowledgeStatus } from '../ai.service';
import { AiKnowledgeEntryDialogComponent, AiKnowledgeDialogData } from './ai-knowledge-entry-dialog.component';
import { AiKnowledgeGraphComponent } from './ai-knowledge-graph.component';
import { NzRadioModule } from 'ng-zorro-antd/radio';

const DOC_OVERVIEW_KEY = 'doc.overview';

type FilterTab = 'all' | 'approved' | 'pending' | 'rejected';

@Component({
  selector: 'ai-project-knowledge',
  standalone: true,
  imports: [
    CommonModule, FormsModule, NzTableModule, NzButtonModule, NzIconModule, NzTagModule,
    NzInputModule, NzSelectModule, NzPopconfirmModule, NzToolTipModule, NzEmptyModule, NzUploadModule, NzBadgeModule,
    NzRadioModule, AiKnowledgeGraphComponent,
  ],
  template: `
    <div class="kb-root">
      <!-- Onglets de filtre par statut -->
      <div class="kb-tabs">
        <button class="kb-tab" [class.active]="filterTab() === 'all'" (click)="setFilter('all')">
          Tous <span class="tab-count">{{ counts().total }}</span>
        </button>
        <button class="kb-tab" [class.active]="filterTab() === 'approved'" (click)="setFilter('approved')">
          <span nz-icon nzType="check-circle" nzTheme="outline"></span> Approuvés <span class="tab-count">{{ counts().approved }}</span>
        </button>
        <button class="kb-tab pending" [class.active]="filterTab() === 'pending'" (click)="setFilter('pending')">
          <span nz-icon nzType="clock-circle" nzTheme="outline"></span> En attente
          <span class="tab-count pending-count" *ngIf="counts().pending > 0">{{ counts().pending }}</span>
          <span class="tab-count" *ngIf="counts().pending === 0">0</span>
        </button>
        <button class="kb-tab" [class.active]="filterTab() === 'rejected'" (click)="setFilter('rejected')">
          <span nz-icon nzType="close-circle" nzTheme="outline"></span> Rejetés <span class="tab-count">{{ counts().rejected }}</span>
        </button>
      </div>

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
          <nz-radio-group [(ngModel)]="viewMode" nzButtonStyle="solid" nzSize="small">
            <label nz-radio-button nzValue="cards" nz-tooltip nzTooltipTitle="Vue cartes">
              <span nz-icon nzType="appstore" nzTheme="outline"></span>
            </label>
            <label nz-radio-button nzValue="graph" nz-tooltip nzTooltipTitle="Vue graphe">
              <span nz-icon nzType="deployment-unit" nzTheme="outline"></span>
            </label>
          </nz-radio-group>
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

      <!-- Doc projet auto-générée (card pleine largeur en haut) -->
      <div class="kb-doc-overview" *ngIf="overviewEntry() as ov">
        <div class="doc-head">
          <span class="doc-icon" nz-icon nzType="file-text" nzTheme="outline"></span>
          <div class="doc-titles">
            <div class="doc-title">Documentation projet</div>
            <div class="doc-sub">Générée automatiquement — mise à jour en arrière-plan</div>
          </div>
          <span class="doc-spacer"></span>
          <button nz-button nzType="text" nzSize="small"
                  (click)="openEntryDialog(ov)"
                  nz-tooltip nzTooltipTitle="Modifier">
            <span nz-icon nzType="edit"></span>
          </button>
          <button nz-button nzType="text" nzSize="small" nzDanger
                  nz-popconfirm nzPopconfirmTitle="Supprimer la documentation auto-générée ?"
                  (nzOnConfirm)="removeEntry(ov)"
                  nz-tooltip nzTooltipTitle="Supprimer">
            <span nz-icon nzType="delete"></span>
          </button>
        </div>
        <div class="doc-markdown" [innerHTML]="renderMarkdown(ov)"></div>
      </div>

      <!-- Graph view -->
      <ai-knowledge-graph *ngIf="viewMode === 'graph' && filtered().length"
                          [entries]="filtered()"
                          (selectEntry)="onGraphNodeClick($event)">
      </ai-knowledge-graph>

      <!-- Cards view -->
      <div class="kb-grid" *ngIf="viewMode === 'cards' && filtered().length; else emptyTpl">
        <div class="kb-card"
             *ngFor="let e of filtered()"
             [class.card-pending]="getStatus(e) === 'pending'"
             [class.card-rejected]="getStatus(e) === 'rejected'"
             [class.card-pinned]="e.pinned">
          <div class="card-head">
            <nz-tag [nzColor]="typeColor(e.type)" class="card-type">{{ typeLabel(e.type) }}</nz-tag>
            <span class="card-status" *ngIf="getStatus(e) === 'pending'">
              <span nz-icon nzType="clock-circle" nzTheme="outline"></span> En attente
            </span>
            <span class="card-status card-status-approved" *ngIf="getStatus(e) === 'approved'">
              <span nz-icon nzType="check-circle" nzTheme="fill"></span>
            </span>
            <span class="card-status card-status-rejected" *ngIf="getStatus(e) === 'rejected'">
              <span nz-icon nzType="close-circle" nzTheme="fill"></span> Rejeté
            </span>
            <span class="card-spacer"></span>
            <button nz-button nzType="text" nzSize="small" class="pin-btn"
                    (click)="togglePin(e)"
                    [nz-tooltip]="e.pinned ? 'Détacher' : 'Épingler'">
              <span nz-icon nzType="pushpin" [nzTheme]="e.pinned ? 'fill' : 'outline'"
                    [class.pinned-icon]="e.pinned"></span>
            </button>
          </div>
          <code class="card-key">{{ e.key }}</code>
          <div class="card-value" [innerHTML]="renderValue(e)"></div>
          <div *ngIf="e.description" class="card-desc">{{ e.description }}</div>
          <div *ngIf="getStatus(e) === 'pending' && e.suggestionWhy" class="card-why"
               [nz-tooltip]="e.suggestionWhy">
            <span nz-icon nzType="message" nzTheme="outline"></span>
            <span>{{ e.suggestionWhy }}</span>
          </div>
          <div class="card-tags" *ngIf="e.tags?.length">
            <nz-tag *ngFor="let t of e.tags" nzColor="default">{{ t }}</nz-tag>
          </div>
          <div class="card-actions">
            <ng-container *ngIf="getStatus(e) === 'pending'">
              <button nz-button nzType="primary" nzSize="small" class="kb-btn-approve" (click)="approve(e)">
                <span nz-icon nzType="check"></span> Approuver
              </button>
              <button nz-button nzSize="small" (click)="openEntryDialog(e, true)"
                      nz-tooltip nzTooltipTitle="Modifier avant d'approuver">
                <span nz-icon nzType="edit"></span>
              </button>
              <button nz-button nzSize="small" nzDanger (click)="reject(e)"
                      nz-tooltip nzTooltipTitle="Rejeter">
                <span nz-icon nzType="close"></span>
              </button>
            </ng-container>
            <ng-container *ngIf="getStatus(e) !== 'pending'">
              <button nz-button nzType="text" nzSize="small" (click)="openEntryDialog(e)"
                      nz-tooltip nzTooltipTitle="Modifier">
                <span nz-icon nzType="edit"></span>
              </button>
              <button nz-button nzType="text" nzSize="small" nzDanger
                      nz-popconfirm nzPopconfirmTitle="Supprimer cette entrée ?"
                      (nzOnConfirm)="removeEntry(e)"
                      nz-tooltip nzTooltipTitle="Supprimer">
                <span nz-icon nzType="delete"></span>
              </button>
            </ng-container>
          </div>
        </div>
      </div>
      <ng-template #emptyTpl>
        <nz-empty [nzNotFoundContent]="emptyMessage()"></nz-empty>
      </ng-template>
    </div>
  `,
  styles: [`
    .kb-root { display: flex; flex-direction: column; gap: 12px; }
    .kb-tabs { display: flex; gap: 4px; border-bottom: 1px solid #f0f0f0; padding-bottom: 0; }
    .kb-tab {
      background: transparent; border: none; padding: 8px 14px; cursor: pointer; font-size: 13px;
      border-bottom: 2px solid transparent; color: #595959; display: inline-flex; align-items: center; gap: 6px;
      transition: all 0.15s;
    }
    .kb-tab:hover { color: #1677ff; }
    .kb-tab.active { color: #1677ff; border-bottom-color: #1677ff; font-weight: 500; }
    .kb-tab.pending .pending-count { background: #faad14; color: white; }
    .tab-count { display: inline-block; min-width: 20px; padding: 0 6px; border-radius: 10px; font-size: 11px; background: #f0f0f0; color: #595959; line-height: 18px; font-weight: 600; }
    .kb-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    .kb-filters { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
    .kb-filters .search { max-width: 280px; }
    .kb-actions { display: flex; align-items: center; gap: 6px; }
    .kb-key { font-size: 12px; background: #f5f5f5; padding: 2px 6px; border-radius: 4px; color: #1677ff; }
    .kb-value { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 340px; display: inline-block; vertical-align: middle; }
    .kb-why { font-size: 11px; color: #8c8c8c; margin-top: 4px; font-style: italic; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 340px; }
    .kb-desc { color: #8c8c8c; font-size: 12px; }
    .kb-row-actions { display: flex; gap: 4px; flex-wrap: nowrap; }
    tr.pinned { background: #fffbe6; }
    tr.pinned:hover { background: #fff1b8 !important; }
    tr.row-pending { background: #fffbe6 !important; }
    tr.row-pending:hover { background: #fff1b8 !important; }
    tr.row-rejected { background: #fafafa !important; opacity: 0.7; }
    .pinned-icon { color: #faad14; }
    .kb-btn-approve { background: #52c41a !important; border-color: #52c41a !important; }
    .kb-btn-approve:hover { background: #73d13d !important; border-color: #73d13d !important; }

    /* ── Card grid ── */
    .kb-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
    .kb-card {
      background: #fff; border: 1px solid #f0f0f0; border-radius: 10px; padding: 12px 14px;
      display: flex; flex-direction: column; gap: 8px;
      transition: border-color .15s, box-shadow .15s, transform .15s;
      position: relative;
    }
    .kb-card:hover { border-color: #d9d9d9; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
    .kb-card.card-pending { background: #fffbe6; border-color: #ffe58f; border-left: 3px solid #faad14; }
    .kb-card.card-rejected { background: #fafafa; opacity: 0.75; border-left: 3px solid #bfbfbf; }
    .kb-card.card-pinned { background: #fffbe6; border-color: #ffe58f; }

    .card-head { display: flex; align-items: center; gap: 6px; }
    .card-spacer { flex: 1; }
    .card-type { margin: 0; font-size: 11px; font-weight: 500; }
    .card-status { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 500; color: #faad14; }
    .card-status-approved { color: #52c41a; }
    .card-status-rejected { color: #ff4d4f; }
    .pin-btn { color: #bfbfbf; padding: 0 4px; height: 22px; }
    .pin-btn:hover { color: #faad14; }
    .pin-btn .pinned-icon { color: #faad14; }

    .card-key { font-family: Menlo, Monaco, 'Courier New', monospace; font-size: 11px;
                background: #f5f5f5; padding: 3px 8px; border-radius: 4px; color: #1677ff;
                align-self: flex-start; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .card-value { font-size: 13px; color: #262626; font-weight: 500; word-break: break-word; line-height: 1.45; }
    .card-value a { color: #1677ff; }
    .card-value .list-chip { display: inline-block; background: #e6f7ff; color: #1677ff; padding: 1px 8px; border-radius: 10px; font-size: 11px; margin: 2px 4px 2px 0; }
    .card-desc { font-size: 12px; color: #8c8c8c; line-height: 1.4; }
    .card-why { display: flex; gap: 6px; font-size: 11px; color: #595959; font-style: italic;
                background: rgba(250,173,20,0.08); padding: 6px 8px; border-radius: 6px;
                border-left: 2px solid #faad14;
                overflow: hidden; }
    .card-why > span:last-child { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;
                                  overflow: hidden; line-height: 1.4; }
    .card-tags { display: flex; flex-wrap: wrap; gap: 4px; }
    .card-actions { display: flex; gap: 6px; margin-top: auto; padding-top: 4px; border-top: 1px dashed #f0f0f0; }
    .card-actions .kb-btn-approve { flex: 1; }

    @media (max-width: 640px) {
      .kb-grid { grid-template-columns: 1fr; }
    }

    /* ── Doc.overview special card (full width markdown) ── */
    .kb-doc-overview {
      background: linear-gradient(180deg, #f6f9ff 0%, #ffffff 100%);
      border: 1px solid #d6e4ff;
      border-left: 3px solid #1677ff;
      border-radius: 10px;
      padding: 14px 18px 16px;
      margin-bottom: 4px;
      box-shadow: 0 2px 8px rgba(22, 119, 255, 0.05);
    }
    .kb-doc-overview .doc-head {
      display: flex; align-items: center; gap: 10px;
      padding-bottom: 10px; margin-bottom: 10px;
      border-bottom: 1px dashed #e6efff;
    }
    .kb-doc-overview .doc-icon { color: #1677ff; font-size: 18px; }
    .kb-doc-overview .doc-titles { display: flex; flex-direction: column; gap: 2px; }
    .kb-doc-overview .doc-title { font-size: 14px; font-weight: 600; color: #1677ff; }
    .kb-doc-overview .doc-sub { font-size: 11px; color: #8c8c8c; }
    .kb-doc-overview .doc-spacer { flex: 1; }
    .kb-doc-overview .doc-markdown {
      font-size: 13px; line-height: 1.55; color: #262626;
    }
    .kb-doc-overview .doc-markdown h1 {
      font-size: 16px; margin: 14px 0 6px; color: #1677ff; font-weight: 600;
      border-bottom: 1px solid #f0f5ff; padding-bottom: 4px;
    }
    .kb-doc-overview .doc-markdown h1:first-child { margin-top: 0; }
    .kb-doc-overview .doc-markdown h2 { font-size: 14px; margin: 12px 0 4px; font-weight: 600; }
    .kb-doc-overview .doc-markdown h3 { font-size: 13px; margin: 10px 0 4px; font-weight: 600; }
    .kb-doc-overview .doc-markdown p { margin: 4px 0 8px; }
    .kb-doc-overview .doc-markdown ul,
    .kb-doc-overview .doc-markdown ol { margin: 4px 0 8px; padding-left: 22px; }
    .kb-doc-overview .doc-markdown li { margin: 2px 0; }
    .kb-doc-overview .doc-markdown code {
      background: #f5f5f5; padding: 1px 5px; border-radius: 3px; font-size: 12px;
      font-family: Menlo, Monaco, 'Courier New', monospace;
    }
    .kb-doc-overview .doc-markdown pre {
      background: #fafafa; padding: 10px 12px; border-radius: 6px; overflow-x: auto;
      border: 1px solid #f0f0f0;
    }
    .kb-doc-overview .doc-markdown pre code { background: transparent; padding: 0; }
    .kb-doc-overview .doc-markdown a { color: #1677ff; }
    .kb-doc-overview .doc-markdown blockquote {
      border-left: 3px solid #d6e4ff; padding: 2px 12px; margin: 8px 0;
      color: #595959; background: #fafbff;
    }
    .kb-doc-overview .doc-markdown table {
      border-collapse: collapse; margin: 8px 0; font-size: 12px;
    }
    .kb-doc-overview .doc-markdown th,
    .kb-doc-overview .doc-markdown td {
      border: 1px solid #f0f0f0; padding: 4px 8px;
    }
    .kb-doc-overview .doc-markdown th { background: #fafafa; font-weight: 600; }
  `],
})
export class AiProjectKnowledgeComponent implements OnInit, OnChanges {
  @Input() threadId!: string;
  @Input() initialFilter: FilterTab = 'all';

  private ai = inject(AiService);
  private modal = inject(NzModalService);
  private msg = inject(NzMessageService);
  private cdr = inject(ChangeDetectorRef);

  doc: AiProjectKnowledge | null = null;
  // Signal pour que les computed() (counts, filtered, tags) se re-évaluent
  // dès que la liste change. Une propriété array ne déclenche pas de re-compute.
  entriesSig = signal<AiProjectKnowledgeEntry[]>([]);
  get entries(): AiProjectKnowledgeEntry[] { return this.entriesSig(); }
  set entries(v: AiProjectKnowledgeEntry[]) { this.entriesSig.set(v || []); }
  searchQuery = '';
  selectedTag: string | null = null;
  filterTab = signal<FilterTab>('all');
  viewMode: 'cards' | 'graph' = 'cards';

  /** Ouvre la modale d'édition pour l'entry cliquée depuis le graphe. */
  onGraphNodeClick(nodeId: string) {
    const e = this.entriesSig().find(x => (x._id || x.key) === nodeId);
    if (e) this.openEntryDialog(e);
  }

  counts = computed(() => {
    const list = this.entriesSig();
    const total = list.length;
    let approved = 0, pending = 0, rejected = 0;
    for (const e of list) {
      const s = this.getStatus(e);
      if (s === 'approved') approved++;
      else if (s === 'pending') pending++;
      else if (s === 'rejected') rejected++;
    }
    return { total, approved, pending, rejected };
  });

  /** Entrée spéciale `doc.overview` affichée en haut en card pleine largeur markdown. */
  overviewEntry = computed<AiProjectKnowledgeEntry | null>(() => {
    const list = this.entriesSig();
    const found = list.find(e => e.key === DOC_OVERVIEW_KEY);
    return found || null;
  });

  ngOnInit() {
    if (this.initialFilter) this.filterTab.set(this.initialFilter);
    if (this.threadId) this.load();
  }
  ngOnChanges(changes: SimpleChanges) {
    // Load dès que threadId passe de null/undefined à une vraie valeur
    // (cas où ai-settings fournit le currentThreadId après loadContext).
    if (changes['threadId']) {
      const prev = changes['threadId'].previousValue;
      const cur = changes['threadId'].currentValue;
      if (cur && cur !== prev) this.load();
    }
    if (changes['initialFilter'] && changes['initialFilter'].currentValue) {
      this.filterTab.set(changes['initialFilter'].currentValue);
    }
  }

  setFilter(tab: FilterTab) {
    this.filterTab.set(tab);
  }

  getStatus(e: AiProjectKnowledgeEntry): AiProjectKnowledgeStatus {
    // Entries sans status (legacy) sont traitées comme 'approved'
    return (e.status as AiProjectKnowledgeStatus) || 'approved';
  }

  emptyMessage(): string {
    switch (this.filterTab()) {
      case 'pending': return 'Aucune suggestion en attente pour le moment.';
      case 'rejected': return 'Aucune suggestion rejetée.';
      case 'approved': return 'Aucune entrée approuvée — commence par ajouter les informations clés du projet.';
      default: return 'Aucune entrée — commence par ajouter les informations clés du projet (client, budget, contacts…)';
    }
  }

  get allTags(): string[] {
    const s = new Set<string>();
    for (const e of this.entries) for (const t of e.tags || []) s.add(t);
    return Array.from(s).sort();
  }

  filtered(): AiProjectKnowledgeEntry[] {
    const q = this.searchQuery.trim().toLowerCase();
    // Exclut l'entrée spéciale doc.overview : elle est rendue à part en haut
    // dans une card pleine largeur avec markdown.
    let list = this.entries.filter(e => e.key !== DOC_OVERVIEW_KEY);

    // Filtre par statut (onglet)
    const tab = this.filterTab();
    if (tab !== 'all') {
      list = list.filter(e => this.getStatus(e) === tab);
    }

    if (this.selectedTag) list = list.filter(e => (e.tags || []).includes(this.selectedTag!));
    if (q) list = list.filter(e =>
      e.key.toLowerCase().includes(q) ||
      (e.description || '').toLowerCase().includes(q) ||
      String(e.value ?? '').toLowerCase().includes(q)
    );
    // Pending en haut, puis pinned, puis alphabétique
    return [...list].sort((a, b) => {
      const aPending = this.getStatus(a) === 'pending';
      const bPending = this.getStatus(b) === 'pending';
      if (aPending !== bPending) return aPending ? -1 : 1;
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
        // Refresh du badge global (pour le header chat)
        this.ai.refreshPendingKnowledgeCount(this.threadId);
      },
      error: (e) => {
        console.error('[ai-knowledge] load error', e);
        this.entries = [];
        this.cdr.detectChanges();
      },
    });
  }

  openEntryDialog(entry?: AiProjectKnowledgeEntry, approveAfter = false) {
    const data: AiKnowledgeDialogData = {
      entry: entry || null,
      existingKeys: this.entries.filter(e => e._id !== entry?._id).map(e => e.key),
    };
    const ref = this.modal.create({
      nzTitle: entry
        ? (approveAfter ? `Modifier avant d'approuver : ${entry.key}` : `Modifier : ${entry.key}`)
        : 'Ajouter une entrée',
      nzContent: AiKnowledgeEntryDialogComponent,
      nzData: data,
      nzFooter: null,
      nzWidth: 560,
      nzMaskClosable: false,
    });
    ref.afterClose.subscribe((result: AiProjectKnowledgeEntry | null) => {
      if (!result) return;
      if (entry?._id) {
        if (approveAfter) {
          // PATCH puis approve
          this.ai.approveKnowledgeEntry(this.threadId, entry._id, result).subscribe({
            next: () => { this.msg.success('Entrée approuvée'); this.load(); },
            error: (e) => this.msg.error(e?.error?.error?.message || 'Erreur approbation'),
          });
        } else {
          this.ai.updateKnowledgeEntry(this.threadId, entry._id, result).subscribe({
            next: () => { this.msg.success('Entrée mise à jour'); this.load(); },
            error: (e) => this.msg.error(e?.error?.error?.message || 'Erreur mise à jour'),
          });
        }
      } else {
        this.ai.addKnowledgeEntry(this.threadId, result).subscribe({
          next: () => { this.msg.success('Entrée ajoutée'); this.load(); },
          error: (e) => this.msg.error(e?.error?.error?.message || 'Erreur ajout'),
        });
      }
    });
  }

  approve(entry: AiProjectKnowledgeEntry) {
    if (!entry._id) return;
    this.ai.approveKnowledgeEntry(this.threadId, entry._id).subscribe({
      next: () => { this.msg.success('Entrée approuvée'); this.load(); },
      error: (e) => this.msg.error(e?.error?.error?.message || 'Erreur approbation'),
    });
  }

  reject(entry: AiProjectKnowledgeEntry) {
    if (!entry._id) return;
    this.ai.rejectKnowledgeEntry(this.threadId, entry._id).subscribe({
      next: () => { this.msg.success('Suggestion rejetée'); this.load(); },
      error: (e) => this.msg.error(e?.error?.error?.message || 'Erreur rejet'),
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

  /** Rend la valeur markdown de l'entrée `doc.overview` en HTML sanitisé. */
  renderMarkdown(e: AiProjectKnowledgeEntry): string {
    const src = typeof e?.value === 'string' ? e.value : String(e?.value ?? '');
    if (!src) return '<em style="color:#bfbfbf">(vide)</em>';
    try {
      const html = marked.parse(src, { breaks: true, gfm: true }) as string;
      return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['div','p','strong','em','code','pre','a','ul','ol','li','br','span','b','i','h1','h2','h3','h4','table','thead','tbody','tr','th','td','blockquote','hr'],
        ALLOWED_ATTR: ['href','target','rel','class'],
      });
    } catch { return this.escape(src); }
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
