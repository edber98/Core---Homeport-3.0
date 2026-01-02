import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { ChatRendererComponent } from '../../../shared/chat/chat-renderer.component';
import { AiConsoleBackendService, AiChatThread, AiChatMessage, AiContext } from '../../../services/ai-console-backend.service';

type Msg = AiChatMessage & { pending?: boolean };

@Component({
  selector: 'ai-console-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzIconModule, ChatRendererComponent],
  template: `
  <div class="console-chat">
    <div class="pane threads">
      <div class="hdr">
        <div class="t">Chats</div>
        <div class="spacer"></div>
        <button nz-button nzSize="small" (click)="createThread()"><i class="fa-solid fa-plus"></i> Nouveau</button>
      </div>
      <div class="list" *ngIf="threads?.length; else emptyThreads">
        <button class="item" *ngFor="let t of threads" [class.active]="t.id===threadId" (click)="selectThread(t)">
          <div class="name mono">{{ t.title }}</div>
          <div class="sub">{{ t.updatedAt | date:'short' }}</div>
          <button class="del" title="Supprimer" (click)="deleteThread(t); $event.stopPropagation()"><i class="fa-regular fa-trash-can"></i></button>
        </button>
      </div>
      <ng-template #emptyThreads>
        <div class="empty">Aucun chat. Créez un premier thread.</div>
      </ng-template>
      <div class="ctx">
        <div class="ctx-hdr">Mémoire du projet</div>
        <textarea [(ngModel)]="ctxText" rows="3" placeholder="Décrivez le contexte (stocké pour ce workflow)"></textarea>
        <div class="row">
          <button nz-button nzSize="small" (click)="saveCtx()">Sauver</button>
          <button nz-button nzSize="small" nzDanger (click)="clearCtx()">Effacer</button>
        </div>
      </div>
    </div>
    <div class="pane dialog">
      <div class="messages" #msgs>
        <div class="bubble" *ngFor="let m of messages" [class.me]="m.role==='user'" [class.assistant]="m.role==='assistant'">
          <div class="txt" *ngIf="!m.parts">{{ m.text }}</div>
          <div class="txt rich" *ngIf="m.parts"><chat-renderer [parts]="m.parts"></chat-renderer></div>
        </div>
      </div>
      <div class="composer">
        <textarea class="input" [(ngModel)]="prompt" rows="1" placeholder="Écrire une instruction…" (keydown.enter)="onEnter($event)"></textarea>
        <button nz-button nzType="primary" (click)="send()" [disabled]="!prompt || !threadId">Envoyer</button>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .console-chat { position: relative; display:grid; grid-template-columns: 260px 1fr; gap: 0; height:100%; }
    .pane { min-height:0; }
    .pane.threads { background:#fff; display:flex; flex-direction:column; }
    .hdr { display:flex; align-items:center; gap:8px; padding:8px 10px; }
    .hdr .t { font-weight:600; }
    .hdr .spacer { margin-left:auto; }
    .list { display:flex; flex-direction:column; gap:6px; padding: 0 10px 8px; overflow:auto; }
    .item { position: relative; text-align:left; background:#fff; border:1px solid transparent; border-radius:10px; padding:8px; cursor:pointer; }
    .item.active { border-color:#1677ff; box-shadow: 0 0 0 2px rgba(22,119,255,0.12); }
    .item .name { font-size:12px; color:#111; }
    .item .sub { font-size:11px; color:#8c8c8c; }
    .item .del { position:absolute; right:6px; top:6px; background:transparent; border:0; color:#8c8c8c; cursor:pointer; }
    .empty { color:#8c8c8c; font-size:12px; padding: 0 10px 10px; }
    .ctx { margin-top:auto; border-top:1px solid #f0f0f0; padding:10px; display:flex; flex-direction:column; gap:6px; }
    .ctx-hdr { font-weight:600; font-size:12px; color:#444; }
    .ctx textarea { width:100%; border:1px solid #e5e7eb; border-radius:10px; padding:8px; resize:vertical; min-height:72px; }
    .ctx .row { display:flex; gap:6px; }
    .mono { font-family: ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace; }
    .pane.dialog { background:#fff; display:flex; flex-direction:column; }
    .messages { flex:1; overflow:auto; padding: 10px 12px; display:flex; flex-direction:column; gap:10px; background:#f8fafc; }
    .bubble { max-width: 80%; padding: 10px 12px; border-radius: 18px; line-height: 1.25; font-size: 14px; box-shadow: 0 1px 0 rgba(0,0,0,.04); }
    .bubble.me { align-self: flex-end; background: #0a84ff; color: #fff; border-bottom-right-radius: 6px; }
    .bubble.assistant { align-self: flex-start; background: #e9ecef; color: #111827; border-bottom-left-radius: 6px; }
    .composer { border-top: 1px solid #e5e7eb; padding: 10px; display:flex; gap:8px; align-items:flex-end; background:#fff; }
    .composer .input { flex:1 1 auto; border:1px solid #e5e7eb; border-radius:10px; padding:10px; min-height:40px; max-height:160px; resize: vertical; }
    @media (max-width: 1024px) { .console-chat { grid-template-columns: 1fr; } }
  `]
})
export class AiConsoleChatComponent {
  @Input() flowId: string | null = null;
  @Output() openThread = new EventEmitter<AiChatThread>();
  threads: AiChatThread[] = [];
  threadId: string | null = null;
  ctxText = '';
  messages: Msg[] = [];
  prompt = '';

  constructor(private api: AiConsoleBackendService, private cdr: ChangeDetectorRef) {}

  ngOnInit() { this.refresh(); }

  private refresh() {
    const fid = this.flowId; if (!fid) return;
    this.api.listChats(fid).subscribe(list => { this.threads = list || []; if (!this.threadId && this.threads.length) this.threadId = this.threads[0].id; this.loadCtx(); this.loadMsgs(); try { this.cdr.detectChanges(); } catch {} });
  }
  private loadCtx() {
    const fid = this.flowId; if (!fid) return; this.api.getContext(fid).subscribe((c: AiContext | null) => { this.ctxText = (c?.data != null) ? (typeof c.data === 'string' ? c.data : JSON.stringify(c.data)) : ''; try { this.cdr.detectChanges(); } catch {} });
  }
  private loadMsgs() {
    const tid = this.threadId; if (!tid) { this.messages = []; return; }
    this.api.listMessages(tid).subscribe(list => { this.messages = (list || []); try { this.cdr.detectChanges(); } catch {} });
  }

  createThread() {
    const fid = this.flowId; if (!fid) return;
    const title = `Chat ${new Date().toLocaleString()}`;
    this.api.createChat(fid, title).subscribe(t => { this.threads = [t, ...(this.threads||[])]; this.threadId = t.id; this.messages = []; try { this.cdr.detectChanges(); } catch {} });
  }
  deleteThread(t: AiChatThread) {
    const fid = this.flowId; if (!fid) return;
    this.api.deleteChat(fid, t.id).subscribe(() => { this.threads = (this.threads||[]).filter(x => x.id !== t.id); if (this.threadId === t.id) { this.threadId = this.threads[0]?.id || null; this.loadMsgs(); } try { this.cdr.detectChanges(); } catch {} });
  }
  selectThread(t: AiChatThread) { this.threadId = t.id; this.loadMsgs(); this.openThread.emit(t); }

  saveCtx() { const fid = this.flowId; if (!fid) return; this.api.saveContext(fid, this.ctxText).subscribe(() => {}); }
  clearCtx() { const fid = this.flowId; if (!fid) return; this.api.clearContext(fid).subscribe(() => { this.ctxText=''; try { this.cdr.detectChanges(); } catch {} }); }

  onEnter(ev: any) { if ((ev as KeyboardEvent).shiftKey) return; ev.preventDefault(); this.send(); }
  send() {
    const tid = this.threadId; const txt = (this.prompt || '').trim(); if (!tid || !txt) return;
    const now = Date.now();
    const m: Msg = { id: `${tid}-${now.toString(36)}`, threadId: tid, role: 'user', text: txt, createdAt: now, pending: false } as any;
    this.messages = [...this.messages, m];
    this.prompt = '';
    try { this.cdr.detectChanges(); } catch {}
    // Placeholder: persistence of user message only for now
    this.api.appendMessage(tid, { threadId: tid, role: 'user', text: txt } as any).subscribe(() => {});
  }
}
