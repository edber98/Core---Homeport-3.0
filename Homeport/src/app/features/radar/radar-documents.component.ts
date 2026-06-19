import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzMessageService } from 'ng-zorro-antd/message';
import { AccessControlService } from '../../services/access-control.service';
import { RadarBackendService, RadarDocHit, RadarDocItem } from '../../services/radar-backend.service';

// Onglet « Documents » (I7) — intelligence documentaire CONFIGURABLE de bout en bout :
// recherche par sujet (RAG), indexation (exploration agentique ou graphe), file
// d'attente d'analyse LLM (incrémentale), exploration de l'arborescence, et génération
// de documents multi-formats. Tout se règle ici (chemins, budgets, incrémental…).

@Component({
  selector: 'radar-documents',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzIconModule, NzInputModule, NzInputNumberModule,
    NzSelectModule, NzCheckboxModule, NzTagModule, NzEmptyModule, NzToolTipModule],
  template: `
  <div class="doc-wrap">

    <!-- ── État / suivi de l'indexation ── -->
    <section class="card status" *ngIf="status">
      <div class="ch"><span nz-icon nzType="dashboard"></span> Suivi de l'intelligence documentaire
        <button nz-button nzSize="small" (click)="loadStatus()" class="refresh"><span nz-icon nzType="reload"></span></button></div>
      <div class="stats">
        <div class="stat"><b>{{ status.files }}</b><span>fichiers connus</span></div>
        <div class="stat"><b>{{ status.indexed }}</b><span>indexés (RAG)</span></div>
        <div class="stat"><b>{{ status.analyzed }}</b><span>analysés (LLM)</span></div>
        <div class="stat"><b>{{ status.linkedToDeals }}</b><span>reliés à une pièce</span></div>
        <div class="stat"><b>{{ status.lastIndexedAt ? (status.lastIndexedAt | date:'dd/MM HH:mm') : '—' }}</b><span>dernier index</span></div>
      </div>
      <div class="recent" *ngIf="status.recent?.length">
        <span class="rt">Derniers indexés :</span>
        <span class="rchip" *ngFor="let r of status.recent" nz-tooltip [nzTooltipTitle]="r.path">{{ r.label }}</span>
      </div>
    </section>

    <!-- ── Recherche par sujet (RAG) ── -->
    <section class="card">
      <div class="ch"><span nz-icon nzType="file-search"></span> Recherche documentaire <small>« où est le contrat de X ? »</small></div>
      <div class="row">
        <input nz-input [(ngModel)]="query" (keydown.enter)="search()" placeholder="Sujet ou document recherché (NDA, analyse technique, facture…)" />
        <button nz-button nzType="primary" (click)="search()" [nzLoading]="busy.search" [disabled]="!query.trim()">Chercher</button>
      </div>
      <div class="hits" *ngIf="hits.length">
        <div class="hit" *ngFor="let h of hits">
          <div class="hl"><span nz-icon nzType="file-text"></span> <b>{{ h.label }}</b> <nz-tag>score {{ h.score }}</nz-tag></div>
          <div class="hp" nz-tooltip [nzTooltipTitle]="h.path"><span nz-icon nzType="folder-open"></span> {{ h.path }}</div>
          <div class="hs">{{ h.snippet }}</div>
        </div>
      </div>
      <nz-empty *ngIf="searched && !hits.length" nzNotFoundContent="Aucun document trouvé — lance d'abord une indexation."></nz-empty>
    </section>

    <!-- ── Liste complète des documents + état + métadonnées ── -->
    <section class="card">
      <div class="ch"><span nz-icon nzType="unordered-list"></span> Documents ({{ docTotal }})
        <input nz-input [(ngModel)]="docSearch" (keydown.enter)="loadDocs(1)" placeholder="Filtrer…" class="dsearch" />
        <nz-select [(ngModel)]="docStatus" (ngModelChange)="loadDocs(1)" nzPlaceHolder="État" nzAllowClear class="dstatus">
          <nz-option nzValue="analyzed" nzLabel="Analysés"></nz-option>
        </nz-select>
        <button nz-button nzSize="small" (click)="loadDocs(1)"><span nz-icon nzType="reload"></span></button>
      </div>
      <div class="dtable" *ngIf="docs.length">
        <div class="drow dhead">
          <span class="dn">Document</span><span class="dp">Emplacement</span>
          <span class="df">Indexé</span><span class="df">Analysé</span><span class="df">Relié</span><span class="dt">Type</span>
        </div>
        <div class="drow" *ngFor="let d of docs">
          <span class="dn" nz-tooltip [nzTooltipTitle]="d.label">{{ d.label }}</span>
          <span class="dp" nz-tooltip [nzTooltipTitle]="d.path">{{ d.path }}</span>
          <span class="df"><span nz-icon [nzType]="d.indexed ? 'check-circle' : 'minus'" [class.ok]="d.indexed"></span></span>
          <span class="df"><span nz-icon [nzType]="d.analyzed ? 'check-circle' : 'minus'" [class.ok]="d.analyzed"></span></span>
          <span class="df"><span nz-icon [nzType]="d.linked ? 'check-circle' : 'minus'" [class.ok]="d.linked"></span></span>
          <span class="dt"><nz-tag *ngIf="d.docType">{{ d.docType }}</nz-tag></span>
        </div>
      </div>
      <div class="dpage" *ngIf="docTotal > docSize">
        <button nz-button nzSize="small" [disabled]="docPage<=1" (click)="loadDocs(docPage-1)">‹</button>
        <span>{{ docPage }} / {{ docPages }}</span>
        <button nz-button nzSize="small" [disabled]="docPage>=docPages" (click)="loadDocs(docPage+1)">›</button>
      </div>
      <nz-empty *ngIf="!docs.length" nzNotFoundContent="Aucun document — lance une indexation."></nz-empty>
    </section>

    <div class="grid">
      <!-- ── Indexation (RAG) ── -->
      <section class="card">
        <div class="ch"><span nz-icon nzType="database"></span> Indexation RAG</div>
        <label class="f">Racines à explorer (séparées par virgule)
          <input nz-input [(ngModel)]="idx.rootsStr" placeholder="/RadarDemo, /Clients" /></label>
        <div class="frow">
          <label class="f">Dossiers max <nz-input-number [(ngModel)]="idx.maxFolders" [nzMin]="5" [nzMax]="500"></nz-input-number></label>
          <label class="f">Fichiers max <nz-input-number [(ngModel)]="idx.maxFiles" [nzMin]="10" [nzMax]="2000"></nz-input-number></label>
        </div>
        <label nz-checkbox [(ngModel)]="idx.useExplorer">Exploration agentique (l'IA choisit les dossiers)</label>
        <button nz-button nzType="primary" (click)="runIndex()" [nzLoading]="busy.index"><span nz-icon nzType="thunderbolt"></span> Indexer</button>
        <div class="res" *ngIf="idxRes">{{ idxRes.indexed }} indexés · {{ idxRes.graphed || 0 }} ajoutés au graphe · {{ idxRes.skipped }} ignorés / {{ idxRes.totalFiles }}</div>
      </section>

      <!-- ── File d'attente d'analyse (LLM) ── -->
      <section class="card">
        <div class="ch"><span nz-icon nzType="robot"></span> Analyse LLM (file d'attente)</div>
        <label class="f">Limiter au chemin (optionnel)
          <input nz-input [(ngModel)]="an.pathPrefix" placeholder="/RadarDemo/Clients" /></label>
        <label class="f">Taille du lot <nz-input-number [(ngModel)]="an.limit" [nzMin]="1" [nzMax]="200"></nz-input-number></label>
        <label nz-checkbox [(ngModel)]="an.skipAnalyzed">Incrémental (sauter les déjà analysés)</label>
        <button nz-button nzType="primary" (click)="runAnalyze()" [nzLoading]="busy.analyze"><span nz-icon nzType="play-circle"></span> Analyser le lot</button>
        <div class="res" *ngIf="anRes">{{ anRes.read }}/{{ anRes.queued }} lus · {{ anRes.linked }} reliés · {{ anRes.review }} en revue</div>
      </section>

      <!-- ── Exploration agentique ── -->
      <section class="card">
        <div class="ch"><span nz-icon nzType="partition"></span> Exploration agentique</div>
        <label class="f">Racines
          <input nz-input [(ngModel)]="ex.rootsStr" placeholder="/" /></label>
        <div class="frow">
          <label class="f">Dossiers max <nz-input-number [(ngModel)]="ex.maxFolders" [nzMin]="5" [nzMax]="500"></nz-input-number></label>
          <label class="f">Profondeur max <nz-input-number [(ngModel)]="ex.maxDepth" [nzMin]="1" [nzMax]="15"></nz-input-number></label>
        </div>
        <button nz-button (click)="runExplore()" [nzLoading]="busy.explore"><span nz-icon nzType="compass"></span> Explorer</button>
        <div class="res" *ngIf="exRes">{{ exRes.foldersVisited }} dossiers visités · {{ exRes.files.length }} docs · {{ exRes.skipped.length }} ignorés</div>
      </section>

      <!-- ── Génération de document ── -->
      <section class="card">
        <div class="ch"><span nz-icon nzType="file-add"></span> Générer un document</div>
        <label class="f">Format
          <nz-select [(ngModel)]="gen.format" style="width:100%">
            <nz-option *ngFor="let f of formats" [nzValue]="f" [nzLabel]="f.toUpperCase()"></nz-option>
          </nz-select></label>
        <label class="f">Titre <input nz-input [(ngModel)]="gen.title" placeholder="Rapport, devis récapitulatif…" /></label>
        <label class="f">Contenu (une ligne = un paragraphe)
          <textarea nz-input [(ngModel)]="gen.body" rows="3"></textarea></label>
        <div class="frow">
          <button nz-button nzType="primary" (click)="runGenerate(false)" [nzLoading]="busy.gen"><span nz-icon nzType="download"></span> Générer & télécharger</button>
          <button nz-button (click)="runGenerate(true)" [nzLoading]="busy.genUp" nz-tooltip nzTooltipTitle="Dépose dans /RadarDemo/Genere"><span nz-icon nzType="cloud-upload"></span> Déposer</button>
        </div>
        <div class="res" *ngIf="genRes">{{ genRes }}</div>
      </section>
    </div>
  </div>
  `,
  styles: [`
    .doc-wrap { padding: 12px; display: flex; flex-direction: column; gap: 14px; }
    .card { border: 1px solid #ececec; border-radius: 10px; padding: 14px; background: #fff; display: flex; flex-direction: column; gap: 10px; }
    .ch { font-weight: 600; display: flex; align-items: center; gap: 8px; }
    .ch small { color: #999; font-weight: 400; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 14px; }
    .row { display: flex; gap: 8px; }
    .row input { flex: 1; }
    .frow { display: flex; gap: 10px; }
    .f { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: #666; }
    .hits { display: flex; flex-direction: column; gap: 8px; margin-top: 6px; }
    .hit { border: 1px solid #f0f0f0; border-left: 3px solid #e61982; border-radius: 6px; padding: 8px 10px; background: #fafafa; }
    .hl { display: flex; align-items: center; gap: 6px; }
    .hp { color: #e61982; font-size: 12px; margin: 3px 0; cursor: default; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .hs { color: #777; font-size: 12px; }
    .res { font-size: 12px; color: #2c7; background: #f6fff9; border-radius: 6px; padding: 6px 8px; }
    .status .refresh { margin-left: auto; }
    .status .ch { width: 100%; }
    .stats { display: flex; gap: 10px; flex-wrap: wrap; }
    .stat { flex: 1; min-width: 100px; text-align: center; background: #faf7fb; border: 1px solid #f0e6f0; border-radius: 8px; padding: 8px; }
    .stat b { display: block; font-size: 20px; color: #e61982; }
    .stat span { font-size: 11px; color: #888; }
    .recent { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
    .recent .rt { font-size: 12px; color: #666; }
    .rchip { font-size: 11px; background: #f3f3f3; border-radius: 10px; padding: 2px 8px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .dsearch { width: 180px; margin-left: auto; }
    .dstatus { width: 130px; }
    .dtable { display: flex; flex-direction: column; font-size: 12px; }
    .drow { display: grid; grid-template-columns: 2fr 3fr 60px 60px 60px 1fr; align-items: center; gap: 6px; padding: 5px 6px; border-bottom: 1px solid #f4f4f4; }
    .drow.dhead { font-weight: 600; color: #888; border-bottom: 2px solid #eee; }
    .dn { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .dp { color: #aaa; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .df { text-align: center; color: #ccc; }
    .df .ok { color: #2ec27e; }
    .dpage { display: flex; gap: 10px; align-items: center; justify-content: center; margin-top: 8px; font-size: 12px; color: #666; }
  `],
})
export class RadarDocumentsComponent implements OnInit {
  status: { files: number; indexed: number; analyzed: number; linkedToDeals: number; lastIndexedAt: string | null; recent: { label: string; path: string; updatedAt: string }[] } | null = null;
  query = ''; hits: RadarDocHit[] = []; searched = false;
  docs: RadarDocItem[] = []; docTotal = 0; docPage = 1; docSize = 50; docSearch = ''; docStatus: string | null = null;
  get docPages(): number { return Math.max(1, Math.ceil(this.docTotal / this.docSize)); }
  idx = { rootsStr: '/RadarDemo', maxFolders: 80, maxFiles: 250, useExplorer: true };
  an = { pathPrefix: '', limit: 25, skipAnalyzed: true };
  ex = { rootsStr: '/', maxFolders: 80, maxDepth: 8 };
  formats = ['pdf', 'docx', 'xlsx', 'csv', 'html', 'md', 'txt'];
  gen = { format: 'pdf', title: '', body: '' };
  idxRes: any = null; anRes: any = null; exRes: any = null; genRes = '';
  busy = { search: false, index: false, analyze: false, explore: false, gen: false, genUp: false };

  constructor(private radar: RadarBackendService, private acl: AccessControlService, private cdr: ChangeDetectorRef, private msg: NzMessageService) {}

  ngOnInit(): void { this.loadStatus(); this.loadDocs(1); }
  loadStatus(): void {
    const ws = this.acl.currentWorkspaceId(); if (!ws) return;
    this.radar.docsStatus(ws).subscribe({ next: s => { this.status = s; this.cdr.markForCheck(); }, error: () => {} });
  }
  loadDocs(page: number): void {
    const ws = this.acl.currentWorkspaceId(); if (!ws) return;
    this.radar.docsList(ws, { page, size: this.docSize, search: this.docSearch || undefined, status: this.docStatus || undefined }).subscribe({
      next: r => { this.docs = r.items; this.docTotal = r.total; this.docPage = r.page; this.cdr.markForCheck(); }, error: () => {},
    });
  }

  private roots(s: string): string[] { return s.split(',').map(x => x.trim()).filter(Boolean); }

  search(): void {
    const ws = this.acl.currentWorkspaceId(); const q = this.query.trim(); if (!ws || !q) return;
    this.busy.search = true; this.searched = true;
    this.radar.searchDocs(ws, q).subscribe({
      next: r => { this.hits = r.results || []; this.busy.search = false; this.cdr.markForCheck(); },
      error: () => { this.busy.search = false; this.msg.error('Recherche impossible'); this.cdr.markForCheck(); },
    });
  }
  runIndex(): void {
    const ws = this.acl.currentWorkspaceId(); if (!ws) return; this.busy.index = true;
    this.radar.indexDocs(ws, { useExplorer: this.idx.useExplorer, roots: this.roots(this.idx.rootsStr), maxFolders: this.idx.maxFolders, maxFiles: this.idx.maxFiles }).subscribe({
      next: r => { this.idxRes = r; this.busy.index = false; this.msg.success(`${r.indexed} documents indexés`); this.loadStatus(); this.loadDocs(1); this.cdr.markForCheck(); },
      error: () => { this.busy.index = false; this.msg.error('Indexation impossible'); this.cdr.markForCheck(); },
    });
  }
  runAnalyze(): void {
    const ws = this.acl.currentWorkspaceId(); if (!ws) return; this.busy.analyze = true;
    this.radar.analyzeDocs(ws, { limit: this.an.limit, pathPrefix: this.an.pathPrefix || undefined, skipAnalyzed: this.an.skipAnalyzed }).subscribe({
      next: r => { this.anRes = r; this.busy.analyze = false; this.msg.success(`${r.linked} reliés · ${r.review} en revue`); this.loadStatus(); this.loadDocs(1); this.cdr.markForCheck(); },
      error: () => { this.busy.analyze = false; this.msg.error('Analyse impossible'); this.cdr.markForCheck(); },
    });
  }
  runExplore(): void {
    const ws = this.acl.currentWorkspaceId(); if (!ws) return; this.busy.explore = true;
    this.radar.exploreDocs(ws, { roots: this.roots(this.ex.rootsStr), maxFolders: this.ex.maxFolders, maxDepth: this.ex.maxDepth }).subscribe({
      next: r => { this.exRes = r; this.busy.explore = false; this.cdr.markForCheck(); },
      error: () => { this.busy.explore = false; this.msg.error('Exploration impossible'); this.cdr.markForCheck(); },
    });
  }
  runGenerate(upload: boolean): void {
    const ws = this.acl.currentWorkspaceId(); if (!ws) return;
    const spec = { title: this.gen.title || 'Document', paragraphs: this.gen.body.split('\n').filter(x => x.trim()) };
    if (upload) this.busy.genUp = true; else this.busy.gen = true;
    this.radar.generateDoc(ws, { spec, format: this.gen.format, upload }).subscribe({
      next: r => {
        if (upload) { this.genRes = `Déposé : ${r.path}`; this.busy.genUp = false; this.msg.success('Document déposé dans Nextcloud'); }
        else { this.download(r.contentBase64 || '', r.filename, r.mime); this.genRes = `Généré : ${r.filename}`; this.busy.gen = false; }
        this.cdr.markForCheck();
      },
      error: (e) => { this.busy.gen = false; this.busy.genUp = false; this.msg.error(e?.error?.error || 'Génération impossible'); this.cdr.markForCheck(); },
    });
  }
  private download(b64: string, name: string, mime?: string): void {
    try {
      const bin = atob(b64); const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      const url = URL.createObjectURL(new Blob([arr], { type: mime || 'application/octet-stream' }));
      const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
    } catch { this.msg.error('Téléchargement impossible'); }
  }
}
