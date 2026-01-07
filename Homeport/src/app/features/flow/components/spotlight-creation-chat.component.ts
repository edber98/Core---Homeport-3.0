import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ChangeDetectorRef, ViewChild, ElementRef, OnInit, OnChanges, SimpleChanges, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { ChatRendererComponent } from '../../../shared/chat/chat-renderer.component';
import { AiCreateNodeAgentService, CreateNodeEvent } from '../../../services/ai-create-node-agent.service';
import { ToolsBackendService, ToolMeta } from '../../../services/tools-backend.service';
import { NunjucksService } from '../../../shared/nunjucks.service';
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
    .bubble { max-width: 86%; padding: 10px 12px; border-radius: 16px; border: 1px solid #e5e7eb; background:#fff; line-height: 1.35; font-size: 14px; white-space: normal; word-break: break-word; }
    :host ::ng-deep .txt.rich .text p { margin: 0 !important; }
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

  // Registry Tools (labels/templates) et template par défaut pour l'infobulle
  private toolsDict: Record<string, ToolMeta> = {};
  defaultTpl = '<h4>{{ tool.name or functionName }}</h4><ul>{% for k, v in args %}<li><b>{{ k }}</b>: <pre>{{ v | json }}</pre></li>{% endfor %}</ul>{% if arg_running %}<em>Arguments en cours...</em>{% endif %}';

  constructor(
    private creator: AiCreateNodeAgentService,
    private chats: AiConsoleBackendService,
    private cdr: ChangeDetectorRef,
    private toolsApi: ToolsBackendService,
    private nunjucks: NunjucksService,
  ) {}
  private autoSent = false;
  ngOnInit(): void {
    // Charger la liste des tools (nom/label/template)
    try {
      this.toolsApi.list({ limit: 1000 }).subscribe({
        next: (list: ToolMeta[]) => {
          const dict: Record<string, ToolMeta> = {};
          (list || []).forEach(t => { if (t?.name) dict[String(t.name)] = t; });
          this.toolsDict = dict;
          try { console.log('[spotlight-creation] tools loaded', { count: Object.keys(this.toolsDict).length }); } catch {}
          this.applyToolLabels();
        },
        error: () => {}
      });
    } catch {}
  }
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
    let lastKind: 'log'|'text'|null = null;
    const appendText = (t: string) => {
      if (!t) return;
      const last = assistantParts[assistantParts.length - 1];
      if (last && last.kind === 'text') last.text = (last.text || '') + t; else assistantParts.push({ kind:'text', text: t });
    };
    const appendLog = (line: string) => {
      if (!line) return;
      // Insert a blank line between text -> log
      try {
        if (lastKind === 'text') {
          const last = assistantParts[assistantParts.length - 1];
          const lastTxt: string = (last && last.kind === 'text') ? (last.text || '') : '';
          if (lastTxt && !lastTxt.endsWith('\n')) appendText('\n');
        }
      } catch {}
      assistantParts.push({ kind: 'log', text: line } as any);
      lastKind = 'log';
    };
    const compactArgs = (obj: any, funcId?: string): string => {
      try {
        if (!obj || typeof obj !== 'object') return '';
        const kv: string[] = [];
        const keys = Object.keys(obj);
        for (const k of keys) {
          if (/^prompt$/i.test(k)) { kv.push('prompt=…'); continue; }
          const v = (obj as any)[k];
          let s = '';
          if (typeof v === 'string') s = v.length > 20 ? v.slice(0, 20) + '…' : v;
          else if (typeof v === 'number' || typeof v === 'boolean') s = String(v);
          else if (v && typeof v === 'object') s = '{…}';
          else s = '';
          kv.push(`${k}=${s}`);
        }
        let line = kv.join(', ');
        if (line.length > 90) line = line.slice(0, 90) + '…';
        return line;
      } catch { return ''; }
    };
    const renderArgsHtml = (log: { function?: string; args?: any; running?: boolean; arg_running?: boolean }): string => {
      const fn = String(log.function || '');
      const tool = (this.toolsDict && fn) ? (this.toolsDict[fn] || { name: fn }) : ({ name: fn } as ToolMeta);
      const tpl = tool?.template || this.defaultTpl;
      const ctx = { functionName: fn, tool, args: log.args || {}, arg_running: !!log.arg_running, running: !!log.running };
      return this.nunjucks.renderString(tpl, ctx);
    };
    const friendlyName = (func: string): string => {
      // Défensif: retirer un éventuel préfixe 'nodeargs.' ou 'args.'
      const base = String(func || '').replace(/^nodeargs\./, '').replace(/^args\./, '');
      const t = this.toolsDict?.[base];
      if (t?.label) return t.label;
      if (t?.name) return t.name;
      const s = base.replace(/[_-]+/g, ' ').trim();
      return s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Tool';
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
          const text = String(ev.text || '');
          // Messages du sous-agent: garder en "log" indenté, ne pas créer de TOOL synthétique
          if ((ev as any).agent === 'nodeargs') {
            assistantParts.push({ kind: 'log', text, tag: 'ARGS', indent: 1 } as any);
            const tmp: Msg = { id:`a-prev`, role:'assistant', parts: assistantParts.slice(), createdAt: Date.now(), pending: true } as any;
            const others = this.messages.filter(x => !x.pending);
            this.messages = [...others, tmp];
            try { this.cdr.detectChanges(); } catch {}
            return;
          }
          // Split incoming text by lines; convert [tool] lines as logs, others grouped as text
          const lines = text.split(/\r?\n/);
          let buffer = '';
          const flushBuffer = () => {
            if (!buffer) return;
            // When switching from log -> text, insert a single newline first
            if (lastKind === 'log') {
              const last = assistantParts[assistantParts.length - 1];
              const lastTxt: string = (last && last.kind === 'text') ? (last.text || '') : '';
              const needsBreak = lastTxt && !lastTxt.endsWith('\n');
              if (needsBreak) appendText('\n');
            }
            appendText(buffer);
            buffer = '';
            lastKind = 'text';
          };
          for (const raw of lines) {
            const ln = String(raw || '');
            // Track backend markers silently
            if (/^\[ai-create-node\]\[sse\] done/i.test(ln)) { sawSseDoneMsg = true; continue; }
            if (/^\[ai-create-node\]\[sse\] finished/i.test(ln)) { sawSseFinishedMsg = true; continue; }
            // Tool logs inside message
            if (/^\[tool\]/i.test(ln)) {
              // Désormais on rend les outils via events dédiés; ignorer ces logs bruts
              // (on ne les affiche plus pour éviter les doublons et les statuts bloqués)
              continue;
            }
            // Regular text line: accumulate, preserving line breaks
            buffer += (buffer ? '\n' : '') + ln;
          }
          flushBuffer();
          const tmp: Msg = { id:`a-prev`, role:'assistant', parts: assistantParts.slice(), createdAt: Date.now(), pending: true } as any;
          const others = this.messages.filter(x => !x.pending);
          this.messages = [...others, tmp];
          try { this.cdr.detectChanges(); } catch {}
        }
        if (ev.type === 'tool.start') {
          try {
            const funcRaw = String(ev.name || '');
            const funcBase = funcRaw.replace(/^nodeargs\./, '').replace(/^args\./, '');
            const name = friendlyName(funcBase);
            const compact = compactArgs((ev as any).args || {}, funcBase);
            const html = renderArgsHtml({ function: funcBase, args: (ev as any).args || {}, running: true, arg_running: true });
            const path = Array.isArray((ev as any).agentPath) ? (ev as any).agentPath : [];
            const indent = path.length > 0 ? path.length : ((ev as any).agent === 'nodeargs' ? 1 : 0);
            const tag = path.includes('nodeargs') || (ev as any).agent === 'nodeargs' ? 'ARGS' : undefined;
            assistantParts.push({ kind: 'tool', funcId: funcBase, name, status: 'running', text: compact, tooltip: html, tag, indent } as any);
            const tmp: Msg = { id:`a-prev`, role:'assistant', parts: assistantParts.slice(), createdAt: Date.now(), pending: true } as any;
            const others = this.messages.filter(x => !x.pending);
            this.messages = [...others, tmp];
            this.cdr.detectChanges();
          } catch {}
        }
        if ((ev.type === 'args' || ev.type === 'args.partial') && (ev as any).args) {
          try {
            const last = assistantParts[assistantParts.length - 1];
            const funcRaw = String((last as any)?.funcId || (ev as any).name || '');
            const funcBase = funcRaw.replace(/^nodeargs\./, '').replace(/^args\./, '');
            const compact = compactArgs((ev as any).args || {}, funcBase);
            const name = friendlyName(funcBase);
            const html = renderArgsHtml({ function: funcBase, args: (ev as any).args || {}, running: ev.type !== 'args', arg_running: ev.type !== 'args' });
            const path = Array.isArray((ev as any).agentPath) ? (ev as any).agentPath : [];
            const indent = path.length > 0 ? path.length : ((ev as any).agent === 'nodeargs' ? 1 : 0);
            const tag = path.includes('nodeargs') || (ev as any).agent === 'nodeargs' ? 'ARGS' : ((last as any)?.tag);
            if (last && last.kind === 'tool') { last.text = compact; last.tooltip = html; last.name = name; last.funcId = funcBase; if (tag) last.tag = tag; }
            else assistantParts.push({ kind: 'tool', funcId: funcBase, name, text: compact, tooltip: html, tag, indent } as any);
            const tmp: Msg = { id:`a-prev`, role:'assistant', parts: assistantParts.slice(), createdAt: Date.now(), pending: true } as any;
            const others = this.messages.filter(x => !x.pending);
            this.messages = [...others, tmp];
            this.cdr.detectChanges();
          } catch {}
        }
        if (ev.type === 'tool.end') {
          try {
            // Marquer le dernier outil en cours comme success (même si des logs ont été ajoutés entre-temps)
            for (let i = assistantParts.length - 1; i >= 0; i--) {
              const p = assistantParts[i];
              if (p && p.kind === 'tool' && (!p.status || p.status === 'running')) { p.status = 'success'; break; }
            }
            // Fin de session du sous-agent ARGS => l'outil parent 'Assistant paramétrage' passe en success
            const funcEnd = String((ev as any).name || '').replace(/^nodeargs\./, '').replace(/^args\./, '');
            if ((ev as any).agent === 'nodeargs' && funcEnd === 'assistant_args') {
              for (let i = assistantParts.length - 1; i >= 0; i--) {
                const p = assistantParts[i];
                if (p && p.kind==='tool' && p.tag==='ARGS' && p.name==='Assistant paramétrage' && p.status==='running') { p.status = 'success'; break; }
              }
            }
          } catch {}
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

  private applyToolLabels(){
    try {
      this.messages = (this.messages || []).map(m => {
        if (!Array.isArray((m as any).parts)) return m;
        (m as any).parts = (m as any).parts.map((p: any) => {
          if (p && p.kind === 'tool') {
            const func = String(p.funcId || p.name || '');
            const t = this.toolsDict?.[func];
            if (t?.label) p.name = t.label; else if (t?.name) p.name = t.name;
          }
          return p;
        });
        return m;
      });
      this.cdr.detectChanges();
    } catch {}
  }
}
