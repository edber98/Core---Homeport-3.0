import { Component, ChangeDetectionStrategy, Input, OnChanges, OnDestroy, SimpleChanges, inject, signal, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AiService } from '../ai.service';
import { resolveAgentProfile } from '../agents/ai-roster';

interface ParallelAgent {
  subagentType: string;
  prompt: string;
  agentName: string;
  agentEmoji: string;
  agentColor: string;
  status: string;
  jobId?: string;
}

interface JobLiveState {
  runningToolName?: string;
  runningToolStart?: number;
  completedCount: number;
  lastCompleted?: { name: string; durationMs: number; status: 'success' | 'error' };
  lastTextLen: number;
  status: 'running' | 'success' | 'error';
}

@Component({
  selector: 'ai-live-subagent-preview',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="lp-sub fade-in">
      <div class="lp-sub-head">
        <span class="lp-sub-badge">Sous-agent</span>
        <span class="lp-sub-type">{{ subagentType() }}</span>
        <span class="lp-sub-status"
              [class.running]="status() === 'running'"
              [class.success]="status() === 'success'"
              [class.error]="status() === 'error'">{{ statusLabel() }}</span>
      </div>

      <!-- Mode parallel : liste détaillée des sub-agents lancés + leur stream temps réel -->
      <div class="lp-sub-parallel" *ngIf="parallel().length > 0">
        <div *ngFor="let a of parallel(); trackBy: trackByType" class="lp-sub-card">
          <div class="lp-sub-card-head">
            <span class="lp-sub-emoji" [style.background]="a.agentColor + '20'">{{ a.agentEmoji }}</span>
            <span class="lp-sub-name">{{ a.agentName }}</span>
            <span class="lp-sub-card-type">{{ a.subagentType }}</span>
            <span class="lp-sub-card-status"
                  [class.running]="cardStatus(a) === 'running'"
                  [class.success]="cardStatus(a) === 'success'"
                  [class.error]="cardStatus(a) === 'error'">{{ cardStatusLabel(a) }}</span>
          </div>
          <div class="lp-sub-card-prompt" *ngIf="a.prompt">{{ a.prompt }}</div>

          <!-- Live stream : tool en cours d'exécution + compteur -->
          <div class="lp-sub-live" *ngIf="liveStateFor(a) as live">
            <div class="lp-sub-live-row" *ngIf="live.runningToolName">
              <span class="lp-sub-spin">◐</span>
              <span class="lp-sub-tool-name">{{ live.runningToolName }}</span>
              <span class="lp-sub-elapsed">{{ elapsedMs(live.runningToolStart!) }}</span>
            </div>
            <div class="lp-sub-live-row" *ngIf="!live.runningToolName && live.lastCompleted">
              <span class="lp-sub-check" [class.error]="live.lastCompleted!.status === 'error'">
                {{ live.lastCompleted!.status === 'error' ? '✕' : '✓' }}
              </span>
              <span class="lp-sub-tool-name">{{ live.lastCompleted!.name }}</span>
              <span class="lp-sub-elapsed">{{ live.lastCompleted!.durationMs }}ms</span>
            </div>
            <div class="lp-sub-counter" *ngIf="live.completedCount > 0">
              {{ live.completedCount }} outil{{ live.completedCount > 1 ? 's' : '' }} terminé{{ live.completedCount > 1 ? 's' : '' }}
              <ng-container *ngIf="live.lastTextLen > 0"> · {{ live.lastTextLen }} car. produits</ng-container>
            </div>
          </div>
        </div>
      </div>

      <!-- Mode single : prompt simple -->
      <div class="lp-sub-prompt" *ngIf="parallel().length === 0 && prompt()">{{ prompt() }}</div>
    </div>
  `,
  styles: [`
    :host { display: block; font-size: 13px; }
    .lp-sub { display: flex; flex-direction: column; gap: 8px; padding: 10px 12px; border: 1px solid rgba(0,0,0,.08); border-radius: 8px; background: #fff; }
    .lp-sub-head { display: flex; gap: 8px; align-items: center; }
    .lp-sub-badge { background: rgba(114,46,209,.08); color: #722ed1; border-radius: 4px; padding: 1px 6px; font-size: 11px; font-weight: 600; }
    .lp-sub-type { font-weight: 600; color: #262626; }
    .lp-sub-status { margin-left: auto; font-size: 11px; padding: 2px 8px; border-radius: 10px; background: rgba(0,0,0,.05); font-weight: 500; }
    .lp-sub-status.running { background: rgba(22,119,255,.1); color: #1677ff; }
    .lp-sub-status.success { background: rgba(82,196,26,.1); color: #389e0d; }
    .lp-sub-status.error { background: rgba(255,77,79,.1); color: #cf1322; }

    .lp-sub-parallel { display: flex; flex-direction: column; gap: 6px; }
    .lp-sub-card {
      display: flex; flex-direction: column; gap: 6px;
      padding: 8px 10px; border-radius: 6px;
      background: linear-gradient(180deg, #fafafa 0%, #fff 100%);
      border: 1px solid rgba(0,0,0,.06);
      animation: lpFadeUp 240ms cubic-bezier(.2,.8,.2,1);
    }
    @keyframes lpFadeUp {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .lp-sub-card-head { display: flex; align-items: center; gap: 6px; }
    .lp-sub-emoji {
      display: inline-flex; align-items: center; justify-content: center;
      width: 22px; height: 22px; border-radius: 50%;
      font-size: 13px;
    }
    .lp-sub-name { font-weight: 600; font-size: 12.5px; color: #262626; }
    .lp-sub-card-type { font-size: 10.5px; color: #8c8c8c; padding: 1px 5px; border-radius: 4px; background: #f5f5f5; }
    .lp-sub-card-status { margin-left: auto; font-size: 10px; padding: 1px 7px; border-radius: 10px; font-weight: 500; }
    .lp-sub-card-status.running { background: rgba(22,119,255,.1); color: #1677ff; }
    .lp-sub-card-status.running::before { content: '◐'; display: inline-block; margin-right: 4px; animation: lpSpin 1.2s linear infinite; }
    .lp-sub-card-status.success { background: rgba(82,196,26,.1); color: #389e0d; }
    .lp-sub-card-status.error { background: rgba(255,77,79,.1); color: #cf1322; }
    @keyframes lpSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .lp-sub-card-prompt {
      color: rgba(0,0,0,.65); font-size: 11.5px; line-height: 1.45;
      max-height: 48px; overflow: hidden; text-overflow: ellipsis;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
      padding-left: 28px;
    }

    /* Live stream — affiche tool en cours + dernier tool terminé + compteur */
    .lp-sub-live {
      display: flex; flex-direction: column; gap: 3px;
      padding: 6px 10px; margin-left: 28px;
      background: rgba(22,119,255,0.04);
      border-radius: 6px; border-left: 2px solid #1677ff;
      font-size: 11px;
    }
    .lp-sub-live-row { display: flex; align-items: center; gap: 6px; }
    .lp-sub-spin { color: #1677ff; animation: lpSpin 1.2s linear infinite; display: inline-block; }
    .lp-sub-check { color: #389e0d; font-weight: 700; }
    .lp-sub-check.error { color: #cf1322; }
    .lp-sub-tool-name { font-family: 'SF Mono', Menlo, Consolas, monospace; font-size: 10.5px; color: #262626; }
    .lp-sub-elapsed { margin-left: auto; color: #8c8c8c; font-variant-numeric: tabular-nums; font-size: 10px; }
    .lp-sub-counter { color: #8c8c8c; font-size: 10.5px; }

    .lp-sub-prompt {
      color: rgba(0,0,0,.6); font-size: 12px;
      max-height: 60px; overflow: hidden; text-overflow: ellipsis;
      display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;
    }
    .fade-in { animation: lpFade 120ms ease-out; }
    @keyframes lpFade { from { opacity: 0; } to { opacity: 1; } }
  `],
})
export class AiLiveSubagentPreviewComponent implements OnChanges, OnDestroy {
  @Input() data: any = null;

  private ai = inject(AiService);
  private cdr = inject(ChangeDetectorRef);
  private _liveByJob = new Map<string, JobLiveState>();
  private _subs = new Map<string, Subscription>();
  private _tickTimer: any = null;

  ngOnChanges(_c: SimpleChanges): void {
    // À chaque mise à jour de data, on (dés)abonne aux jobs apparus/disparus.
    const wanted = new Set<string>();
    for (const a of this.parallel()) {
      if (a.jobId) wanted.add(a.jobId);
    }
    // Unsubscribe ce qui n'est plus voulu
    for (const [jobId, sub] of this._subs) {
      if (!wanted.has(jobId)) {
        try { sub.unsubscribe?.(); } catch {}
        this._subs.delete(jobId);
        this._liveByJob.delete(jobId);
      }
    }
    // Subscribe aux nouveaux
    for (const jobId of wanted) {
      if (this._subs.has(jobId)) continue;
      this._subscribe(jobId);
    }
    // Démarre le tick pour rafraîchir l'elapsed (sans busy-wait)
    this._ensureTick();
  }

  ngOnDestroy(): void {
    for (const sub of this._subs.values()) {
      try { sub.unsubscribe?.(); } catch {}
    }
    this._subs.clear();
    this._liveByJob.clear();
    if (this._tickTimer) clearInterval(this._tickTimer);
  }

  private _subscribe(jobId: string) {
    try {
      const stream$ = (this.ai as any).streamJob?.(jobId);
      if (!stream$) return;
      this._liveByJob.set(jobId, { completedCount: 0, lastTextLen: 0, status: 'running' });
      const sub = stream$.subscribe({
        next: (ev: any) => this._applyEvent(jobId, ev),
        error: () => { /* non-fatal */ },
        complete: () => {
          const st = this._liveByJob.get(jobId);
          if (st && st.status === 'running') st.status = 'success';
          this.cdr.markForCheck();
        },
      });
      this._subs.set(jobId, sub);
    } catch { /* non-fatal */ }
  }

  private _applyEvent(jobId: string, ev: any) {
    const st = this._liveByJob.get(jobId);
    if (!st) return;
    const t = ev?.type;
    if (t === 'tool.start') {
      st.runningToolName = ev.name || 'tool';
      st.runningToolStart = Date.now();
    } else if (t === 'tool.end') {
      st.completedCount += 1;
      st.lastCompleted = {
        name: ev.name || 'tool',
        durationMs: ev.duration || (st.runningToolStart ? Date.now() - st.runningToolStart : 0),
        status: ev.status === 'error' ? 'error' : 'success',
      };
      st.runningToolName = undefined;
      st.runningToolStart = undefined;
    } else if (t === 'message') {
      st.lastTextLen = (st.lastTextLen || 0) + (typeof ev.text === 'string' ? ev.text.length : 0);
    } else if (t === 'done' || t === 'job.status') {
      const s = ev.status || ev.state;
      if (s === 'completed') st.status = 'success';
      else if (s === 'error' || s === 'cancelled') st.status = 'error';
    }
    this.cdr.markForCheck();
  }

  private _ensureTick() {
    if (this._tickTimer) return;
    this._tickTimer = setInterval(() => {
      // Rafraîchit seulement si un tool est en cours quelque part
      const hasRunning = Array.from(this._liveByJob.values()).some(s => !!s.runningToolName);
      if (hasRunning) this.cdr.markForCheck();
    }, 500);
  }

  // ── Template helpers ────────────────────────────────────────────────
  subagentType(): string { return this.data?.subagentType || this.data?.subagent_type || 'general'; }
  status(): string { return this.data?.status || 'running'; }
  statusLabel(): string {
    const s = this.status();
    if (s === 'running') return 'En cours';
    if (s === 'success') return 'Lancés';
    if (s === 'error') return 'Erreur';
    return s;
  }
  prompt(): string {
    const p = String(this.data?.prompt || '');
    // Filtre élargi pour les variantes de placeholder (LLM "intelligent" ajoute
    // parfois un suffixe : "Placeholder (sera ignoré, voir parallel)").
    if (!p || /^placeholder/i.test(p.trim())) return '';
    return p.length > 200 ? p.slice(0, 200) + '…' : p;
  }
  parallel(): ParallelAgent[] {
    const arr = this.data?.parallel;
    if (!Array.isArray(arr)) return [];
    // Garde-fou + fallback roster : si le backend n'a pas enrichi (pas restart,
    // ou payload partiel), on lookup nous-mêmes via resolveAgentProfile pour
    // afficher emoji + prénom (Ada / Tim / …) au lieu de "Agent" générique.
    return arr.map((a: any) => {
      const subagentType = String(a?.subagentType || a?.subagent_type || 'agent');
      const prof = resolveAgentProfile({ subagentType });
      return {
        subagentType,
        prompt: String(a?.prompt || ''),
        agentName: String(a?.agentName || prof?.name || subagentType || 'Agent'),
        agentEmoji: String(a?.agentEmoji || prof?.emoji || '🤖'),
        agentColor: String(a?.agentColor || prof?.color || '#999'),
        status: String(a?.status || 'running'),
        jobId: a?.jobId ? String(a.jobId) : undefined,
      };
    }) as ParallelAgent[];
  }
  trackByType(_: number, a: ParallelAgent) {
    const promptKey = (a?.prompt || '').slice(0, 30);
    const baseKey = a?.jobId || a?.subagentType || 'unknown';
    return `${baseKey}:${promptKey}`;
  }

  liveStateFor(a: ParallelAgent): JobLiveState | null {
    if (!a.jobId) return null;
    return this._liveByJob.get(a.jobId) || null;
  }
  cardStatus(a: ParallelAgent): 'running' | 'success' | 'error' {
    const live = a.jobId ? this._liveByJob.get(a.jobId) : null;
    if (live) return live.status;
    if (a.status === 'completed') return 'success';
    if (a.status === 'error') return 'error';
    return 'running';
  }
  cardStatusLabel(a: ParallelAgent): string {
    const s = this.cardStatus(a);
    if (s === 'running') return 'en cours';
    if (s === 'success') return 'terminé';
    if (s === 'error') return 'erreur';
    return s;
  }
  elapsedMs(start: number): string {
    const e = Date.now() - start;
    if (e < 1000) return `${e}ms`;
    return `${(e / 1000).toFixed(1)}s`;
  }
}
