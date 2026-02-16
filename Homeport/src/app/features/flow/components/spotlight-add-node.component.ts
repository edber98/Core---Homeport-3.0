import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppProvider } from '../../../services/catalog.service';

@Component({
  selector: 'spotlight-add-node',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="spotlight-box">
      <div class="dialog-header">
        <div class="search">
          <div class="search-row">
            <i class="search-ico fa-solid fa-magnifying-glass" aria-hidden="true"></i>
            <i class="ai-ico fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i>
            <textarea #ta rows="1" class="search-input"
              [placeholder]="placeholder || 'Rechercher un nœud ou décrire ce que tu veux…'"
              [(ngModel)]="query"
              (ngModelChange)="onQueryChange($event)"
              (keydown)="onKeydown($event)"
              (input)="autoGrow()"
              autocomplete="off" spellcheck="false"></textarea>
            <div class="search-actions">
              <span class="ai-pill" *ngIf="looksLikePrompt(query)">Mode IA</span>
              <button type="button" class="close-btn" (click)="close.emit()" aria-label="Fermer">✕</button>
            </div>
          </div>
          <div class="search-hints">
            <span class="hint-pill"><i class="ico fa-solid fa-magnifying-glass" aria-hidden="true"></i>Recherche rapide</span>
            <span class="hint-pill ai"><i class="ico fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i>Demande à l’IA</span>
            <span class="hint-text">Entrée = lancer l’IA si aucun résultat</span>
          </div>
          <div class="search-meta" *ngIf="query === ''">
            <div><span class="muted">Résultats : </span>{{ totalCount }}</div>
            <div class="muted">Astuce : tape une phrase pour l’IA</div>
          </div>
        </div>
      </div>

      <div class="ai-card" *ngIf="totalCount === 0 && looksLikePrompt(query)">
        <div class="ai-top">
          <div class="ai-title"><div class="spark" aria-hidden="true"><i class="fa-solid fa-wand-magic-sparkles"></i></div> Suggestions IA</div>
          <div class="ai-actions">
            <button type="button" class="btn" (click)="pick.emit(null)">Utiliser comme prompt</button>
          </div>
        </div>
        <div class="ai-suggestions">
          <div class="ai-suggestion" *ngFor="let s of buildAiSuggestions(query)">
            <div class="s-head">{{ s.title }}</div>
            <div class="s-body">{{ s.body }}</div>
          </div>
        </div>
      </div>

      <div class="list" role="listbox" aria-label="Résultats">
        <ng-container *ngIf="itemsFlat.length; else empty">
          <ng-container *ngFor="let g of groups">
            <div class="group-title">
              <span class="group-mini" *ngIf="g.appId" [style.background]="g.appColor || '#f3f4f6'">
                <img *ngIf="g.appIconUrl" [src]="g.appIconUrl" alt="icon" />
                <i *ngIf="!g.appIconUrl && g.appIconClass" [class]="g.appIconClass"></i>
                <img *ngIf="!g.appIconUrl && !g.appIconClass" [src]="simpleIconUrlForApp(g.appId)" alt="icon" />
              </span>
              <span class="group-name">{{ g.title }}</span>
            </div>
            <button type="button" class="item" *ngFor="let it of g.items" (mousemove)="hoverTo(it)" (click)="pick.emit(it)" [attr.aria-selected]="isActive(it) ? 'true' : 'false'">
              <div class="row">
                <div class="meta">
                  <div class="label">{{ it.label }}</div>
                  <div class="desc" *ngIf="it.template?.description as d">{{ d }}</div>
                  <div class="desc" *ngIf="!it.template?.description && (it.template?.subtitle || it.template?.category)">
                    {{ it.template?.subtitle || it.template?.category }}
                  </div>
                </div>
                <div class="app-chip" [style.background]="providerColor(it)" title="Provider">
                  <ng-container [ngTemplateOutlet]="iconTpl" [ngTemplateOutletContext]="{ $implicit: it }"></ng-container>
                </div>
              </div>
            </button>
          </ng-container>
        </ng-container>
        <ng-template #empty>
          <div class="ai-hint">
            Aucun résultat. Appuyez sur Entrée pour utiliser l'assistant IA.
          </div>
        </ng-template>
      </div>

      <ng-template #iconTpl let-it>
        <ng-container [ngSwitch]="iconMode(it)">
          <img *ngSwitchCase="'tplUrl'" [src]="tplIconUrl(it)" alt="icon" />
          <i *ngSwitchCase="'tplClass'" [class]="tplIconClass(it)"></i>
          <img *ngSwitchCase="'appUrl'" [src]="appIconUrl(it)" alt="icon" />
          <i *ngSwitchCase="'appClass'" [class]="appIconClass(it)"></i>
          <img *ngSwitchDefault [src]="simpleIconUrl(it)" alt="icon" />
        </ng-container>
      </ng-template>
    </div>
  `,
  styles: [`
    .spotlight-box { display:grid; gap:0; background:#fff; }
    .dialog-header { display:flex; align-items:center; gap:10px; padding: 10px 10px; border-bottom:1px solid #E2E1E4; background: #ffffff; }
    .search { flex:1; min-width:0; display:grid; gap:6px; }
    .search-row { display:grid; grid-template-columns: 1fr auto; align-items:center; position: relative; gap:8px; }
    .search-ico { position:absolute; left:12px; top:50%; transform: translateY(-50%); color:#64748b; font-size:13px; }
    .ai-ico { position:absolute; left:30px; top:50%; transform: translateY(-50%); color:#93c5fd; font-size:12px; }
    .search-input { width:100%; font-size:14px; padding: 10px 12px 10px 48px; border-radius: 12px; border:1px solid #E5E7EB; background:#fff; color:#111; outline:none; resize:none; overflow:hidden; min-height: 36px; transition: border-color .15s ease, box-shadow .15s ease; }
    .search-input:focus { border-color:#1677ff; box-shadow: 0 0 0 3px rgba(22,119,255,.15); }
    .search-actions { display:inline-flex; align-items:center; gap:8px; }
    .ai-pill { font-size:11px; padding:2px 8px; border-radius:999px; background:#e8f1ff; color:#0b5ed7; border:1px solid #c7dbff; font-weight:700; letter-spacing:.02em; text-transform:uppercase; }
    .search-hints { display:flex; flex-wrap:wrap; align-items:center; gap:8px; padding: 0 2px; }
    .hint-pill { display:inline-flex; align-items:center; gap:6px; font-size:11px; padding:2px 8px; border-radius:999px; background:#f1f5f9; color:#475569; border:1px solid #e2e8f0; }
    .hint-pill .ico { font-size:12px; }
    .hint-pill.ai { background:#e8f1ff; color:#0b5ed7; border-color:#c7dbff; }
    .hint-text { font-size:11px; color:#6b7280; }
    .search-meta { display:flex; justify-content:space-between; gap:10px; color:#6b7280; font-size:12px; padding:0 2px; }
    .muted { color:#6b7280; }
    .list { max-height: min(60vh, 520px); overflow:auto; padding: 8px 10px; }
    .group-title { display:flex; align-items:center; justify-content:center; gap:8px; font-size:16px; font-weight:700; color:#111827; padding: 10px 6px; text-align:center; }
    .group-title .group-mini { width:22px; height:22px; display:inline-flex; align-items:center; justify-content:center; border-radius:6px; flex:none; }
    .group-title .group-mini img { width:14px; height:14px; object-fit:contain; display:block; }
    .group-title .group-mini i { font-size:14px; line-height:1; color:#fff; }
    .group-title .group-name { line-height:1.1; }
    .item { width:100%; text-align:left; padding: 10px; border-radius: 12px; border:1px solid #E5E7EB; background:#fff; cursor:pointer; display:block; margin: 6px 0; transition: border-color .15s ease, box-shadow .15s ease, background .15s ease; }
    .item:hover, .item[aria-selected="true"] { background:#F8FBFF; border-color:#DBEAFE; box-shadow: none; }
    .row { display:flex; align-items:center; justify-content:space-between; gap:10px; min-width:0; }
    .meta { min-width:0; flex:1; }
    .label { font-weight:700; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:#111827; }
    .desc { font-size:12px; color:#6b7280; line-height:1.35; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
    .app-chip { width:32px; height:32px; border-radius: 10px; display:grid; place-items:center; border:1px solid rgba(22,119,255,.15); background:#F3F4F6; flex:none; }
    .app-chip img { width:18px; height:18px; object-fit:contain; display:block; }
    .app-chip i { font-size:16px; color:#fff; }
    .ai-hint { padding: 10px; color:#6b7280; text-align:center; }
    .close-btn { border:1px solid #E5E7EB; background:#fff; color:#111; border-radius:10px; width:34px; height:36px; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; transition: border-color .15s ease, color .15s ease, background .15s ease; }
    .close-btn:hover { background:#F8FBFF; border-color:#c7dbff; color:#1677ff; }
    .footer { display:flex; align-items:center; justify-content:space-between; gap:10px; padding: 8px 10px; border-top:1px solid #E2E1E4; font-size:12px; color:#6b7280; }
    .kbd { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size:11px; padding:2px 6px; border:1px solid #E5E7EB; border-radius:8px; background:#fff; color:#6b7280; }
    .btn { appearance:none; border:1px solid #E5E7EB; background:#fff; color:#111; padding:6px 10px; border-radius:10px; cursor:pointer; font-weight:650; font-size:12px; transition: border-color .15s ease, color .15s ease, background .15s ease, box-shadow .15s ease; }
    .btn:hover { background:#F8FBFF; border-color:#c7dbff; color:#1677ff; box-shadow: 0 4px 12px rgba(22,119,255,0.12); }
    .ai-card { margin: 8px 10px 0; border:1px solid #DBEAFE; background:#F8FBFF; border-radius:12px; padding: 10px; display:grid; gap:8px; }
    .ai-top { display:flex; align-items:center; justify-content:space-between; gap:10px; }
    .ai-title { display:flex; align-items:center; gap:8px; font-weight:800; font-size:13px; }
    .spark { width:24px; height:24px; border-radius:8px; display:grid; place-items:center; border:1px solid #E5E7EB; background:#fff; color:#1677ff; }
    .ai-actions { display:flex; gap:8px; align-items:center; }
    .ai-suggestions { display:grid; gap:8px; }
    .ai-suggestion { border:1px solid #E5E7EB; background:#fff; border-radius:10px; padding:8px; }
    .s-head { font-size:12px; color:#374151; font-weight:600; margin-bottom:4px; }
    .s-body { font-size:12px; color:#4b5563; white-space:pre-wrap; line-height:1.35; }
    @media (max-width: 560px) { .list { max-height: 56vh; } }
  `]
})
export class SpotlightAddNodeComponent implements OnChanges, AfterViewInit {
  @Input() groups: Array<{ title: string; items: any[]; appId?: string; appColor?: string; appIconClass?: string; appIconUrl?: string }> = [];
  @Input() query: string = '';
  @Input() placeholder: string = '';
  @Input() totalCount: number = 0;
  @Input() getAppByIdFn?: (id?: string|null) => AppProvider | undefined;

  @Output() queryChange = new EventEmitter<string>();
  @Output() pick = new EventEmitter<any>();
  @Output() close = new EventEmitter<void>();
  @ViewChild('ta') ta?: ElementRef<HTMLTextAreaElement>;
  itemsFlat: any[] = [];
  activeIndex = 0;
  ngAfterViewInit(): void {
    try { setTimeout(() => { this.ta?.nativeElement?.focus(); this.autoGrow(); }, 0); } catch {}
  }
  ngOnChanges(changes: SimpleChanges): void { if (changes['groups']) this.rebuildFlat(); }
  onQueryChange(v: string) { this.queryChange.emit(v); this.autoGrow(); }
  autoGrow() { try { const el = this.ta?.nativeElement; if (!el) return; el.style.height = 'auto'; el.style.height = Math.min(160, el.scrollHeight) + 'px'; } catch {} }
  rebuildFlat() { const arr: any[] = []; for (const g of (this.groups || [])) for (const it of (g.items || [])) arr.push(it); this.itemsFlat = arr; this.activeIndex = Math.min(this.activeIndex, Math.max(0, this.itemsFlat.length - 1)); }
  isActive(it: any): boolean { const idx = this.itemsFlat.indexOf(it); return idx === this.activeIndex; }
  hoverTo(it: any) { const idx = this.itemsFlat.indexOf(it); if (idx >= 0) this.activeIndex = idx; }
  onKeydown(ev: KeyboardEvent) {
    if (ev.key === 'ArrowDown') { ev.preventDefault(); if (this.itemsFlat.length) this.activeIndex = Math.min(this.itemsFlat.length - 1, this.activeIndex + 1); return; }
    if (ev.key === 'ArrowUp') { ev.preventDefault(); if (this.itemsFlat.length) this.activeIndex = Math.max(0, this.activeIndex - 1); return; }
    if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); if (this.itemsFlat.length > 0) this.pick.emit(this.itemsFlat[this.activeIndex] || this.itemsFlat[0]); else this.pick.emit(null); return; }
  }
  looksLikePrompt(query: string): boolean { const nq = (query || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim(); if (nq.length < 8) return false; const hasSpaces = nq.includes(' '); const hasVerb = /(creer|créer|genere|génère|faire|ajoute|ajouter|synchronis|analyse|explique|propose|construis|build|create|generate|sync|summarize)/.test(nq); const hasPunct = /[\?\.!:]/.test(query); return hasSpaces && (hasVerb || hasPunct); }
  buildAiSuggestions(query: string): Array<{ title: string; body: string }> { const text = (query || '').trim(); const nq = text.toLowerCase(); const out: Array<{ title: string; body: string }> = []; if (/(workflow|flow|automation|automatisation|synchronis|sync|connect|integration)/.test(nq)) out.push({ title: 'Créer un workflow depuis ta phrase', body: `Prompt:\n"${text}"\n➡️ Triggers, actions, erreurs, retries, connecteurs.` }); if (/(plan|etapes|étapes|procedure|procédure|how|comment|guide)/.test(nq)) out.push({ title: 'Générer un plan d’implémentation', body: `Prompt:\n"Plan pour: ${text}"\n➡️ Étapes, risques, critères.` }); if (/(bug|erreur|error|crash|trace|log|latence|perf|performance)/.test(nq)) out.push({ title: 'Proposer un diagnostic', body: `Prompt:\n"Diagnostic: ${text}"\n➡️ Hypothèses + checks + mesures.` }); if (!out.length) out.push({ title: 'Interpréter et proposer une action', body: `Prompt:\n"${text}"\n➡️ Reformulation + 3 actions (workflow, doc, config).` }); return out.slice(0, 3); }

  private appOf(it: any): AppProvider | undefined {
    try {
      const appId = String((it?.template?.appId || it?.template?.app?._id || '')).trim();
      return this.getAppByIdFn ? this.getAppByIdFn(appId) : undefined;
    } catch { return undefined; }
  }
  providerColor(it: any): string {
    try { return this.appOf(it)?.color || '#f3f4f6'; } catch { return '#f3f4f6'; }
  }
  tplIconUrl(it: any): string | null {
    try { return it?.template?.iconUrl || (typeof it?.template?.icon === 'string' && /^https?:\/\//i.test(it.template.icon) ? it.template.icon : null); } catch { return null; }
  }
  tplIconClass(it: any): string | null {
    try { const ic = it?.template?.icon; return ic && typeof ic === 'string' && !/^https?:\/\//i.test(ic) ? ic : null; } catch { return null; }
  }
  appIconUrl(it: any): string | null {
    try { const a = this.appOf(it); return a?.iconUrl || null; } catch { return null; }
  }
  appIconClass(it: any): string | null {
    try { const a = this.appOf(it); return a?.iconClass || null; } catch { return null; }
  }
  iconMode(it: any): string {
    if (this.tplIconUrl(it)) return 'tplUrl';
    if (this.tplIconClass(it)) return 'tplClass';
    if (this.appIconUrl(it)) return 'appUrl';
    if (this.appIconClass(it)) return 'appClass';
    return 'simple';
  }
  simpleIconUrl(it: any): string {
    try {
      const appId = String((it?.template?.appId || it?.template?.app?._id || '')).trim();
      return appId ? `https://cdn.simpleicons.org/${encodeURIComponent(appId)}/ffffff` : 'https://cdn.simpleicons.org/question/ffffff';
    } catch { return 'https://cdn.simpleicons.org/question/ffffff'; }
  }
  simpleIconUrlForApp(appId?: string | null): string {
    try {
      const id = String(appId || '').trim();
      return id ? `https://cdn.simpleicons.org/${encodeURIComponent(id)}/ffffff` : 'https://cdn.simpleicons.org/question/ffffff';
    } catch { return 'https://cdn.simpleicons.org/question/ffffff'; }
  }
}
