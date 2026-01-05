import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ChangeDetectorRef, ViewChild, ElementRef, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { ChatRendererComponent } from '../../../shared/chat/chat-renderer.component';
import { AiConsoleBackendService, AiChatMessage, AiChatThread } from '../../../services/ai-console-backend.service';
import { AiWorkflowAgentV2Service, WorkflowAgentV2Event } from '../../../services/ai-workflow-agent-v2.service';

type Msg = AiChatMessage & { pending?: boolean };

@Component({
  selector: 'node-assistant-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzIconModule, ChatRendererComponent],
  template: `
  <div class="node-chat">
    <div class="hdr">
      <div class="t">Assistant du nœud</div>
      <div class="sub mono" *ngIf="nodeName">{{ nodeName }}</div>
      <div class="spacer"></div>
      <button class="btn icon" (click)="resetThread()" [disabled]="!threadId" title="Réinitialiser"><i class="fa-regular fa-rotate"></i></button>
    </div>
    <div class="messages" #msgs>
      <div class="msg-row" *ngFor="let m of messages" [class.me]="m.role==='user'" [class.assistant]="m.role==='assistant'">
        <div class="bubble">
          <div class="txt" *ngIf="!m.parts">{{ m.text }}</div>
          <div class="txt rich" *ngIf="m.parts"><chat-renderer [parts]="m.parts"></chat-renderer></div>
        </div>
        <div class="meta">
          <span class="who">{{ m.role==='user' ? 'Vous' : 'Assistant' }}</span>
          <span class="time">· {{ m.createdAt | date:'shortTime' }}</span>
        </div>
      </div>
    </div>
    <div class="composer">
      <div class="input-wrap">
        <textarea #promptEl class="input" [(ngModel)]="prompt" rows="1" placeholder="Écris un message… (Entrée pour envoyer, Maj+Entrée pour retour à la ligne)" (keydown.enter)="onEnter($event)" (input)="autoGrow()"></textarea>
        <div class="hint">
          <span><span class="kbd">Entrée</span> envoyer · <span class="kbd">Maj</span>+<span class="kbd">Entrée</span> nouvelle ligne</span>
          <span class="count">{{ (prompt||'').length }}</span>
        </div>
      </div>
      <button class="send" (click)="send()" [disabled]="!prompt || !threadId"><i class="fa-regular fa-paper-plane"></i><span>Envoyer</span></button>
    </div>
  </div>
  `,
  styles: [`
    :host { display:block; height:100%; }
    .node-chat { position: relative; display:flex; flex-direction: column; gap: 0; height: 100%; min-height:0; background:#fff; }
    .hdr { display:flex; align-items:center; gap:8px; padding:8px 10px; border-bottom:1px solid #f0f0f0; position:sticky; top:0; background:#fff; z-index:1; }
    .hdr .t { font-weight:600; }
    .hdr .sub { color:#6b7280; font-size:12px; }
    .hdr .spacer { margin-left:auto; }
    .btn.icon { appearance:none; border:0; background:#fff; border:1px solid #e5e7eb; color:#111; padding:8px 10px; border-radius:12px; cursor:pointer; width:36px; height:32px; display:inline-flex; align-items:center; justify-content:center; }
    .btn.icon:hover { background:#f8fafc; }
    .messages { overflow:auto; min-height:0; padding: 14px 14px; display:flex; flex-direction:column; gap:10px; background:#f8fafc; scrollbar-gutter: stable; flex: 1 1 auto; }
    .msg-row { display:grid; grid-template-columns: 1fr; gap:6px; }
    .bubble { max-width: 86%; padding: 10px 12px; border-radius: 16px; border: 1px solid #e5e7eb; background:#fff; line-height: 1.35; font-size: 14px; white-space: pre-wrap; word-break: break-word; }
    .msg-row.me { justify-items: end; }
    .msg-row.me .bubble { background: linear-gradient(135deg, rgba(22,119,255,.95), rgba(22,119,255,.65)); color:#fff; border-color: rgba(22,119,255,.55); border-bottom-right-radius: 6px; }
    .msg-row.assistant .bubble { background: #ffffff; color:#111827; border-color:#e5e7eb; border-bottom-left-radius: 6px; }
    .meta { display:flex; gap:8px; align-items:center; font-size: 11px; color:#6b7280; }
    .msg-row.me .meta { justify-content:flex-end; }
    .composer { border-top: 1px solid #e5e7eb; padding: 10px; display:grid; grid-template-columns: 1fr auto; gap:10px; align-items:end; background:#fff; }
    .input-wrap { display:grid; gap:8px; background:#fff; border:1px solid #e5e7eb; border-radius: 16px; padding: 8px; }
    .composer .input { width:100%; min-height:44px; max-height:160px; resize:none; border:0; outline:none; background:transparent; color:#111827; font-size:14px; line-height:1.35; padding:6px 8px; }
    .hint { display:flex; justify-content:space-between; gap:10px; padding: 0 4px; color:#6b7280; font-size:11px; }
    .kbd { font-family: ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace; font-size: 10px; padding: 2px 6px; border: 1px solid #e5e7eb; background:#f8fafc; border-radius: 8px; color:#6b7280; }
    .send { display:inline-flex; align-items:center; gap:8px; padding: 8px 12px; border-radius: 14px; background:#1677ff; color:#fff; border:0; font-weight:600; height:40px; }
    .send:disabled { opacity:.6; cursor:not-allowed; }
    .mono { font-family: ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace; }
  `]
})
export class NodeAssistantChatComponent implements OnInit {
  @Input() flowId: string | null = null;
  @Input() nodeId: string | null = null;
  @Input() nodeName: string | null = null;
  @Input() threadId: string | null = null;
  @Output() threadLinked = new EventEmitter<{ threadId: string; type: string }>();

  messages: Msg[] = [];
  prompt = '';
  @ViewChild('promptEl') promptEl?: ElementRef<HTMLTextAreaElement>;

  constructor(private api: AiConsoleBackendService, private agentV2: AiWorkflowAgentV2Service, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.ensureThread();
  }

  private ensureThread() {
    const fid = this.flowId; const nid = this.nodeId;
    if (!fid || !nid) return;
    if (this.threadId) { this.loadMsgs(); return; }
    // Try to find an existing thread for this node
    this.api.listChats(fid).subscribe((list: AiChatThread[]) => {
      const wantedPrefix = `[node:${nid}]`;
      const found = (list || []).find(t => (t.title || '').startsWith(wantedPrefix));
      if (found) {
        this.threadId = found.id; this.threadLinked.emit({ threadId: found.id, type: 'node_assistant' }); this.loadMsgs(); try { this.cdr.detectChanges(); } catch {}
        return;
      }
      // Create a new thread with metadata in title; backend may also store type/nodeId if supported
      const title = `${wantedPrefix} Assistant • ${this.nodeName || nid}`;
      // If backend supports extra fields, they will be ignored otherwise
      (this.api as any).createChat(fid, title, { nodeId: nid, type: 'node_assistant' }).subscribe((t: AiChatThread) => {
        this.threadId = t.id; this.messages = []; this.threadLinked.emit({ threadId: t.id, type: 'node_assistant' }); try { this.cdr.detectChanges(); } catch {}
      }, () => {
        // Fallback to basic createChat signature
        this.api.createChat(fid, title).subscribe(t2 => { this.threadId = t2.id; this.messages = []; this.threadLinked.emit({ threadId: t2.id, type: 'node_assistant' }); try { this.cdr.detectChanges(); } catch {} });
      });
    });
  }

  private loadMsgs() {
    const tid = this.threadId; if (!tid) { this.messages = []; return; }
    this.api.listMessages(tid).subscribe(list => { this.messages = (list || []); try { this.cdr.detectChanges(); } catch {} });
  }

  resetThread() {
    const tid = this.threadId; if (!tid) return;
    this.api.deleteMessages(tid).subscribe(() => { this.messages = []; try { this.cdr.detectChanges(); } catch {} });
  }

  onEnter(ev: any) { if ((ev as KeyboardEvent).shiftKey) return; ev.preventDefault(); this.send(); }
  autoGrow() {
    try { const el = this.promptEl?.nativeElement; if (!el) return; el.style.height = '0px'; el.style.height = Math.min(el.scrollHeight, 160) + 'px'; } catch {}
  }
  send() {
    const tid = this.threadId; const txt = (this.prompt || '').trim(); if (!tid || !txt) return;
    const now = Date.now();
    const m: Msg = { id: `${tid}-${now.toString(36)}`, threadId: tid, role: 'user', text: txt, createdAt: now, pending: false } as any;
    this.messages = [...this.messages, m];
    this.prompt = '';
    try { this.cdr.detectChanges(); } catch {}
    this.api.appendMessage(tid, { threadId: tid, role: 'user', text: txt } as any).subscribe(() => {
      const stream = this.agentV2.stream({ flowId: this.flowId || undefined, action: undefined, threadId: this.threadId || undefined });
      let assistantParts: any[] = [];
      const mergeText = (base: string, add: string) => (base || '') + (add || '');
      const appendToLastTextPart = (token: string) => {
        const t = String(token || ''); if (!t) return;
        const last = assistantParts[assistantParts.length - 1];
        if (last && last.kind === 'text') last.text = mergeText(last.text || '', t);
        else assistantParts.push({ kind: 'text', text: mergeText('', t) });
      };
      const sub = stream.events$.subscribe({
        next: (ev: WorkflowAgentV2Event) => {
          if (!ev) return;
          if (ev.type === 'message' && ev.text) {
            const raw = String(ev.text || '');
            const lines = raw.split(/\r?\n/);
            for (const seg of lines) {
              if (seg === undefined || seg === null) continue;
              const isTool = /^\[tool\]/i.test(seg);
              appendToLastTextPart(isTool ? ("\n" + seg) : seg);
            }
            const tmp: Msg = { id: `${tid}-assistant-preview`, threadId: tid, role: 'assistant', parts: assistantParts.slice(), createdAt: Date.now(), pending: true } as any;
            const others = this.messages.filter(x => !x.pending);
            this.messages = [...others, tmp];
            try { this.cdr.detectChanges(); } catch {}
          }
          if ((ev as any).type === 'question') {
            const text = (ev as any).text || 'J’ai besoin d’une précision (voir options ci-dessus).';
            assistantParts.push({ kind: 'text', text });
            const tmp: Msg = { id: `${tid}-assistant-question`, threadId: tid, role: 'assistant', parts: assistantParts.slice(), createdAt: Date.now(), pending: true } as any;
            const others = this.messages.filter(x => !x.pending);
            this.messages = [...others, tmp];
            try { this.cdr.detectChanges(); } catch {}
          }
          if (ev.type === 'final' || ev.type === 'done') {
            const parts = assistantParts.slice();
            assistantParts = [];
            const others = this.messages.filter(x => !x.pending);
            this.messages = [...others, { id: `${tid}-${Date.now().toString(36)}`, threadId: tid, role: 'assistant', parts, createdAt: Date.now() } as any];
            try { this.cdr.detectChanges(); } catch {}
            this.api.appendMessage(tid, { threadId: tid, role: 'assistant', parts } as any).subscribe(() => {});
          }
        },
        error: () => { try { sub.unsubscribe(); } catch {} },
        complete: () => { try { sub.unsubscribe(); } catch {} }
      });
    });
  }
}

