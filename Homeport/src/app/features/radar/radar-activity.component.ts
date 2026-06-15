import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { marked } from 'marked';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzInputModule } from 'ng-zorro-antd/input';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { RadarBackendService, RadarActivity } from '../../services/radar-backend.service';
import { AccessControlService } from '../../services/access-control.service';
import { RadarEventsService } from '../../services/radar-events.service';
import { RadarChatService } from './radar-chat.service';

// Activité du Radar — tout ce qu'il fait et a fait : missions lancées,
// signaux détectés (et comment ils ont été traités), réveils programmés.

@Component({
  selector: 'radar-activity',
  standalone: true,
  imports: [CommonModule, FormsModule, NzTableModule, NzTagModule, NzButtonModule, NzIconModule, NzEmptyModule, NzSpinModule, NzToolTipModule, NzModalModule, NzInputModule],
  template: `
  <div class="toolbar">
    <div class="stats" *ngIf="activity">
      <nz-tag>Observations : {{ totalDeltas }}</nz-tag>
      <nz-tag nzColor="blue">Signaux : {{ activity.signals.length }}</nz-tag>
      <nz-tag nzColor="magenta">Missions : {{ activity.missions.length }}</nz-tag>
    </div>
    <button nz-button nzSize="small" (click)="reload()"><span nz-icon nzType="reload"></span> Actualiser</button>
  </div>

  <nz-spin [nzSpinning]="loading">
    <ng-container *ngIf="activity">
      <h3 class="zone-title">Missions</h3>
      <nz-empty *ngIf="!activity.missions.length" nzNotFoundContent="Aucune mission pour l'instant."></nz-empty>
      <div class="mission" *ngFor="let m of activity.missions">
        <div class="mission-head" (click)="expanded[m.id] = !expanded[m.id]">
          <nz-tag [nzColor]="missionColor(m.status)">{{ missionLabel(m.status) }}</nz-tag>
          <span class="mission-title">{{ m.title }}</span>
          <span class="mission-meta">{{ m.attempts }}/{{ m.maxAttempts }} tentative(s) · {{ m.createdAt | date:'dd/MM HH:mm' }}</span>
          <button nz-button nzSize="small" (click)="$event.stopPropagation(); ask(m)"
                  nz-tooltip nzTooltipTitle="Relancer ce sujet, poser une question, donner une instruction">
            <span nz-icon nzType="message"></span>
          </button>
          <span nz-icon [nzType]="expanded[m.id] ? 'up' : 'down'"></span>
        </div>
        <div class="mission-detail" *ngIf="expanded[m.id]">
          <ng-container *ngIf="m.result">
            <strong>Résultat :</strong>
            <div class="markdown" [innerHTML]="md(m.result)"></div>
          </ng-container>
          <ng-container *ngIf="m.lastCritique">
            <strong>Critique :</strong>
            <div class="markdown" [innerHTML]="md(m.lastCritique)"></div>
          </ng-container>
          <p *ngIf="m.error" class="err"><strong>Erreur :</strong> {{ m.error }}</p>
          <ng-container *ngIf="asAny(m).trace?.length">
            <div class="trace-chips">
              <span class="tool-chip" *ngFor="let t of asAny(m).trace"
                    [class.tool-error]="t.status !== 'success'"
                    nz-tooltip [nzTooltipTitle]="t.args">
                <span nz-icon [nzType]="t.status === 'success' ? 'check-circle' : 'close-circle'"></span>
                {{ traceLabel(t) }}<span class="tool-ms" *ngIf="t.duration"> · {{ t.duration }} ms</span>
              </span>
            </div>
          </ng-container>
        </div>
      </div>

      <h3 class="zone-title">Signaux détectés</h3>
      <nz-table #sigTable [nzData]="activity.signals" nzSize="small" [nzPageSize]="10" [nzShowPagination]="activity.signals.length > 10">
        <thead>
          <tr><th>Quand</th><th>Catégorie</th><th>Urgence</th><th>Résumé</th><th>Source</th><th>Traitement</th></tr>
        </thead>
        <tbody>
          <tr *ngFor="let s of sigTable.data" class="sig-row" (click)="openSignal(s)">
            <td class="cell-date">{{ s.createdAt | date:'dd/MM HH:mm' }}</td>
            <td><nz-tag>{{ s.category }}</nz-tag></td>
            <td><nz-tag [nzColor]="s.urgency === 'high' ? 'red' : s.urgency === 'normal' ? 'gold' : 'default'">{{ s.urgency }}</nz-tag></td>
            <td class="cell-summary">{{ s.summary }}</td>
            <td><nz-tag [nzColor]="s.source === 'llm' ? 'purple' : s.source === 'reconciliation' ? 'cyan' : 'default'">{{ sourceLabel(s.source) }}</nz-tag></td>
            <td>
              <nz-tag [nzColor]="signalColor(s.status)">{{ signalLabel(s.status) }}</nz-tag>
              <span class="resolution" *ngIf="s.resolution">{{ s.resolution }}</span>
            </td>
          </tr>
        </tbody>
      </nz-table>

      <!-- Modal détail signal -->
      <nz-modal [(nzVisible)]="detailVisible" [nzTitle]="detail?.signal?.category || 'Détail du signal'"
                [nzWidth]="860" [nzFooter]="null" (nzOnCancel)="detailVisible = false">
        <ng-container *nzModalContent>
          <nz-spin [nzSpinning]="detailLoading">
            <ng-container *ngIf="detail">
              <div class="dt-row">
                <nz-tag [nzColor]="detail.signal.urgency === 'high' ? 'red' : 'gold'">{{ detail.signal.urgency }}</nz-tag>
                <nz-tag [nzColor]="signalColor(detail.signal.status)">{{ signalLabel(detail.signal.status) }}</nz-tag>
                <nz-tag>{{ sourceLabel(detail.signal.source) }}</nz-tag>
                <span class="dt-date">{{ detail.signal.createdAt | date:'dd/MM/yyyy HH:mm' }}</span>
              </div>
              <p class="dt-summary">{{ detail.signal.summary }}</p>
              <div class="dt-block" *ngIf="detail.signal.resolution">
                <h4>Décision du superviseur</h4>
                <p>{{ detail.signal.resolution }}</p>
              </div>
              <div class="dt-block" *ngIf="detail.signal.entities?.length">
                <h4>Entités détectées</h4>
                <nz-tag *ngFor="let e of detail.signal.entities">{{ e }}</nz-tag>
              </div>
              <div class="dt-block" *ngIf="detail.missions.length">
                <h4>Missions lancées</h4>
                <div class="dt-mission" *ngFor="let m of detail.missions">
                  <nz-tag [nzColor]="missionColor(m.status)">{{ missionLabel(m.status) }}</nz-tag>
                  <strong>{{ m.title }}</strong>
                  <div class="markdown md-box" *ngIf="m.result" [innerHTML]="md(m.result)"></div>
                </div>
              </div>
              <div class="dt-block" *ngIf="detail.deltas.length">
                <h4>Changements observés ({{ detail.deltas.length }})</h4>
                <div class="dt-delta" *ngFor="let d of detail.deltas">
                  <div class="dt-delta-head">
                    <nz-tag [nzColor]="d.type === 'created' ? 'green' : d.type === 'deleted' ? 'red' : 'blue'">{{ d.type }}</nz-tag>
                    <code>{{ d.entityType }} · {{ d.entityKey }}</code>
                    <span class="dt-date">{{ d.occurredAt | date:'dd/MM HH:mm' }}</span>
                  </div>
                  <div class="dt-diff">
                    <div *ngIf="d.before"><span class="diff-label">Avant</span><pre class="dt-pre">{{ d.before | json }}</pre></div>
                    <div *ngIf="d.after"><span class="diff-label">Après</span><pre class="dt-pre">{{ d.after | json }}</pre></div>
                  </div>
                </div>
              </div>
            </ng-container>
          </nz-spin>
        </ng-container>
      </nz-modal>

      <h3 class="zone-title">Ignoré par le filtre</h3>
      <p class="zone-hint">Ce que le radar a observé mais jugé non signifiant — avec sa raison. Si une vraie demande apparaît ici, dites-le au superviseur pour qu'il apprenne.</p>
      <nz-empty *ngIf="!activity.ignored?.length" nzNotFoundContent="Rien d'écarté récemment."></nz-empty>
      <div class="ignored" *ngFor="let d of activity.ignored">
        <nz-tag>{{ d.entityType }}</nz-tag>
        <span class="ignored-what">{{ d.after?.subject || d.after?.title || d.after?.name || d.entityKey }}</span>
        <span class="ignored-from" *ngIf="d.after?.from">— {{ d.after?.from }}</span>
        <span class="ignored-meta">{{ d.occurredAt | date:'dd/MM HH:mm' }}</span>
        <button nz-button nzSize="small" [nzLoading]="busy[d.id]" (click)="requalify(d)"
                nz-tooltip nzTooltipTitle="Le filtre s'est trompé ? Crée un signal urgent — le superviseur le traitera à sa prochaine passe.">
          <span nz-icon nzType="rollback"></span> Traiter quand même
        </button>
        <span class="ignored-reason" *ngIf="d.classification?.summary">{{ d.classification?.summary }}</span>
      </div>

      <h3 class="zone-title">Réveils du superviseur</h3>
      <div class="wakeup" *ngFor="let w of activity.wakeups.slice(0, 12)">
        <nz-tag [nzColor]="w.status === 'fired' ? 'green' : 'gold'">{{ w.status === 'fired' ? 'Traité' : 'Programmé' }}</nz-tag>
        <span class="wakeup-reason">{{ reasonLabel(w.reason) }}</span>
        <span class="wakeup-meta">{{ w.at | date:'dd/MM HH:mm' }}</span>
      </div>
      <nz-empty *ngIf="!activity.wakeups.length" nzNotFoundContent="Aucun réveil programmé."></nz-empty>
    </ng-container>
  </nz-spin>
  `,
  styles: [`
    :host { display: block; }
    .toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; flex-wrap: wrap; gap: 8px; }
    .zone-title { margin: 18px 0 10px; font-size: 15px; font-weight: 600; }
    .mission { border: 1px solid #f0f0f0; border-radius: 8px; margin-bottom: 8px; background: #fff; }
    .mission-head { display: flex; align-items: center; gap: 8px; padding: 10px 12px; cursor: pointer; flex-wrap: wrap; }
    .mission-title { font-weight: 500; flex: 1; }
    .mission-meta { color: #8c8c8c; font-size: 12px; }
    .mission-detail { padding: 0 12px 12px; font-size: 13px; color: #595959; }
    .trace-chips { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
    .tool-chip { display: inline-flex; align-items: center; gap: 5px; background: #fafafa; border: 1px solid #ececec; border-radius: 12px; padding: 2px 9px; font-size: 11.5px; color: #595959; cursor: help; }
    .tool-error { border-color: #ffccc7; color: #f5222d; background: #fff2f0; }
    .tool-ms { color: #bfbfbf; }
    .markdown ::ng-deep p { margin: 4px 0; }
    .markdown ::ng-deep ul, .markdown ::ng-deep ol { margin: 4px 0; padding-left: 18px; }
    .markdown ::ng-deep table { border-collapse: collapse; margin: 8px 0; }
    .markdown ::ng-deep th, .markdown ::ng-deep td { border: 1px solid #f0f0f0; padding: 4px 10px; font-size: 12.5px; }
    .markdown ::ng-deep code { background: #fafafa; padding: 1px 4px; border-radius: 4px; font-size: 12px; }
    .md-box { background: #fafafa; border-radius: 6px; padding: 8px 10px; margin-top: 4px; max-height: 320px; overflow: auto; }
    .mission-detail .err { color: #f5222d; }
    .cell-date { white-space: nowrap; font-size: 12px; color: #8c8c8c; }
    .sig-row { cursor: pointer; }
    .sig-row:hover td { background: #fafafa; }
    .cell-summary { max-width: 480px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
    .dt-row { display: flex; align-items: center; gap: 6px; margin-bottom: 10px; flex-wrap: wrap; }
    .dt-date { color: #8c8c8c; font-size: 12px; }
    .dt-summary { font-size: 14px; font-weight: 500; }
    .dt-block { margin-top: 14px; }
    .dt-block h4 { margin: 0 0 6px; font-size: 13px; font-weight: 600; }
    .dt-mission { margin-bottom: 8px; }
    .dt-delta { border: 1px solid #f0f0f0; border-radius: 8px; padding: 8px 10px; margin-bottom: 8px; }
    .dt-delta-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .dt-diff { display: flex; gap: 10px; margin-top: 6px; flex-wrap: wrap; }
    .dt-diff > div { flex: 1; min-width: 240px; }
    .diff-label { font-size: 11px; color: #8c8c8c; text-transform: uppercase; }
    .dt-pre { background: #fafafa; border-radius: 6px; padding: 6px 8px; font-size: 11.5px; max-height: 220px; overflow: auto; white-space: pre-wrap; margin: 2px 0 0; }
    .resolution { display: block; color: #8c8c8c; font-size: 11px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .zone-hint { color: #8c8c8c; font-size: 12px; margin: -4px 0 8px; }
    .ignored { display: flex; align-items: baseline; gap: 8px; padding: 5px 0; font-size: 13px; flex-wrap: wrap; border-bottom: 1px dashed #f5f5f5; }
    .ignored-what { font-weight: 500; }
    .ignored-from { color: #8c8c8c; font-size: 12px; }
    .ignored-reason { color: #fa8c16; font-size: 12px; flex-basis: 100%; padding-left: 4px; }
    .ignored-meta { color: #bfbfbf; font-size: 11px; margin-left: auto; }
    .wakeup { display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 13px; }
    .wakeup-reason { font-weight: 500; }
    .wakeup-meta { color: #8c8c8c; font-size: 12px; }
  `],
})
export class RadarActivityComponent implements OnInit, OnDestroy {
  activity: RadarActivity | null = null;
  loading = false;
  expanded: Record<string, boolean> = {};
  detailVisible = false;
  detailLoading = false;
  detail: { signal: any; deltas: any[]; missions: any[] } | null = null;

  private liveSub?: Subscription;
  private reloadTimer: any = null;
  liveStreams: Record<string, string> = {};   // missionId → texte en cours de génération

  constructor(
    private radar: RadarBackendService,
    private acl: AccessControlService,
    private sanitizer: DomSanitizer,
    private radarEvents: RadarEventsService,
    private chatSvc: RadarChatService,
  ) {}

  ask(m: { id: string; title: string }): void {
    this.chatSvc.open({ contextLabel: `Mission : ${m.title}`, missionId: m.id });
  }

  asAny(x: unknown): any { return x; }

  // Label façon assistant : le displayTitle du NodeTemplate (résolu par le
  // harness ou enrichi côté serveur) — jamais le nom technique si on a mieux.
  traceLabel(t: { name: string; label?: string; args?: string }): string {
    if (t.label) return t.label;
    if (t.name === 'execute_tool' && t.args) {
      const m = /"key"\s*:\s*"([^"]+)"/.exec(t.args);
      if (m) return m[1];
    }
    const labels: Record<string, string> = {
      search_tools: 'Recherche d\'outils', get_tool_details: 'Détails d\'un outil',
      execute_tool: 'Exécution d\'un outil',
      list_providers: 'Liste des providers', list_credentials: 'Liste des credentials',
      web_search: 'Recherche web', web_fetch: 'Lecture web',
    };
    return labels[t.name] || t.name;
  }

  md(src: string): SafeHtml {
    try {
      const html = marked.parse(String(src || ''), { breaks: true, gfm: true }) as string;
      return this.sanitizer.bypassSecurityTrustHtml(html);
    } catch { return src || ''; }
  }

  busy: Record<string, boolean> = {};

  requalify(d: { id: string }): void {
    const wsId = this.acl.currentWorkspaceId();
    if (!wsId) return;
    this.busy[d.id] = true;
    this.radar.requalifyDelta(wsId, d.id).subscribe({
      next: () => { this.busy[d.id] = false; this.reload(); },
      error: () => { this.busy[d.id] = false; },
    });
  }

  openSignal(s: { id: string }): void {
    const wsId = this.acl.currentWorkspaceId();
    if (!wsId) return;
    this.detailVisible = true;
    this.detailLoading = true;
    this.detail = null;
    this.radar.getSignalDetail(wsId, s.id).subscribe({
      next: (d) => { this.detail = d; this.detailLoading = false; },
      error: () => { this.detailLoading = false; this.detailVisible = false; },
    });
  }

  ngOnInit(): void {
    this.reload();
    // Temps réel : nouvelle mission / signal / statut → recharge (débounce 600 ms) ;
    // texte streamé et outils appelés → patchés en direct sans recharger.
    this.liveSub = this.radarEvents.events$.subscribe(ev => {
      if (ev.type === 'mission.stream') {
        this.liveStreams[ev.payload.missionId] = ev.payload.text;
        const m = this.activity?.missions.find(x => x.id === ev.payload.missionId);
        if (m) { m.result = ev.payload.text; this.expanded[m.id] = true; }
        return;
      }
      if (ev.type === 'mission.tool') {
        const m: any = this.activity?.missions.find(x => x.id === ev.payload.missionId);
        if (m) { m.trace = [...(m.trace || []), ev.payload]; this.expanded[m.id] = true; return; }
      }
      if (['mission.created', 'mission.updated', 'mission.tool', 'signal.created', 'signal.updated'].includes(ev.type)) {
        if (this.reloadTimer) clearTimeout(this.reloadTimer);
        this.reloadTimer = setTimeout(() => this.reload(true), 600);
      }
    });
  }

  ngOnDestroy(): void {
    this.liveSub?.unsubscribe();
    if (this.reloadTimer) clearTimeout(this.reloadTimer);
  }

  get totalDeltas(): number {
    return Object.values(this.activity?.deltas || {}).reduce((a, b) => a + b, 0);
  }

  reload(silent = false): void {
    const wsId = this.acl.currentWorkspaceId();
    if (!wsId) return;
    if (!silent) this.loading = true;
    this.radar.getActivity(wsId, 50).subscribe({
      next: (a) => { this.activity = a; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  missionLabel(s: string): string { return ({ queued: 'En attente', running: 'En cours', done: 'Terminée', failed: 'Échouée' } as any)[s] || s; }
  missionColor(s: string): string { return ({ queued: 'gold', running: 'blue', done: 'green', failed: 'red' } as any)[s] || 'default'; }
  signalLabel(s: string): string { return ({ pending: 'À traiter', processing: 'En cours', handled: 'Traité', dismissed: 'Écarté' } as any)[s] || s; }
  signalColor(s: string): string { return ({ pending: 'gold', processing: 'blue', handled: 'green', dismissed: 'default' } as any)[s] || 'default'; }
  sourceLabel(s: string): string { return ({ rules: 'Règles', llm: 'IA', reconciliation: 'Analyse nocturne' } as any)[s] || s; }
  reasonLabel(r: string): string {
    return ({ mission_completed: 'Mission terminée', mission_failed: 'Mission échouée', card_response: 'Réponse utilisateur' } as any)[r] || r;
  }
}
