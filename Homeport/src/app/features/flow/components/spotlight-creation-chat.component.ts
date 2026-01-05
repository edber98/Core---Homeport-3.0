import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ChangeDetectorRef, ViewChild, ElementRef, OnInit, OnChanges, SimpleChanges, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { ChatRendererComponent } from '../../../shared/chat/chat-renderer.component';
import { AiCreateNodeAgentService, CreateNodeEvent } from '../../../services/ai-create-node-agent.service';
import { AiConsoleBackendService } from '../../../services/ai-console-backend.service';

type Msg = { id: string; role: 'user'|'assistant'; text?: string; parts?: any[]; createdAt: number; pending?: boolean };

@Component({
  selector: 'spotlight-creation-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzIconModule, ChatRendererComponent],
  template: `
  <div class="node-chat">
    <div class="hdr">
      <div class="t">Assistant création</div>
      <div class="spacer"></div>
      <button class="btn icon" (click)="close.emit()" title="Fermer"><i class="fa-solid fa-xmark"></i></button>
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
    <div class="proposal" *ngIf="graphProposal">
      <div class="desc">Proposition de création disponible</div>
      <div class="actions">
        <button class="btn small" (click)="emitApplyGraph()"><i class="fa-solid fa-plus"></i> Appliquer</button>
        <button class="btn small ghost" (click)="clearGraphProposal()"><i class="fa-solid fa-xmark"></i> Ignorer</button>
      </div>
    </div>
    <div class="composer">
      <div class="input-wrap">
        <textarea #promptEl class="input" [(ngModel)]="prompt" rows="1" placeholder="Décrivez le nœud à créer… (Entrée pour envoyer, Maj+Entrée pour retour à la ligne)" (keydown.enter)="onEnter($event)" (input)="autoGrow()"></textarea>
        <div class="hint">
          <span><span class="kbd">Entrée</span> envoyer · <span class="kbd">Maj</span>+<span class="kbd">Entrée</span> nouvelle ligne</span>
          <span class="count">{{ (prompt||'').length }}</span>
        </div>
      </div>
      <button class="send" (click)="send()" [disabled]="!prompt"><i class="fa-regular fa-paper-plane"></i><span>Envoyer</span></button>
    </div>
  </div>
  `,
  styles: [`
    :host { display:block; height:100%; }
    .node-chat { position: relative; display:flex; flex-direction: column; gap: 0; height: 100%; min-height:0; background:#fff; }
    .hdr { display:flex; align-items:center; gap:8px; padding:8px 10px; border-bottom:1px solid #f0f0f0; position:sticky; top:0; background:#fff; z-index:1; }
    .hdr .t { font-weight:600; }
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
    .kbd { font-family: ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,\"Liberation Mono\",\"Courier New\",monospace; font-size: 10px; padding: 2px 6px; border: 1px solid #e5e7eb; background:#f8fafc; border-radius: 8px; color:#6b7280; }
    .send { display:inline-flex; align-items:center; gap:8px; padding: 8px 12px; border-radius: 14px; background:#1677ff; color:#fff; border:0; font-weight:600; height:40px; }
    .send:disabled { opacity:.6; cursor:not-allowed; }
    .proposal { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:8px 10px; border-top:1px solid #e5e7eb; background:#fffbe6; color:#111; }
    .proposal .desc { font-size: 12px; }
    .proposal .actions { display:flex; gap:8px; }
    .btn.small { appearance:none; border:1px solid #e5e7eb; background:#fff; color:#111; padding:6px 10px; border-radius:10px; cursor:pointer; font-size:12px; font-weight:600; }
    .btn.small.ghost { background:#fafafa; }
  `]
})
export class SpotlightCreationChatComponent implements OnInit, OnChanges, AfterViewInit {
  @Input() seedGraph: any = null;
  @Input() initialPrompt: string | null = null;
  @Input() sourceId!: string;
  @Input() sourceHandle: string | null = null;
  @Input() threadId: string | null = null;
  @Input() flowId: string | null = null;
  @Output() graphGenerated = new EventEmitter<any>();
  @Output() close = new EventEmitter<void>();

  messages: Msg[] = [];
  prompt = '';
  @ViewChild('promptEl') promptEl?: ElementRef<HTMLTextAreaElement>;
  graphProposal: any = null;

  constructor(private creator: AiCreateNodeAgentService, private chats: AiConsoleBackendService, private cdr: ChangeDetectorRef) {}
  private autoSent = false;
  ngOnInit(): void { /* inputs set before init in most cases */ }
  ngAfterViewInit(): void { this.tryAutoSend(); }
  ngOnChanges(changes: SimpleChanges): void {
    if ('initialPrompt' in changes || 'threadId' in changes) this.tryAutoSend();
  }
  private tryAutoSend(){
    try {
      if (this.autoSent) return;
      const p = (this.initialPrompt || '').trim();
      if (!p) return;
      // If thread is still being created asynchronously, wait a short moment then send
      const ready = !!(this.seedGraph && this.sourceId);
      if (!ready || !this.threadId) {
        try { console.log('[spotlight-creation] delaying auto-send', { hasPrompt: !!p, hasSeed: !!this.seedGraph, sourceId: this.sourceId, hasThread: !!this.threadId }); } catch {}
        setTimeout(() => {
          if (this.autoSent) return;
          this.autoSent = true; this.sendPrompt(p);
        }, 250);
        return;
      }
      this.autoSent = true; this.sendPrompt(p);
    } catch {}
  }

  onEnter(ev: any) { if ((ev as KeyboardEvent).shiftKey) return; ev.preventDefault(); this.send(); }
  autoGrow() { try { const el = this.promptEl?.nativeElement; if (!el) return; el.style.height = '0px'; el.style.height = Math.min(el.scrollHeight, 160) + 'px'; } catch {} }

  send() { const txt = (this.prompt || '').trim(); if (!txt) return; this.sendPrompt(txt); this.prompt = ''; }
  private sendPrompt(txt: string) {
    const now = Date.now();
    this.messages = [...this.messages, { id: `u-${now}`, role:'user', text: txt, createdAt: now }];
    // Track timings and error flags for end-of-stream logs
    let startedAt = now;
    let sawEventSourceError = false;
    let sawDone = false;
    try { this.cdr.detectChanges(); } catch {}
    // Persist user message into the temporary thread when available
    try { const tid = this.threadId || null; if (tid) this.chats.appendMessage(tid, { threadId: tid, role: 'user', text: txt } as any).subscribe(()=>{}); } catch {}
    try { console.log('[spotlight-creation] send stream', { hasSeed: !!this.seedGraph, sourceId: this.sourceId, sourceHandle: this.sourceHandle, threadId: this.threadId, flowId: this.flowId }); } catch {}
    const stream = this.creator.stream({ prompt: txt, seedGraph: this.seedGraph, sourceId: this.sourceId, sourceHandle: this.sourceHandle || undefined, threadId: this.threadId || undefined, flowId: this.flowId || undefined });
    let assistantParts: any[] = [];
    let lastLineAppended: string | null = null;
    let sawSseDoneMsg = false;
    let sawSseFinishedMsg = false;
    const appendText = (t: string) => {
      if (!t) return;
      const last = assistantParts[assistantParts.length - 1];
      if (last && last.kind === 'text') last.text = (last.text || '') + t; else assistantParts.push({ kind:'text', text: t });
    };
    const sub = stream.events$.subscribe({
      next: (ev: CreateNodeEvent) => {
        if (!ev) return;
        if (ev.type === 'error') {
          const code = String((ev as any).code || '').toLowerCase();
          if (code === 'eventsource_error') { sawEventSourceError = true; return; }
          if (code === 'args_locked' || code === 'desc_locked') { return; }
          const msg = `\n[erreur] ${(ev as any).code || ''} ${(ev as any).message || ''}`.trim();
          appendText(msg);
          const tmp: Msg = { id:`a-prev`, role:'assistant', parts: assistantParts.slice(), createdAt: Date.now(), pending: true } as any;
          const others = this.messages.filter(x => !x.pending);
          this.messages = [...others, tmp];
          try { this.cdr.detectChanges(); } catch {}
          return;
        }
        if (ev.type === 'message' && ev.text) {
          const lines = String(ev.text).split(/\r?\n/);
          for (const line of lines) {
            if (!line) continue;
            const isTool = /^\[tool\]/i.test(line);
            if (/^\[ai-create-node\]\[sse\] done/i.test(line)) sawSseDoneMsg = true;
            if (/^\[ai-create-node\]\[sse\] finished/i.test(line)) sawSseFinishedMsg = true;
            const out = isTool ? ('\n' + line) : line;
            if (lastLineAppended === line) continue;
            appendText(out);
            lastLineAppended = line;
          }
          const tmp: Msg = { id:`a-prev`, role:'assistant', parts: assistantParts.slice(), createdAt: Date.now(), pending: true } as any;
          const others = this.messages.filter(x => !x.pending);
          this.messages = [...others, tmp];
          try { this.cdr.detectChanges(); } catch {}
        }
        if (ev.type === 'tool.start') {
          appendText(`\n[tool] ${ev.name || 'tool'} start`);
          const tmp: Msg = { id:`a-prev`, role:'assistant', parts: assistantParts.slice(), createdAt: Date.now(), pending: true } as any;
          const others = this.messages.filter(x => !x.pending);
          this.messages = [...others, tmp];
          try { this.cdr.detectChanges(); } catch {}
        }
        if (ev.type === 'tool.end') {
          appendText(`\n[tool] ${ev.name || 'tool'} done`);
          const tmp: Msg = { id:`a-prev`, role:'assistant', parts: assistantParts.slice(), createdAt: Date.now(), pending: true } as any;
          const others = this.messages.filter(x => !x.pending);
          this.messages = [...others, tmp];
          try { this.cdr.detectChanges(); } catch {}
        }
        if (ev.type === 'await_user') {
          const q = (ev as any).question || '';
          const reason = (ev as any).reason ? ` [${(ev as any).reason}]` : '';
          appendText(`\n${q || 'L’agent a besoin de précisions.'}${reason}`);
          const tmp: Msg = { id:`a-prev`, role:'assistant', parts: assistantParts.slice(), createdAt: Date.now(), pending: true } as any;
          const others = this.messages.filter(x => !x.pending);
          this.messages = [...others, tmp];
          try { this.cdr.detectChanges(); } catch {}
        }
        if (ev.type === 'final' && (ev as any).graph) {
          // Do not flush the assistant preview yet; more tool logs may arrive.
          // Only set the proposal and keep streaming until 'done' to avoid splitting into two messages.
          this.graphProposal = (ev as any).graph;
          try { this.cdr.detectChanges(); } catch {}
        }
        if (ev.type === 'done') { sawDone = true; /* no transcript line for done */ }
      },
      error: () => { try { sub.unsubscribe(); } catch {} },
      complete: () => {
        try { sub.unsubscribe(); } catch {}
        // Finalize and persist a single assistant message including closing logs
        const dt = Date.now() - startedAt;
        // No transcript line for finished; just finalize/persist
        const hasPreview = assistantParts.length > 0;
        const parts = assistantParts.slice(); assistantParts = [];
        if (hasPreview) {
          const others = this.messages.filter(x => !x.pending);
          this.messages = [...others, { id:`a-${Date.now().toString(36)}`, role:'assistant', parts, createdAt: Date.now() }];
          try { this.cdr.detectChanges(); } catch {}
          try { const tid = this.threadId || null; if (tid) this.chats.appendMessage(tid, { threadId: tid, role: 'assistant', parts } as any).subscribe(()=>{}); } catch {}
        }
      }
    });
  }
  clearGraphProposal(){ this.graphProposal = null; try { this.cdr.detectChanges(); } catch {} }
  emitApplyGraph(){ const g = this.graphProposal; this.graphProposal = null; try { this.cdr.detectChanges(); } catch {} if (g) this.graphGenerated.emit(g); }
}
