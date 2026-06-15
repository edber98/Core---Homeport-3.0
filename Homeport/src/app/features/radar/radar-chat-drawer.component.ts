import { CommonModule } from '@angular/common';
import { AfterViewChecked, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { marked } from 'marked';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { RadarBackendService } from '../../services/radar-backend.service';
import { AccessControlService } from '../../services/access-control.service';
import { RadarEventsService } from '../../services/radar-events.service';
import { RadarChatService, RadarChatOpenRequest } from './radar-chat.service';

// Chat avec le superviseur Radar — même expérience que l'assistant :
// fil de conversation persistant, réponses en direct (SSE), markdown.

interface ChatMsg { id: string; role: 'user' | 'radar'; text: string; at?: string; html?: SafeHtml }
interface LiveTool { id?: string; name: string; status: string; duration?: number }

const TOOL_LABELS: Record<string, string> = {
  launch_mission: 'Lance une mission',
  send_notification: 'Envoie une notification',
  resolve_signal: 'Clôt un signal',
  schedule_wakeup: 'Programme un rappel',
  get_radar_overview: 'Consulte l\'état du radar',
  add_card: 'Ajoute au board',
  close_card: 'Ferme une card',
  save_knowledge: 'Mémorise un fait',
  propose_playbook: 'Propose une procédure',
  mark_playbook_used: 'Applique une procédure',
  reply_user: 'Rédige la réponse',
};

@Component({
  selector: 'radar-chat-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule, NzDrawerModule, NzButtonModule, NzInputModule, NzIconModule, NzSpinModule],
  template: `
  <nz-drawer [nzVisible]="visible" nzPlacement="right" [nzWidth]="520" [nzClosable]="true"
             nzTitle="Radar — conversation" (nzOnClose)="close()">
    <ng-container *nzDrawerContent>
      <div class="chat">
        <div class="chat-scroll" #scroll>
          <nz-spin [nzSpinning]="loading">
            <div class="chat-empty" *ngIf="!messages.length && !loading">
              Parlez à votre radar : posez une question, donnez une instruction, relancez un sujet.
              Il répond ici, et met sur le board ce qui mérite une action.
            </div>
            <div class="msg" *ngFor="let m of messages" [class.msg-user]="m.role === 'user'">
              <div class="bubble" [class.bubble-user]="m.role === 'user'">
                <div class="bubble-md" *ngIf="m.role === 'radar'" [innerHTML]="m.html"></div>
                <ng-container *ngIf="m.role === 'user'">{{ m.text }}</ng-container>
              </div>
              <div class="msg-at">{{ m.at | date:'HH:mm' }}</div>
            </div>
            <div class="msg" *ngIf="liveTools.length || liveText">
              <div class="live-tools" *ngIf="liveTools.length">
                <span class="tool-chip" *ngFor="let t of liveTools" [class.tool-running]="t.status === 'running'" [class.tool-error]="t.status === 'error'">
                  <span nz-icon [nzType]="t.status === 'running' ? 'loading' : t.status === 'error' ? 'close-circle' : 'check-circle'"></span>
                  {{ toolLabel(t.name) }}<span class="tool-ms" *ngIf="t.duration"> · {{ t.duration }} ms</span>
                </span>
              </div>
              <div class="bubble" *ngIf="liveText">
                <div class="bubble-md" [innerHTML]="liveHtml"></div>
              </div>
            </div>
            <div class="msg" *ngIf="waiting && !liveText && !liveTools.length">
              <div class="bubble bubble-typing"><span nz-icon nzType="loading"></span> le radar travaille…</div>
            </div>
          </nz-spin>
        </div>
        <div class="ctx-chip" *ngIf="ctx.contextLabel">
          <span nz-icon nzType="paper-clip"></span> {{ ctx.contextLabel }}
          <span class="ctx-close" nz-icon nzType="close" (click)="clearCtx()"></span>
        </div>
        <div class="chat-input">
          <textarea nz-input rows="2" [(ngModel)]="draft" [disabled]="sending"
                    placeholder="Votre message… (Entrée pour envoyer)"
                    (keydown.enter)="$event.preventDefault(); send()"></textarea>
          <button nz-button nzType="primary" class="send-btn" [disabled]="!draft.trim()" [nzLoading]="sending" (click)="send()">
            <span nz-icon nzType="send"></span>
          </button>
        </div>
      </div>
    </ng-container>
  </nz-drawer>
  `,
  styles: [`
    .chat { display: flex; flex-direction: column; height: 100%; }
    .chat-scroll { flex: 1; overflow-y: auto; padding: 4px 2px; }
    .chat-empty { color: #8c8c8c; font-size: 13px; text-align: center; padding: 40px 20px; }
    .msg { display: flex; flex-direction: column; align-items: flex-start; margin-bottom: 10px; }
    .msg-user { align-items: flex-end; }
    .bubble { max-width: 88%; border-radius: 12px; padding: 8px 12px; font-size: 13.5px; background: #f5f5f5; color: #333; }
    .bubble-user { background: #e61982; color: #fff; border-bottom-right-radius: 4px; }
    .bubble-typing { color: #8c8c8c; font-size: 12.5px; }
    .bubble-md ::ng-deep p { margin: 4px 0; }
    .bubble-md ::ng-deep ul, .bubble-md ::ng-deep ol { margin: 4px 0; padding-left: 18px; }
    .bubble-md ::ng-deep table { border-collapse: collapse; margin: 6px 0; }
    .bubble-md ::ng-deep th, .bubble-md ::ng-deep td { border: 1px solid #e8e8e8; padding: 3px 8px; font-size: 12px; }
    .bubble-md ::ng-deep code { background: #fff; padding: 1px 4px; border-radius: 4px; font-size: 12px; }
    .msg-at { font-size: 10px; color: #bfbfbf; margin-top: 2px; padding: 0 4px; }
    .live-tools { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 6px; }
    .tool-chip { display: inline-flex; align-items: center; gap: 5px; background: #fafafa; border: 1px solid #ececec; border-radius: 12px; padding: 2px 9px; font-size: 11.5px; color: #595959; }
    .tool-running { border-color: #e61982; color: #e61982; }
    .tool-error { border-color: #ffccc7; color: #f5222d; background: #fff2f0; }
    .tool-ms { color: #bfbfbf; }
    .ctx-chip { display: inline-flex; align-items: center; gap: 6px; align-self: flex-start; background: #fafafa; border: 1px solid #ececec; border-radius: 14px; padding: 3px 10px; font-size: 12px; color: #595959; margin-top: 8px; }
    .ctx-close { cursor: pointer; color: #bfbfbf; }
    .ctx-close:hover { color: #595959; }
    .chat-input { display: flex; gap: 8px; padding-top: 10px; border-top: 1px solid #f0f0f0; align-items: flex-end; }
    .chat-input textarea { flex: 1; resize: none; }
    .send-btn { background:#e61982; border-color:#e61982; }
  `],
})
export class RadarChatDrawerComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('scroll') scrollEl?: ElementRef<HTMLDivElement>;
  visible = false;
  loading = false;
  sending = false;
  waiting = false;
  draft = '';
  messages: ChatMsg[] = [];
  ctx: RadarChatOpenRequest = {};
  liveText = '';
  liveHtml: SafeHtml = '';
  liveTools: LiveTool[] = [];
  private subs = new Subscription();
  private shouldScroll = false;

  constructor(
    private radar: RadarBackendService,
    private acl: AccessControlService,
    private radarEvents: RadarEventsService,
    private chatSvc: RadarChatService,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    this.subs.add(this.chatSvc.open$.subscribe(req => {
      this.ctx = req;
      this.visible = true;
      this.loadHistory();
    }));
    this.subs.add(this.radarEvents.events$.subscribe(ev => {
      if (ev.type === 'chat.stream') {
        this.liveText += ev.payload.delta || '';
        try { this.liveHtml = this.sanitizer.bypassSecurityTrustHtml(marked.parse(this.liveText, { breaks: true, gfm: true }) as string); } catch { this.liveHtml = this.liveText; }
        this.waiting = false;
        this.shouldScroll = true;
        return;
      }
      if (ev.type === 'chat.tool') {
        const p2 = ev.payload as LiveTool;
        const existing = p2.id ? this.liveTools.find(t => t.id === p2.id) : undefined;
        if (existing) Object.assign(existing, p2);
        else this.liveTools.push(p2);
        this.waiting = false;
        this.shouldScroll = true;
        return;
      }
      if (ev.type === 'chat.stream.end') {
        this.liveText = ''; this.liveHtml = ''; this.liveTools = [];
        this.waiting = false;
        return;
      }
      if (ev.type !== 'chat.message') return;
      const p = ev.payload;
      if (this.messages.find(m => m.id === p.id)) return;
      // remplace l'append optimiste correspondant (même rôle + même texte)
      const tmpIdx = this.messages.findIndex(m => m.id.startsWith('tmp_') && m.role === p.role && m.text === p.text);
      if (tmpIdx >= 0) { this.messages[tmpIdx] = this.toMsg(p); this.shouldScroll = true; return; }
      this.messages.push(this.toMsg(p));
      if (p.role === 'radar') this.waiting = false;
      this.shouldScroll = true;
    }));
  }

  ngOnDestroy(): void { this.subs.unsubscribe(); }

  ngAfterViewChecked(): void {
    if (this.shouldScroll && this.scrollEl) {
      this.scrollEl.nativeElement.scrollTop = this.scrollEl.nativeElement.scrollHeight;
      this.shouldScroll = false;
    }
  }

  close(): void { this.visible = false; }

  clearCtx(): void { this.ctx = {}; }

  toolLabel(name: string): string { return TOOL_LABELS[name] || name; }

  private loadHistory(): void {
    const wsId = this.acl.currentWorkspaceId();
    if (!wsId) return;
    this.loading = true;
    this.radar.getChat(wsId).subscribe({
      next: (l) => { this.messages = l.map(m => this.toMsg(m)); this.loading = false; this.shouldScroll = true; },
      error: () => { this.loading = false; },
    });
  }

  send(): void {
    const wsId = this.acl.currentWorkspaceId();
    const message = this.draft.trim();
    if (!wsId || !message || this.sending) return;
    this.sending = true;
    // Affichage immédiat (le SSE confirmera avec l'id serveur — dédupliqué par texte récent)
    const optimistic: ChatMsg = { id: 'tmp_' + Date.now(), role: 'user', text: message, at: new Date().toISOString() };
    this.messages.push(optimistic);
    this.shouldScroll = true;
    this.radar.sendMessage(wsId, { message, missionId: this.ctx.missionId, signalId: this.ctx.signalId, cardId: this.ctx.cardId }).subscribe({
      next: () => { this.sending = false; this.draft = ''; this.waiting = true; },
      error: () => { this.sending = false; this.messages = this.messages.filter(x => x.id !== optimistic.id); },
    });
  }

  private toMsg(m: { id: string; role: 'user' | 'radar'; text: string; at?: string }): ChatMsg {
    let html: SafeHtml | undefined;
    if (m.role === 'radar') {
      try { html = this.sanitizer.bypassSecurityTrustHtml(marked.parse(m.text || '', { breaks: true, gfm: true }) as string); }
      catch { html = m.text; }
    }
    return { ...m, html };
  }
}
