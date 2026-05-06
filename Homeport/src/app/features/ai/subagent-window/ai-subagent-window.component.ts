import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzMessageService } from 'ng-zorro-antd/message';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { AiService, AiMessage, AiMessageSegment, AiToolCall } from '../ai.service';
import { ApiClientService } from '../../../services/api-client.service';
import { resolveAgentProfile } from '../agents/ai-roster';
import { AiToolLabelsService } from '../ai-tool-labels.service';
import { AiLivePreviewComponent, detectPreviewType, LivePreviewType } from '../live-preview/ai-live-preview.component';
import { AiInlineWidgetCollapseComponent } from '../widgets/ai-inline-widget-collapse.component';
import { AiMessageComponent } from '../ai-message.component';
import { isWidgetKind } from '../constants/widget-kinds';

type TimelineItemKind = 'tool' | 'message_in' | 'message_out' | 'status' | 'permission' | 'text_out' | 'widget';

interface TimelineItem {
  id: string;
  kind: TimelineItemKind;
  at: Date;
  text?: string;
  toolName?: string;
  toolArgs?: any;
  toolResult?: any;
  /** Statut du tool : 'running' (en cours), 'success' (fini), 'error' */
  toolStatus?: 'running' | 'success' | 'error';
  /** Durée du tool en ms, une fois terminé */
  toolDuration?: number;
  /** State live preview (execute_code / render_structured / canvas_html / etc.) */
  livePreview?: { type: LivePreviewType; data: any };
  status?: string;
  fromName?: string;
  /** Pour message_in : message encore en attente de prise en compte par le subagent */
  pending?: boolean;
  /** Widget produit (render_structured, canvas_html, diagram, image_inline, file_inline) */
  widget?: AiMessage;
}

/**
 * Fenêtre d'interaction avec un subagent spécifique.
 * Affiche timeline live (tools, messages, statut) + input pour lui parler.
 * Montée dans le WM via `wm.open({ contentComponent: AiSubagentWindowComponent, contentInputs: { jobId } })`.
 */
@Component({
  selector: 'ai-subagent-window',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NzIconModule, NzButtonModule, NzInputModule, NzTagModule, AiLivePreviewComponent, AiInlineWidgetCollapseComponent, AiMessageComponent],
  template: `
    <div class="sw-wrap">
      <div class="sw-header" *ngIf="profile">
        <div class="sw-avatar" [style.background]="profile.color">{{ profile.emoji }}</div>
        <div class="sw-ident">
          <div class="sw-name">{{ profile.name }}</div>
          <div class="sw-tag">{{ profile.tagline }}</div>
        </div>
        <nz-tag [nzColor]="statusColor()">{{ statusLabel() }}</nz-tag>
      </div>

      <!-- Phrase-titre : brief envoyé au subagent, visible dès le démarrage.
           Avant, user voyait seulement la réponse finale (OpenAI particulièrement
           était muet pendant l'exécution). Claude annonçait toujours le sujet. -->
      <div class="sw-brief" *ngIf="jobBrief() as brief">
        <span nz-icon nzType="bulb" nzTheme="outline" class="sw-brief-ico"></span>
        <span class="sw-brief-text">{{ brief }}</span>
      </div>

      <div class="sw-body">
        <div class="sw-todo" *ngIf="subagentTodo() as todo">
          <div class="sw-todo-title">{{ todo.title || 'Checklist interne' }}</div>
          <div class="sw-todo-item" *ngFor="let t of todo.todos; trackBy: trackTodo" [class]="'tdo-' + t.status">
            <span nz-icon [nzType]="todoIcon(t.status)" nzTheme="outline"></span>
            <span class="sw-todo-text" [class.done]="t.status === 'completed'">{{ t.content }}</span>
          </div>
        </div>

        <div class="sw-timeline">
          <div class="sw-empty" *ngIf="!hasActivity()">
            <span nz-icon nzType="loading" nzTheme="outline"></span>
            <span>En attente d'activité…</span>
          </div>

          <!-- Messages user → subagent (mailbox poke), affichés chronologiquement -->
          <div *ngFor="let it of userMessages(); trackBy: trackItem" class="sw-msg in" [class.pending]="it.pending">
            <div class="sw-msg-from">
              {{ it.fromName || 'Utilisateur' }} → {{ profile?.name }}
              <span class="sw-pending-chip" *ngIf="it.pending">
                <span nz-icon nzType="clock-circle" nzTheme="outline"></span>
                En attente de prise en compte
              </span>
              <span class="sw-delivered-chip" *ngIf="it.pending === false">
                <span nz-icon nzType="check" nzTheme="outline"></span>
                Pris en compte
              </span>
            </div>
            <div class="sw-msg-text" [innerHTML]="renderMd(it.text || '')"></div>
          </div>

          <!-- Rendering via ai-message : même look que le chat principal
               (msg-wrap assistant-group avec tools, text, live-preview interleavés). -->
          <ai-message *ngIf="synthesizedMessage() as msg" [msg]="msg"></ai-message>

          <!-- Widgets finalisés produits par ce subagent (tableaux, canvases,
               diagrammes, fichiers) rendus dans l'ordre de création. -->
          <div *ngFor="let it of widgetMessages(); trackBy: trackItem" class="sw-widget-wrap">
            <ai-inline-widget-collapse *ngIf="it.widget" [widget]="it.widget"></ai-inline-widget-collapse>
          </div>

          <!-- Statuts et permissions (footer) -->
          <div *ngFor="let it of statusMessages(); trackBy: trackItem" class="sw-status-row">
            <span nz-icon [nzType]="it.kind === 'permission' ? 'lock' : 'info-circle'" nzTheme="outline"></span>
            <span>{{ it.text }}</span>
          </div>
        </div>
      </div>

      <div class="sw-input" *ngIf="isActive()">
        <textarea nz-input [(ngModel)]="draft" rows="2"
                  placeholder="Écris un message à {{ profile?.name || 'ce sous-agent' }}…"
                  (keydown.enter)="onEnter($event)"></textarea>
        <button nz-button nzType="primary" [disabled]="!draft.trim() || sending()" (click)="send()">
          <span nz-icon [nzType]="sending() ? 'loading' : 'send'" nzTheme="outline"></span>
          Envoyer
        </button>
      </div>
      <div class="sw-finished" *ngIf="!isActive()">
        <span nz-icon nzType="check-circle" nzTheme="outline"></span>
        Ce sous-agent est terminé — vous pouvez consulter son historique ci-dessus.
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .sw-wrap { display: flex; flex-direction: column; height: 100%; font-size: 12.5px; color: #262626; }
    .sw-header {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 14px; border-bottom: 1px solid #f0f0f0;
      flex-shrink: 0;
    }
    .sw-avatar {
      width: 36px; height: 36px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; color: #fff; flex-shrink: 0;
    }
    .sw-ident { flex: 1; min-width: 0; }
    .sw-name { font-weight: 700; font-size: 13px; }
    .sw-tag { font-size: 11px; color: #8c8c8c; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .sw-body {
      flex: 1; overflow-y: auto; padding: 12px 14px;
      display: flex; flex-direction: column; gap: 12px;
    }
    .sw-todo {
      padding: 10px 12px; background: #fafafa; border: 1px solid #f0f0f0; border-radius: 8px;
    }
    .sw-todo-title { font-weight: 600; font-size: 12px; margin-bottom: 6px; color: #262626; }
    .sw-todo-item { display: flex; align-items: center; gap: 6px; padding: 3px 0; font-size: 12px; }
    .sw-todo-item.tdo-in_progress { color: #e61982; font-weight: 600; }
    .sw-todo-item.tdo-completed span[nz-icon] { color: #52c41a; }
    .sw-todo-item.tdo-cancelled { opacity: 0.5; text-decoration: line-through; }
    .sw-todo-item .sw-todo-text.done { text-decoration: line-through; color: #8c8c8c; }
    .sw-timeline { display: flex; flex-direction: column; gap: 6px; }
    .sw-empty {
      display: flex; align-items: center; gap: 8px;
      padding: 24px; color: #8c8c8c; font-size: 12px;
      justify-content: center;
    }
    .sw-item {
      display: flex; gap: 10px;
      padding: 8px 10px; border-radius: 8px;
      transition: background 0.15s ease;
    }
    .sw-item:hover { background: #fafafa; }
    .sw-item-time { font-size: 10px; color: #bfbfbf; flex-shrink: 0; min-width: 40px; }
    .sw-item-body { flex: 1; min-width: 0; }
    .sw-brief {
      display: flex; align-items: flex-start; gap: 8px;
      padding: 10px 14px; margin: 0 14px;
      background: linear-gradient(135deg, #fdf2f8, #fef3f2);
      border-left: 3px solid #e61982;
      border-radius: 0 6px 6px 0;
      font-size: 12px; line-height: 1.4; color: #262626;
    }
    .sw-brief-ico { color: #e61982; font-size: 14px; margin-top: 1px; flex-shrink: 0; }
    .sw-brief-text { flex: 1; }
    .sw-widget-wrap { margin: 8px 0; }
    .sw-status-row {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 4px 0; font-size: 11.5px; color: #8c8c8c;
    }
    /* Surcharge ai-message rendu dans la modal subagent : retire la marge user
       et la taille max (toute la largeur dispo de la modal). */
    ::ng-deep ai-message { display: block; }
    ::ng-deep ai-message .msg-wrap { max-width: 100% !important; }
    .sw-tool-raw {
      font-family: 'SFMono-Regular', Consolas, monospace; font-size: 10px;
      color: #bfbfbf; padding: 1px 5px; border-radius: 3px; background: #fafafa;
    }
    .sw-tool-args {
      font-family: 'SFMono-Regular', Consolas, monospace; font-size: 10.5px;
      background: #f5f5f5; padding: 1px 6px; border-radius: 3px;
      color: #595959;
      max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .sw-msg { padding: 8px 10px; border-radius: 8px; }
    .sw-msg.in { background: #fff7e6; border-left: 3px solid #fa8c16; }
    .sw-msg.in.pending { background: #fffbe6; border-left-color: #faad14; border-left-style: dashed; }
    .sw-msg.out { background: #e6f7ff; border-left: 3px solid #1890ff; }
    .sw-msg-from {
      font-size: 10.5px; color: #8c8c8c; font-weight: 600; margin-bottom: 3px;
      display: flex; align-items: center; gap: 6px;
    }
    .sw-pending-chip, .sw-delivered-chip {
      font-size: 10px; padding: 1px 6px; border-radius: 10px;
      display: inline-flex; align-items: center; gap: 3px;
      margin-left: auto;
    }
    .sw-pending-chip { background: #fffbe6; color: #d48806; border: 1px solid #ffe58f; }
    .sw-delivered-chip { background: #f6ffed; color: #389e0d; border: 1px solid #b7eb8f; }
    .sw-msg-text { font-size: 12.5px; line-height: 1.5; }
    .sw-msg-text ::ng-deep p { margin: 0 0 4px; }
    .sw-msg-text ::ng-deep code { background: #f5f5f5; padding: 1px 4px; border-radius: 3px; font-size: 11px; }
    .sw-text-out {
      padding: 10px 12px; border-radius: 8px;
      background: #fdf2f8; border-left: 3px solid #e61982;
    }
    .sw-text-head {
      display: flex; align-items: center; gap: 6px;
      font-size: 10.5px; font-weight: 600; color: #e61982; margin-bottom: 4px;
    }
    .sw-text-body { font-size: 12.5px; line-height: 1.6; color: #262626; }
    .sw-text-body ::ng-deep p { margin: 0 0 6px; }
    .sw-text-body ::ng-deep code { background: #fff; padding: 1px 4px; border-radius: 3px; font-size: 11px; }
    .sw-text-body ::ng-deep pre { background: #fff; padding: 8px; border-radius: 4px; overflow-x: auto; margin: 4px 0; }
    .sw-text-body ::ng-deep ul, .sw-text-body ::ng-deep ol { margin: 4px 0; padding-left: 20px; }
    .sw-status, .sw-perm {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: 11.5px; color: #8c8c8c;
    }
    .sw-perm { color: #fa8c16; }
    .sw-input {
      display: flex; gap: 8px; align-items: flex-end;
      padding: 10px 14px; border-top: 1px solid #f0f0f0; flex-shrink: 0;
      background: #fafafa;
    }
    .sw-input textarea { flex: 1; resize: none; font-size: 12.5px; }
    .sw-finished {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      padding: 10px 14px; background: #f6ffed; color: #52c41a;
      border-top: 1px solid #f0f0f0; font-size: 12px;
    }
  `],
})
export class AiSubagentWindowComponent implements OnInit, OnChanges, OnDestroy {
  @Input({ required: true }) jobId!: string;

  private ai = inject(AiService);
  private api = inject(ApiClientService);
  private msg = inject(NzMessageService);
  private toolLabels = inject(AiToolLabelsService);

  profile: any = null;
  private _job = signal<any | null>(null);
  private _events = signal<TimelineItem[]>([]);
  private _subagentTodo = signal<any | null>(null);

  draft = '';
  sending = signal(false);

  private _busSub: any = null;
  private _jobStreamSub: any = null;

  timeline = computed(() => this._events());

  hasActivity = computed(() => this._events().length > 0);

  /** Messages user → subagent (mailbox poke). Rendus en bulles orangées. */
  userMessages = computed(() => this._events().filter(it => it.kind === 'message_in' || it.kind === 'message_out'));

  /** Widgets finalisés (render_structured / canvas_html / diagram / image / file). */
  widgetMessages = computed(() => this._events().filter(it => it.kind === 'widget'));

  /** Statuts et permissions, rendus en footer. */
  statusMessages = computed(() => this._events().filter(it => it.kind === 'status' || it.kind === 'permission'));

  // Cache pour éviter de recomposer un AiMessage tout neuf à chaque event.
  // Référence stable → pas de re-render destructif de <ai-message> et ses
  // sous-composants (iframe canvas, markdown, live preview).
  private _synthCache: { key: string; msg: AiMessage | null } = { key: '', msg: null };

  /**
   * Synthétise UN AiMessage assistant à partir des events (tools + text_out).
   * Permet de réutiliser <ai-message> et d'avoir exactement le même rendu
   * (segments interleaved, live preview, grouped tool viewer) que le chat.
   * Memoized sur une signature d'état pour stabiliser la référence.
   */
  synthesizedMessage = computed<AiMessage | null>(() => {
    const relevant = this._events().filter(it => it.kind === 'tool' || it.kind === 'text_out');
    if (relevant.length === 0) return null;
    // Signature : nb items + dernier text length + status/duration/livePreview version
    // de chaque tool. Si rien de matériel n'a changé, on réutilise le msg cached.
    const keyParts: string[] = [String(relevant.length)];
    for (const it of relevant) {
      if (it.kind === 'text_out') {
        keyParts.push(`t:${(it.text || '').length}`);
      } else {
        const lpLen = it.livePreview ? JSON.stringify(it.livePreview.data || {}).length : 0;
        keyParts.push(`tc:${it.id}:${it.toolStatus || '?'}:${it.toolDuration || 0}:${lpLen}`);
      }
    }
    const key = keyParts.join('|');
    if (this._synthCache.key === key && this._synthCache.msg) return this._synthCache.msg;

    const segments: AiMessageSegment[] = [];
    const toolCalls: AiToolCall[] = [];
    let lastKind: 'text' | 'tools' | null = null;
    for (const it of relevant) {
      if (it.kind === 'text_out') {
        if (lastKind === 'text' && segments.length) {
          const prev = segments[segments.length - 1];
          prev.content = (prev.content || '') + (it.text || '');
        } else {
          segments.push({ type: 'text', content: it.text || '' });
          lastKind = 'text';
        }
      } else if (it.kind === 'tool') {
        const tc: AiToolCall & { livePreview?: any } = {
          id: it.id,
          name: it.toolName || 'tool',
          args: it.toolArgs,
          result: it.toolResult,
          duration: it.toolDuration,
          status: it.toolStatus === 'error' ? 'error' : (it.toolStatus === 'success' ? 'success' : undefined) as any,
        };
        if (it.livePreview) (tc as any).livePreview = it.livePreview;
        toolCalls.push(tc);
        if (lastKind === 'tools' && segments.length) {
          const prev = segments[segments.length - 1];
          prev.toolCalls = [...(prev.toolCalls || []), tc];
        } else {
          segments.push({ type: 'tools', toolCalls: [tc] });
          lastKind = 'tools';
        }
      }
    }
    const msg: AiMessage = {
      _id: `synthesized-${this.jobId}`,
      threadId: this.ai.currentThread()?.id || '',
      role: 'assistant',
      content: segments.filter(s => s.type === 'text').map(s => s.content || '').join('\n'),
      toolCalls,
      segments,
      metadata: {
        subagentJobId: this.jobId,
      } as any,
    };
    this._synthCache = { key, msg };
    return msg;
  });

  isActive = computed(() => {
    const s = this._job()?.status;
    return !!s && !['completed', 'error', 'cancelled'].includes(s);
  });

  subagentTodo = computed(() => this._subagentTodo());

  /** Phrase-titre résumant ce qui a été demandé au subagent, visible dès le
   *  démarrage (avant que l'agent ne produise le moindre texte). Source :
   *  job.subagentInstructions (le prompt), tronqué à 180 chars. */
  jobBrief = computed<string | null>(() => {
    const raw = this._job()?.subagentInstructions;
    if (!raw || typeof raw !== 'string') return null;
    const cleaned = raw.trim().replace(/\s+/g, ' ');
    if (!cleaned) return null;
    return cleaned.length > 180 ? cleaned.slice(0, 180) + '…' : cleaned;
  });

  ngOnInit(): void {
    // _load() est async : on attend qu'il finisse (set _job avec son status)
    // AVANT de décider d'ouvrir un SSE. Évite d'ouvrir un stream pour un job
    // déjà fini → économise un slot HTTP/1.1 (limite 6/origine).
    this._load().then(() => this._subscribeJobStream());
    this._loadWidgets().catch(() => {});
    this._subscribeBus();
  }

  /** Applique un array de JSON patches simplifiés {op,path,value?} sur un objet. */
  private _applyPatch(base: any, patch: any[]): any {
    let next: any = base && typeof base === 'object' ? JSON.parse(JSON.stringify(base)) : (Array.isArray(base) ? [...base] : {});
    for (const op of patch) {
      if (!op || typeof op.path !== 'string') continue;
      const keys = op.path.split('/').filter(Boolean);
      let cur = next;
      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        if (cur[k] == null) cur[k] = /^\d+$/.test(keys[i + 1]) ? [] : {};
        cur = cur[k];
      }
      const lastKey = keys[keys.length - 1];
      if (op.op === 'add' || op.op === 'replace') {
        if (Array.isArray(cur) && /^\d+$/.test(lastKey)) cur[parseInt(lastKey, 10)] = op.value;
        else if (lastKey != null) cur[lastKey] = op.value;
      } else if (op.op === 'remove' && lastKey != null) {
        if (Array.isArray(cur) && /^\d+$/.test(lastKey)) cur.splice(parseInt(lastKey, 10), 1);
        else delete cur[lastKey];
      }
    }
    return next;
  }

  /** Fetch les AiMessages widget produits par ce subagent et les ajoute en timeline. */
  private async _loadWidgets(): Promise<void> {
    try {
      const tid = this.ai.currentThread()?.id || (this.ai.currentThread() as any)?._id;
      if (!tid) return;
      const data: any = await this.api.get<any>(
        `/api/ai/threads/${tid}`,
        { workspaceId: this._wsId() },
      ).toPromise();
      const msgs: AiMessage[] = Array.isArray(data?.messages) ? data.messages : [];
      // todo_list exclu : la checklist interne est déjà rendue dans la section
      // dédiée "sw-todo" en haut (via _loadSubagentTodo). Pas de double affichage.
      const mine = msgs.filter(m => {
        const md: any = m.metadata || {};
        if (md.subagentJobId !== this.jobId) return false;
        if (md.kind === 'todo_list') return false;
        return isWidgetKind(md.kind);
      });
      if (!mine.length) return;
      this._events.update(arr => {
        const existing = new Set(arr.filter(x => x.kind === 'widget').map(x => x.id));
        const next = [...arr];
        for (const m of mine) {
          const id = `widget-${m._id}`;
          if (existing.has(id)) continue;
          next.push({
            id,
            kind: 'widget',
            at: new Date((m as any).createdAt || Date.now()),
            widget: m,
          });
        }
        return next.sort((a, b) => a.at.getTime() - b.at.getTime());
      });
    } catch { /* non-fatal */ }
  }

  ngOnChanges(c: SimpleChanges): void {
    if (c['jobId'] && !c['jobId'].firstChange) {
      this._load();
      if (this._jobStreamSub) this._jobStreamSub.unsubscribe?.();
      this._subscribeJobStream();
    }
  }

  ngOnDestroy(): void {
    if (this._busSub) this._busSub.unsubscribe?.();
    if (this._jobStreamSub) this._jobStreamSub.unsubscribe?.();
  }

  /**
   * Subscription directe au SSE du job pour capter les events LLM (message,
   * tool.*, done) qui ne sont PAS forwardés vers le thread bus (seul canvas.*
   * et subagent.* sont forwardés). Sans ça, impossible de streamer le texte
   * que le subagent génère en réponse.
   *
   * Skip si le job est déjà terminé : pas besoin d'ouvrir un SSE qui va se
   * fermer aussitôt — économise un slot HTTP/1.1 (limite 6/origine côté browser
   * sinon les modals + thread stream saturent les sockets et bloquent tout).
   */
  private _subscribeJobStream(): void {
    // Cleanup défensif : évite la double-subscription si appelé deux fois (ex:
    // ngOnInit + ngOnChanges sur le même jobId).
    if (this._jobStreamSub) {
      try { this._jobStreamSub.unsubscribe?.(); } catch {}
      this._jobStreamSub = null;
    }
    const status = this._job()?.status;
    if (status === 'completed' || status === 'error' || status === 'cancelled') {
      return; // job déjà fini → pas de stream à ouvrir
    }
    try {
      const stream$ = (this.ai as any).streamJob?.(this.jobId);
      if (!stream$) return;
      this._jobStreamSub = stream$.subscribe({
        next: (ev: any) => this._handleJobEvent(ev),
        error: (e: any) => console.warn('[subagent-window] job stream error:', e?.message),
        complete: () => { this._jobStreamSub = null; },
      });
    } catch (e: any) {
      console.warn('[subagent-window] streamJob not available:', e?.message);
    }
  }

  /** Met à jour un TimelineItem tool par son id avec un patch partiel. */
  private _patchTool(toolId: string, patch: Partial<TimelineItem>, createIfMissing: Partial<TimelineItem> | null = null): void {
    this._events.update(arr => {
      const idx = arr.findIndex(x => x.id === toolId && x.kind === 'tool');
      if (idx >= 0) {
        const next = [...arr];
        next[idx] = { ...next[idx], ...patch };
        return next;
      }
      if (createIfMissing) {
        return [...arr, { id: toolId, kind: 'tool' as const, at: new Date(), ...createIfMissing, ...patch }];
      }
      return arr;
    });
  }

  private _handleJobEvent(ev: any): void {
    if (!ev || !ev.type) return;
    // ── Live preview streaming (ui.preview.start/delta/building_done/update) ──
    if (ev.type === 'ui.preview.start') {
      const toolId = `tool-${ev.toolId}`;
      const type = ev.previewType as LivePreviewType;
      if (!ev.toolId || !type) return;
      this._patchTool(toolId, {
        livePreview: { type, data: {} },
        toolStatus: 'running',
      }, { toolName: ev.toolName, toolStatus: 'running' });
      return;
    }
    if (ev.type === 'ui.preview.delta' || ev.type === 'ui.preview.building_done') {
      const toolId = `tool-${ev.toolId}`;
      const type = ev.previewType as LivePreviewType;
      if (!ev.toolId || !type) return;
      this._patchTool(toolId, {
        livePreview: { type, data: ev.state || {} },
        toolStatus: ev.type === 'ui.preview.building_done' ? 'success' : 'running',
      }, { toolName: ev.toolName, toolStatus: 'running' });
      return;
    }
    if (ev.type === 'ui.preview.update') {
      // Patch incrémental (research_deep steps, execute_code stdout, etc.)
      const toolId = `tool-${ev.toolId}`;
      const type = detectPreviewType(ev.toolName);
      if (!ev.toolId || !type || !Array.isArray(ev.patch)) return;
      this._events.update(arr => {
        const idx = arr.findIndex(x => x.id === toolId && x.kind === 'tool');
        const curData = idx >= 0 ? (arr[idx].livePreview?.data || {}) : {};
        const nextData = this._applyPatch(curData, ev.patch);
        if (idx >= 0) {
          const next = [...arr];
          next[idx] = { ...next[idx], livePreview: { type, data: nextData } };
          return next;
        }
        return [...arr, { id: toolId, kind: 'tool', at: new Date(), toolName: ev.toolName, toolStatus: 'running', livePreview: { type, data: nextData } }];
      });
      return;
    }
    if (ev.type === 'message' && typeof ev.text === 'string') {
      this._events.update(arr => {
        const last = arr[arr.length - 1];
        if (last && last.kind === 'text_out' && last.id.startsWith('text-live-')) {
          const updated = [...arr];
          updated[updated.length - 1] = { ...last, text: (last.text || '') + ev.text };
          return updated;
        }
        return [...arr, {
          id: `text-live-${Date.now()}`,
          kind: 'text_out',
          at: new Date(),
          text: ev.text,
        }];
      });
      return;
    }
    if (ev.type === 'tool.start') {
      // Finalise le text_out en cours → nouvel id pour le prochain
      this._events.update(arr => {
        const last = arr[arr.length - 1];
        if (last && last.kind === 'text_out' && last.id.startsWith('text-live-')) {
          const updated = [...arr];
          updated[updated.length - 1] = { ...last, id: `text-${Date.now()}` };
          return updated;
        }
        return arr;
      });
      // Ajoute un tool item en statut running (sera complété par tool.end)
      const toolId = `tool-${ev.id || ev.toolId || Date.now()}`;
      this._patchTool(toolId, { toolName: ev.name || ev.toolName, toolStatus: 'running' }, {
        toolName: ev.name || ev.toolName,
        toolStatus: 'running',
      });
      return;
    }
    if (ev.type === 'tool.input_delta') {
      // Accumule les args en cours de construction → visible dans le widget
      // tool viewer en streaming (execute_code, spawn_subagent, etc.).
      const toolId = `tool-${ev.id || ev.toolId}`;
      if (!ev.id && !ev.toolId) return;
      this._events.update(arr => {
        const idx = arr.findIndex(x => x.id === toolId && x.kind === 'tool');
        if (idx < 0) return arr;
        const cur = arr[idx];
        const prevArgs = cur.toolArgs || {};
        const nextArgsBuf = (prevArgs._argsBuf || '') + (ev.text || '');
        // Tentative de parse JSON partiel → si ça passe, expose les champs
        // parsés en plus du buffer brut.
        let parsed: any = {};
        try { parsed = JSON.parse(nextArgsBuf); } catch { /* partial JSON, keep buffer only */ }
        const next = [...arr];
        next[idx] = {
          ...cur,
          toolArgs: { ...parsed, _argsBuf: nextArgsBuf },
        };
        return next;
      });
      return;
    }
    if (ev.type === 'tool.end') {
      const toolId = `tool-${ev.id || ev.toolId || Date.now()}`;
      const status: 'success' | 'error' = ev.status === 'error' ? 'error' : 'success';
      this._patchTool(toolId, {
        toolArgs: ev.args,
        toolResult: ev.result,
        toolStatus: status,
        toolDuration: ev.duration,
      }, {
        toolName: ev.name || ev.toolName,
        toolArgs: ev.args,
        toolResult: ev.result,
        toolStatus: status,
        toolDuration: ev.duration,
      });
      // Refresh widget list quand un tool widget-producer termine.
      const name = ev.name || ev.toolName || '';
      if (['render_structured', 'generate_diagram', 'render_interactive_canvas', 'display_image', 'display_file', 'generate_document'].includes(name)) {
        setTimeout(() => this._loadWidgets().catch(() => {}), 300);
      }
      return;
    }
    if (ev.type === 'job.status' && ev.status) {
      this._job.update(j => j ? { ...j, status: ev.status } : j);
      if (ev.status === 'completed' || ev.status === 'error') {
        this._events.update(arr => [...arr, {
          id: `status-${Date.now()}`,
          kind: 'status',
          at: new Date(),
          text: ev.status === 'error' ? `Erreur : ${ev.error || 'inconnu'}` : 'Terminé',
        }]);
      }
      return;
    }
  }

  private async _load(): Promise<void> {
    try {
      const job = await this.api.get<any>(`/api/ai/jobs/${this.jobId}`, { workspaceId: this._wsId() }).toPromise();
      this._job.set(job);
      const p = resolveAgentProfile({ subagentType: job?.subagentType, agentName: job?.agentName });
      this.profile = p ? { ...p } : { name: job?.subagentType || 'Sous-agent', emoji: '🤖', color: '#e61982', tagline: '' };
      this._seedTimelineFromJob(job);
      await this._loadSubagentTodo();
    } catch (e: any) {
      console.warn('[subagent-window] load failed:', e?.message);
    }
  }

  private _wsId(): string | undefined {
    try { return (this.ai as any).wsId?.() || undefined; } catch { return undefined; }
  }

  private _seedTimelineFromJob(job: any): void {
    if (!job) return;
    const items: TimelineItem[] = [];
    const dedup = new Set<string>();
    const add = (it: TimelineItem) => {
      if (dedup.has(it.id)) return;
      dedup.add(it.id);
      items.push(it);
    };

    if (job.startedAt) {
      add({ id: 'start', kind: 'status', at: new Date(job.startedAt), text: `Démarrage de ${this.profile?.name || 'l\'agent'}` });
    }

    // SideEvents persistés (tool.end, subagent.message.received, message deltas...)
    // = historique complet depuis le backend, permet de tout voir à la réouverture.
    const sideEvents: any[] = Array.isArray(job.sideEvents) ? job.sideEvents : [];
    // Regroupe les text deltas en un seul bloc de texte par "run" (coupé sur tool_use ou status)
    let textBuffer = '';
    let textBufferStart: Date | null = null;
    const flushText = () => {
      if (textBuffer.trim()) {
        const at = textBufferStart || new Date();
        add({ id: `text-${at.getTime()}-${items.length}`, kind: 'text_out', at, text: textBuffer });
      }
      textBuffer = '';
      textBufferStart = null;
    };
    for (const ev of sideEvents) {
      const at = new Date(ev.at || ev.timestamp || Date.now());
      if (ev.type === 'message' && ev.text) {
        textBuffer += ev.text;
        if (!textBufferStart) textBufferStart = at;
        continue;
      }
      if (ev.type === 'tool.end') {
        flushText();
        const id = `tool-${ev.id || at.getTime()}`;
        add({
          id,
          kind: 'tool',
          at,
          toolName: ev.name,
          toolArgs: ev.args,
          toolResult: ev.result,
        });
      } else if (ev.type === 'subagent.message.received') {
        flushText();
        add({
          id: `msg-${at.getTime()}-${ev.fromName || ''}`,
          kind: ev.targetJobId === this.jobId ? 'message_in' : 'message_out',
          at,
          text: ev.message || ev.summary || '(message)',
          fromName: ev.fromName,
          pending: false, // déjà délivré (pour historique)
        });
      }
    }
    flushText();

    // Canvas state : tool calls live (prend le relais si sideEvents absents)
    const canvasTask = (this.ai.canvasState()?.tasks || []).find((t: any) => t.id === this.jobId || t.jobId === this.jobId);
    const liveCalls: any[] = canvasTask?.toolCalls || [];
    for (const tc of liveCalls) {
      add({
        id: `tool-${tc.id || tc.at || tc.name}`,
        kind: 'tool',
        at: new Date(tc.at || Date.now()),
        toolName: tc.name,
        toolArgs: tc.args || (tc.argsSummary ? { _summary: tc.argsSummary } : undefined),
        toolResult: tc.result || tc.resultSummary,
      });
    }

    // Fallback : artifacts persistés (fin de job, si pas de sideEvents)
    if (!sideEvents.length && !liveCalls.length && Array.isArray(job.result?.artifacts)) {
      for (const tc of job.result.artifacts) {
        add({
          id: `tool-${tc.id || tc.name + items.length}`,
          kind: 'tool',
          at: new Date(tc.at || job.finishedAt || Date.now()),
          toolName: tc.name,
          toolArgs: tc.args,
          toolResult: tc.result,
        });
      }
    }

    // Mailbox messages : délivrés (consommés par le subagent) ET en attente
    if (Array.isArray(job.pendingMessages)) {
      for (const m of job.pendingMessages) {
        const at = new Date(m.createdAt);
        add({
          id: `msg-${at.getTime()}-${m.fromName || ''}`,
          kind: 'message_in',
          at,
          text: m.message,
          fromName: m.fromName,
          pending: !m.delivered,
        });
      }
    }

    if (job.finishedAt) {
      add({ id: 'end', kind: 'status', at: new Date(job.finishedAt), text: job.status === 'error' ? `Erreur : ${job.error || 'inconnu'}` : 'Terminé' });
    }
    items.sort((a, b) => a.at.getTime() - b.at.getTime());
    this._events.set(items);
  }

  private async _loadSubagentTodo(): Promise<void> {
    try {
      const tid = this.ai.currentThread()?.id || (this.ai.currentThread() as any)?._id;
      if (!tid) return;
      const res = await this.api.get<any>(`/api/ai/threads/${tid}`, { workspaceId: this._wsId() }).toPromise();
      const msgs = res?.messages || [];
      const widgetId = `subagent-todos-${String(this.jobId).slice(-12)}`;
      const todoMsg = msgs.find((m: any) => m?.metadata?.widgetId === widgetId);
      if (todoMsg?.metadata?.todoList) {
        this._subagentTodo.set(todoMsg.metadata.todoList);
      }
    } catch { /* ignore */ }
  }

  private _subscribeBus(): void {
    const bus = (this.ai as any).sideEvents$;
    if (!bus || !bus.subscribe) return;
    this._busSub = bus.subscribe((ev: any) => {
      if (!ev) return;
      // Un event canvas.* utilise `taskId`, un event job utilise `jobId/_jobId/targetJobId`.
      const targetJobId = ev.jobId || ev.targetJobId || ev._jobId || ev.taskId;
      if (targetJobId && String(targetJobId) !== String(this.jobId)) return;

      if (ev.type === 'message' && typeof ev.text === 'string') {
        // Stream text delta du subagent → accumule dans un text_out "en cours"
        this._events.update(arr => {
          const last = arr[arr.length - 1];
          if (last && last.kind === 'text_out' && last.id.startsWith('text-live-')) {
            const updated = [...arr];
            updated[updated.length - 1] = { ...last, text: (last.text || '') + ev.text };
            return updated;
          }
          return [...arr, {
            id: `text-live-${Date.now()}`,
            kind: 'text_out',
            at: new Date(),
            text: ev.text,
          }];
        });
        return;
      }
      if (ev.type === 'tool.start') {
        // Un nouveau tool commence → ferme le text_out "live" en cours pour séparer
        this._events.update(arr => {
          const last = arr[arr.length - 1];
          if (last && last.kind === 'text_out' && last.id.startsWith('text-live-')) {
            const updated = [...arr];
            updated[updated.length - 1] = { ...last, id: `text-${Date.now()}` };
            return updated;
          }
          return arr;
        });
      }
      if (ev.type === 'tool.end' || ev.type === 'canvas.task.toolcall') {
        const toolId = `tool-${ev.toolId || ev.id || ev.at || Date.now()}`;
        const status: 'success' | 'error' = ev.status === 'error' ? 'error' : 'success';
        this._patchTool(toolId, {
          toolArgs: ev.args || (ev.argsSummary ? { _summary: ev.argsSummary } : undefined),
          toolResult: ev.result || ev.resultSummary,
          toolStatus: status,
          toolDuration: ev.duration,
        }, {
          toolName: ev.toolName || ev.name,
          toolArgs: ev.args || (ev.argsSummary ? { _summary: ev.argsSummary } : undefined),
          toolResult: ev.result || ev.resultSummary,
          toolStatus: status,
          toolDuration: ev.duration,
        });
        return;
      }
      // Widget inline produit par le subagent (render_structured/canvas_html/diagram/...)
      if (ev.type === 'ai.message.created' && ev.kind && isWidgetKind(ev.kind)) {
        setTimeout(() => this._loadWidgets().catch(() => {}), 200);
        return;
      }
      if (ev.type === 'subagent.message.received') {
        const kind: TimelineItemKind = ev.targetJobId === this.jobId ? 'message_in' : 'message_out';
        const msgId = `msg-${ev.at || Date.now()}-${ev.fromName || ''}`;
        this._events.update(arr => {
          // Dédup : si un message identique (même at + fromName) existe déjà, skip.
          if (arr.some(x => x.id === msgId)) return arr;
          return [...arr, {
            id: msgId,
            kind,
            at: new Date(ev.at || Date.now()),
            text: ev.message || ev.summary || '(message)',
            fromName: ev.fromName,
          }];
        });
      } else if (ev.type === 'canvas.task.update' || ev.type === 'job.status') {
        const next = ev.status;
        if (next) {
          this._job.update(j => j ? { ...j, status: next } : j);
          this._events.update(arr => [...arr, {
            id: `status-${Date.now()}-${arr.length}`,
            kind: 'status',
            at: new Date(),
            text: `Statut → ${next}${ev.error ? ` (${ev.error})` : ''}`,
          }]);
        }
      } else if (ev.type === 'ai.message.updated' && ev.kind === 'todo_list') {
        this._loadSubagentTodo();
      }
    });
  }

  async send(): Promise<void> {
    const text = this.draft.trim();
    if (!text || this.sending()) return;
    this.sending.set(true);
    try {
      const tid = this.ai.currentThread()?.id || (this.ai.currentThread() as any)?._id;
      if (!tid) { this.msg.error('Pas de thread actif'); return; }
      await this.api.post<any>(
        `/api/ai/threads/${tid}/subagent-poke`,
        { jobId: this.jobId, message: text },
        { workspaceId: this._wsId() },
      ).toPromise();
      // Pas d'ajout optimiste : le backend émet `subagent.message.received` qui
      // sera reçu via sideEvents$ et ajouté dans la timeline sans duplication.
      this.draft = '';
    } catch (e: any) {
      this.msg.error(`Envoi échoué : ${e?.message || 'erreur'}`);
    } finally {
      this.sending.set(false);
    }
  }

  onEnter(e: Event): void {
    const ke = e as KeyboardEvent;
    if (ke.shiftKey) return;
    ke.preventDefault();
    this.send();
  }

  toolLabel(name: string | undefined): string {
    return this.toolLabels.label(name);
  }

  formatArgs(args: any): string {
    if (!args) return '';
    const s = JSON.stringify(args);
    if (s.length > 80) return s.slice(0, 80) + '…';
    return s;
  }

  formatTime(d: Date): string {
    try {
      return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch { return ''; }
  }

  renderMd(text: string): string {
    try {
      const html = marked.parse(String(text || ''), { breaks: true, gfm: true }) as string;
      return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['p', 'strong', 'em', 'code', 'pre', 'a', 'ul', 'ol', 'li', 'br', 'span'],
        ALLOWED_ATTR: ['href', 'target', 'rel'],
      });
    } catch { return text; }
  }

  statusColor(): string {
    const s = this._job()?.status;
    if (s === 'running') return 'processing';
    if (s === 'completed') return 'success';
    if (s === 'error') return 'error';
    if (s === 'waiting_permission' || s === 'waiting_dependency') return 'warning';
    return 'default';
  }

  statusLabel(): string {
    const s = this._job()?.status || 'unknown';
    const map: Record<string, string> = {
      queued: 'En file',
      running: 'En cours',
      waiting_dependency: 'Attente dep.',
      waiting_permission: 'Attente permission',
      paused: 'En pause',
      completed: 'Terminé',
      error: 'Erreur',
      cancelled: 'Annulé',
      stalled: 'Bloqué',
    };
    return map[s] || s;
  }

  trackItem = (_: number, it: TimelineItem) => it.id;
  trackTodo = (_: number, t: any) => t.id;

  todoIcon(status: string): string {
    if (status === 'completed') return 'check-circle';
    if (status === 'in_progress') return 'sync';
    if (status === 'cancelled') return 'stop';
    return 'clock-circle';
  }
}
