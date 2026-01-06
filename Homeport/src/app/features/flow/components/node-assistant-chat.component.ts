import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ChangeDetectorRef, ViewChild, ElementRef, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { ChatRendererComponent } from '../../../shared/chat/chat-renderer.component';
import { ToolsBackendService, ToolMeta } from '../../../services/tools-backend.service';
import { NunjucksService } from '../../../shared/nunjucks.service';
import { DomSanitizer } from '@angular/platform-browser';
import { AiConsoleBackendService, AiChatMessage, AiChatThread } from '../../../services/ai-console-backend.service';
import { AiWorkflowAgentV2Service, WorkflowAgentV2Event } from '../../../services/ai-workflow-agent-v2.service';
import { AiArgsAgentService, ArgsAgentEvent } from '../../../services/ai-args-agent.service';

type Msg = AiChatMessage & { pending?: boolean; localUndo?: { kind: 'args'|'desc' } };

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
      <button class="btn icon" (click)="toggleHistory(); $event.stopPropagation()" [attr.aria-expanded]="showHistory" title="Historique des arguments (AI)"><i class="fa-solid fa-clock-rotate-left"></i></button>
      <button class="btn icon" (click)="resetThread()" [disabled]="!threadId" title="Réinitialiser"><i class="fa-solid fa-rotate"></i></button>
    </div>
    <div class="args-history" *ngIf="showHistory">
      <div class="args-hdr">Historique des arguments (AI)</div>
      <div class="args-list">
        <div class="args-item" *ngFor="let it of (aiArgsHistory || []); let i = index">
          <div class="meta"><span class="mono">{{ it.ts | date:'short' }}</span> · {{ (it.next && (Object.keys(it.next)||[]).length) || 0 }} clés</div>
          <div class="actions">
            <button class="btn small" (click)="onRestoreFromHistory(it)"><i class="fa-solid fa-rotate-left"></i> Restaurer</button>
          </div>
        </div>
        <div class="empty" *ngIf="!aiArgsHistory || aiArgsHistory.length===0">Aucun élément</div>
      </div>
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
        <div class="actions-row" *ngIf="m.localUndo as undo">
          <button class="btn small link" (click)="onUndo(undo.kind)"><i class="fa-solid fa-rotate-left"></i> Retour</button>
        </div>
      </div>
    </div>
    <div class="args-proposal" *ngIf="argsProposal">
      <div class="desc">Proposition d'arguments <span class="mono">({{ (argsProposal && (Object.keys(argsProposal)||[])).length || 0 }} clés)</span></div>
      <div class="actions">
        <button class="btn small" (click)="emitApplyArgs()"><i class="fa-solid fa-check"></i> Appliquer</button>
        <button class="btn small ghost" (click)="clearArgsProposal()"><i class="fa-solid fa-xmark"></i> Ignorer</button>
      </div>
    </div>
    <div class="args-proposal" *ngIf="descProposal">
      <div class="desc">Proposition de description:</div>
      <div class="preview clamp">{{ descProposal }}</div>
      <div class="actions">
        <button class="btn small" (click)="emitApplyDesc()"><i class="fa-solid fa-check"></i> Appliquer</button>
        <button class="btn small ghost" (click)="clearDescProposal()"><i class="fa-solid fa-xmark"></i> Ignorer</button>
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
    .args-history { border-bottom:1px solid #f0f0f0; background:#fff; padding: 6px 10px 8px; }
    .args-history .args-hdr { font-weight:600; font-size:12px; margin-bottom:6px; }
    .args-history .args-list { display:flex; flex-direction:column; gap:6px; }
    .args-history .args-item { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:6px 0; border-bottom:1px dashed #eee; }
    .args-history .args-item:last-child { border-bottom:0; }
    .args-history .meta { font-size:12px; color:#374151; }
    .args-history .empty { font-size:12px; color:#6b7280; padding: 6px 0; }
    .messages { overflow:auto; min-height:0; padding: 14px 14px; display:flex; flex-direction:column; gap:10px; background:#f8fafc; scrollbar-gutter: stable; flex: 1 1 auto; }
    .msg-row { display:grid; grid-template-columns: 1fr; gap:6px; }
    .bubble { max-width: 86%; min-width: 0; padding: 10px 12px; border-radius: 16px; border: 1px solid #e5e7eb; background:#fff; line-height: 1.35; font-size: 14px; overflow: auto; }
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
    .args-proposal { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:8px 10px; border-top:1px solid #e5e7eb; background:#fffbe6; color:#111; }
    .args-proposal .desc { font-size: 12px; }
    .args-proposal .preview { font-size: 12px; color:#374151; max-width: 100%; }
    .clamp { display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient: vertical; overflow:hidden; text-overflow: ellipsis; }
    .args-proposal .actions { display:flex; gap:8px; }
    .btn.small { appearance:none; border:1px solid #e5e7eb; background:#fff; color:#111; padding:6px 10px; border-radius:10px; cursor:pointer; font-size:12px; font-weight:600; }
    .btn.small.ghost { background:#fafafa; }
    .btn.small.link { background:transparent; border-color:transparent; color:#2563eb; padding: 0 6px; }
    .actions-row { display:flex; gap:8px; justify-content:flex-end; margin-top: -2px; }
    :host ::ng-deep .txt.rich .text p { margin: 0 !important; }
  `]
})
export class NodeAssistantChatComponent implements OnInit {
  @Input() flowId: string | null = null;
  @Input() nodeId: string | null = null;
  @Input() nodeName: string | null = null;
  @Input() threadId: string | null = null;
  @Input() branch: string | null = null;
  @Input() aiArgsHistory: any[] | null = null;
  @Output() threadLinked = new EventEmitter<{ threadId: string; type: string }>();
  @Output() argsProposed = new EventEmitter<any>();
  @Output() applyArgs = new EventEmitter<any>();
  @Output() applyDesc = new EventEmitter<string>();
  @Output() undoArgsRequested = new EventEmitter<void>();
  @Output() undoDescRequested = new EventEmitter<void>();
  @Output() restoreFromHistory = new EventEmitter<any>();

  messages: Msg[] = [];
  prompt = '';
  @ViewChild('promptEl') promptEl?: ElementRef<HTMLTextAreaElement>;
  argsProposal: any = null;
  descProposal: string | null = null;
  showHistory = false;
  // Expose global Object in template for Object.keys usage
  Object = Object;
  // Tools registry for rendering
  private toolsDict: Record<string, ToolMeta> = {};
  defaultTpl = '<h4>{{ tool.name or functionName }}</h4><ul>{% for k, v in args %}<li><b>{{ k }}</b>: <pre>{{ v | json }}</pre></li>{% endfor %}</ul>{% if arg_running %}<em>Arguments en cours...</em>{% endif %}';

  constructor(private api: AiConsoleBackendService, private agentV2: AiWorkflowAgentV2Service, private argsAgent: AiArgsAgentService, private cdr: ChangeDetectorRef, private toolsApi: ToolsBackendService, private nunjucks: NunjucksService, private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    // 1) Charger la liste des tools (nom/logo/template)
    try {
      this.toolsApi.list({ limit: 1000 }).subscribe({
        next: (list: ToolMeta[]) => {
          const dict: Record<string, ToolMeta> = {};
          (list || []).forEach(t => { if (t?.name) dict[String(t.name)] = t; });
          this.toolsDict = dict;
          try { console.log('[node-assistant] tools loaded', { count: Object.keys(this.toolsDict).length, names: Object.keys(this.toolsDict) }); } catch {}
          // Mettre à jour les labels déjà affichés si le flux est démarré
          this.applyToolLabels();
        },
        error: () => {}
      });
    } catch {}
    // 2) Assurer le thread lié au nœud
    this.ensureThread();
  }

  private renderArgsHtml(log: { function?: string; args?: any; running?: boolean; arg_running?: boolean }): string {
    const fn = String(log.function || '');
    const tool = (this.toolsDict && fn) ? (this.toolsDict[fn] || { name: fn }) : ({ name: fn } as ToolMeta);
    const tpl = tool?.template || this.defaultTpl;
    const ctx = { functionName: fn, tool, args: log.args || {}, arg_running: !!log.arg_running, running: !!log.running };
    return this.nunjucks.renderString(tpl, ctx);
  }

  private friendlyName(func: string): string {
    const t = this.toolsDict?.[func];
    if (t?.label) { try { console.log('[node-assistant] label', func, '=>', t.label); } catch {} return t.label; }
    if (t?.name) { try { console.log('[node-assistant] name fallback', func, '=>', t.name); } catch {} return t.name; }
    // fallback: prettify id (e.g., get_scenarios -> Get scenarios)
    const s = (func || '').replace(/[_-]+/g, ' ').trim();
    const pretty = s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Tool';
    try { console.log('[node-assistant] prettified id', func, '=>', pretty); } catch {}
    return pretty;
  }

  private applyToolLabels(){
    try {
      this.messages = (this.messages || []).map(m => {
        if (!Array.isArray((m as any).parts)) return m;
        (m as any).parts = (m as any).parts.map((p: any) => {
          if (p && p.kind === 'tool') {
            if (p.funcId) p.name = this.friendlyName(p.funcId);
            else if (p.name && this.toolsDict && this.toolsDict[p.name]) p.name = this.friendlyName(p.name);
          }
          return p;
        });
        return m;
      });
      this.cdr.detectChanges();
    } catch {}
  }

  toggleHistory() { this.showHistory = !this.showHistory; }
  onRestoreFromHistory(item: any) { if (item) this.restoreFromHistory.emit(item); }


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
    this.api.listMessages(tid).subscribe({
      next: (list) => { this.messages = (list || []); try { this.cdr.detectChanges(); } catch {} },
      error: () => {
        // If the thread was deleted on the backend, recreate a new one and continue silently
        try {
          const fid = this.flowId || null; const nid = this.nodeId || null; if (!fid || !nid) return;
          this.threadId = null;
          this.ensureThread();
        } catch {}
      }
    });
  }

  resetThread() {
    const tid = this.threadId; if (!tid) return;
    this.api.deleteMessages(tid).subscribe(() => { this.messages = []; try { this.cdr.detectChanges(); } catch {} });
  }

  onEnter(ev: any) { if ((ev as KeyboardEvent).shiftKey) return; ev.preventDefault(); this.send(); }
  autoGrow() {
    try { const el = this.promptEl?.nativeElement; if (!el) return; el.style.height = '0px'; el.style.height = Math.min(el.scrollHeight, 160) + 'px'; } catch {}
  }
  clearArgsProposal(){ this.argsProposal = null; try { this.cdr.detectChanges(); } catch {} }
  emitApplyArgs(){
    if (!this.argsProposal) return;
    const v = this.argsProposal;
    this.argsProposal = null;
    try { this.cdr.detectChanges(); } catch {}
    // Append chat message locally and persist
    const tid = this.threadId || '';
    const msg: Msg = { id: `${tid}-${Date.now().toString(36)}-apply-args`, threadId: tid, role: 'user', text: 'Arguments: proposition appliquée.', createdAt: Date.now() } as any;
    (msg as any).localUndo = { kind: 'args' };
    this.messages = [...this.messages, msg];
    try { this.cdr.detectChanges(); } catch {}
    try { if (tid) this.api.appendMessage(tid, { threadId: tid, role: 'user', text: msg.text } as any).subscribe(()=>{}); } catch {}
    this.applyArgs.emit(v);
  }
  clearDescProposal(){ this.descProposal = null; try { this.cdr.detectChanges(); } catch {} }
  private normalizeDesc(input: any): string {
    try {
      if (typeof input === 'string') return input;
      if (input && typeof input === 'object') {
        const v = (input as any).description ?? (input as any).text;
        return typeof v === 'string' ? v : JSON.stringify(input);
      }
      return '';
    } catch { return ''; }
  }
  emitApplyDesc(){
    if (!this.descProposal) return;
    const t = this.normalizeDesc(this.descProposal);
    this.descProposal = null;
    try { this.cdr.detectChanges(); } catch {}
    // Append chat message locally and persist
    const tid = this.threadId || '';
    const msg: Msg = { id: `${tid}-${Date.now().toString(36)}-apply-desc`, threadId: tid, role: 'user', text: 'Description: proposition appliquée.', createdAt: Date.now() } as any;
    (msg as any).localUndo = { kind: 'desc' };
    this.messages = [...this.messages, msg];
    try { this.cdr.detectChanges(); } catch {}
    try { if (tid) this.api.appendMessage(tid, { threadId: tid, role: 'user', text: msg.text } as any).subscribe(()=>{}); } catch {}
    this.applyDesc.emit(t);
  }
  private compactArgs(obj: any, funcId?: string): string {
    try {
      if (!obj || typeof obj !== 'object') return '';
      // Stratégie: clef=valeur courts, exclure prompt et gros champs, max ~90 chars
      const kv: string[] = [];
      const keys = Object.keys(obj);
      for (const k of keys) {
        if (/^prompt$/i.test(k)) { kv.push('prompt=…'); continue; }
        const v = obj[k];
        let s = '';
        if (typeof v === 'string') s = v.length > 20 ? v.slice(0, 20) + '…' : v;
        else if (typeof v === 'number' || typeof v === 'boolean') s = String(v);
        else if (v && typeof v === 'object') s = '{…}';
        else s = '';
        kv.push(`${k}=${s}`);
      }
      let line = kv.join(', ');
      if (line.length > 90) line = line.slice(0, 90) + '…';
      // Ajout du nombre de clés pour set_node_args
      if (funcId === 'set_node_args') line += ` (${keys.length} clés)`;
      return line;
    } catch { return ''; }
  }
  private pretty(obj: any): string { try { return JSON.stringify(obj, null, 2); } catch { return String(obj); } }
  onUndo(kind: string){
    const tid = this.threadId || '';
    const text = kind === 'args' ? 'Chargement annulé (arguments).' : 'Chargement annulé (description).';
    const msg: Msg = { id: `${tid}-${Date.now().toString(36)}-undo-${kind}`, threadId: tid, role: 'user', text, createdAt: Date.now() } as any;
    this.messages = [...this.messages, msg];
    try { this.cdr.detectChanges(); } catch {}
    try { if (tid) this.api.appendMessage(tid, { threadId: tid, role: 'user', text } as any).subscribe(()=>{}); } catch {}
    if (kind === 'args') this.undoArgsRequested.emit(); else this.undoDescRequested.emit();
  }
  send() {
    const tid = this.threadId; const txt = (this.prompt || '').trim(); if (!tid || !txt) return;
    const now = Date.now();
    const m: Msg = { id: `${tid}-${now.toString(36)}`, threadId: tid, role: 'user', text: txt, createdAt: now, pending: false } as any;
    this.messages = [...this.messages, m];
    this.prompt = '';
    try { this.cdr.detectChanges(); } catch {}
    this.api.appendMessage(tid, { threadId: tid, role: 'user', text: txt } as any).subscribe(() => {
      // Use dedicated Args Agent instead of workflow v2 for node assistant
      const stream = (this as any).argsAgent?.stream({ flowId: this.flowId as string, nodeId: this.nodeId as string, threadId: this.threadId as string, branch: this.branch as any }) || this.agentV2.stream({ flowId: this.flowId || undefined, action: undefined, threadId: this.threadId || undefined });
      let assistantParts: any[] = [];
      let lastKind: 'log'|'text'|null = null;
      const mergeText = (base: string, add: string) => (base || '') + (add || '');
      const appendText = (chunk: string) => {
        const t = String(chunk || ''); if (!t) return;
        // If previous was a log, ensure a single newline between log and text
        if (lastKind === 'log') {
          const last = assistantParts[assistantParts.length - 1];
          const lastTxt: string = (last && last.kind === 'text') ? (last.text || '') : '';
          if (lastTxt && !lastTxt.endsWith('\n')) {
            if (assistantParts.length && assistantParts[assistantParts.length - 1].kind === 'text') assistantParts[assistantParts.length - 1].text += '\n';
            else assistantParts.push({ kind: 'text', text: '\n' });
          }
        }
        const last = assistantParts[assistantParts.length - 1];
        if (last && last.kind === 'text') last.text = mergeText(last.text || '', t);
        else assistantParts.push({ kind: 'text', text: mergeText('', t) });
        lastKind = 'text';
      };
      const appendLog = (line: string) => {
        const l = String(line || '').trim(); if (!l) return;
        // If previous was text, ensure a single newline between text and log
        if (lastKind === 'text') {
          const last = assistantParts[assistantParts.length - 1];
          const lastTxt: string = (last && last.kind === 'text') ? (last.text || '') : '';
          if (lastTxt && !lastTxt.endsWith('\n')) appendText('\n');
        }
        assistantParts.push({ kind: 'log', text: l });
        lastKind = 'log';
      };
      const sub = stream.events$.subscribe({
        next: (ev: any) => {
          if (!ev) return;
          if (ev.type === 'message' && ev.text) {
            const raw = String(ev.text || '');
            const lines = raw.split(/\r?\n/);
            let buffer = '';
            const flush = () => { if (buffer) { appendText(buffer); buffer=''; } };
            for (const seg of lines) {
              if (seg === undefined || seg === null) continue;
              const s = String(seg || '');
              if (/^\[tool\]/i.test(s)) { flush(); appendLog(s); }
              else { buffer += (buffer ? '\n' : '') + s; }
            }
            flush();
            if (assistantParts.length) {
              const tmp: Msg = { id: `${tid}-assistant-preview`, threadId: tid, role: 'assistant', parts: assistantParts.slice(), createdAt: Date.now(), pending: true } as any;
              const others = this.messages.filter(x => !x.pending);
              this.messages = [...others, tmp];
              try { this.cdr.detectChanges(); } catch {}
            }
          }
          if (ev.type === 'tool.start') {
            try {
              const func = String(ev.name || '');
              const name = this.friendlyName(func);
              const compact = this.compactArgs(ev.args || {}, func);
              // Tooltip HTML via Nunjucks (template ou défaut)
              const html = this.renderArgsHtml({ function: func, args: ev.args || {}, running: true, arg_running: true });
              assistantParts.push({ kind: 'tool', funcId: func, name, status: 'running', text: compact, tooltip: html } as any);
              const tmp: Msg = { id: `${tid}-assistant-preview`, threadId: tid, role: 'assistant', parts: assistantParts.slice(), createdAt: Date.now(), pending: true } as any;
              const others = this.messages.filter(x => !x.pending);
              this.messages = [...others, tmp];
              this.cdr.detectChanges();
            } catch {}
          }
          if (ev.type === 'tool.end') {
            try {
              const last = assistantParts[assistantParts.length - 1];
              if (last && last.kind === 'tool') last.status = 'success';
              const tmp: Msg = { id: `${tid}-assistant-preview`, threadId: tid, role: 'assistant', parts: assistantParts.slice(), createdAt: Date.now(), pending: true } as any;
              const others = this.messages.filter(x => !x.pending);
              this.messages = [...others, tmp];
              this.cdr.detectChanges();
            } catch {}
          }
          if ((ev.type === 'args' || ev.type === 'args.partial') && ev.args) {
            try {
              this.argsProposal = ev.args;
              this.argsProposed.emit(ev.args);
              const last = assistantParts[assistantParts.length - 1];
              const func = String((last as any)?.funcId || ev.name || '');
              const compact = this.compactArgs(ev.args || {}, func);
              const name = this.friendlyName(func);
              const html = this.renderArgsHtml({ function: func, args: ev.args || {}, running: ev.type !== 'args', arg_running: ev.type !== 'args' });
              if (last && last.kind === 'tool') { last.text = compact; last.tooltip = html; last.name = name; last.funcId = func; }
              else assistantParts.push({ kind: 'tool', funcId: func, name, text: compact, tooltip: html } as any);
              this.cdr.detectChanges();
            } catch {}
          }
          if (ev.type === 'desc') {
            try { this.descProposal = this.normalizeDesc((ev as any).text); this.cdr.detectChanges(); } catch {}
          }
          if (ev.type === 'error') { try { const last = assistantParts[assistantParts.length - 1]; if (last && last.kind==='tool') last.status = 'error'; } catch {} }
          if (ev.type === 'done' || ev.type === 'error') {
            const parts = assistantParts.slice();
            assistantParts = [];
            if (parts.length) {
              const others = this.messages.filter(x => !x.pending);
              this.messages = [...others, { id: `${tid}-${Date.now().toString(36)}`, threadId: tid, role: 'assistant', parts, createdAt: Date.now() } as any];
              try { this.cdr.detectChanges(); } catch {}
              this.api.appendMessage(tid, { threadId: tid, role: 'assistant', parts } as any).subscribe(() => {});
            }
          }
        },
        error: () => { try { sub.unsubscribe(); } catch {} },
        complete: () => { try { sub.unsubscribe(); } catch {} }
      });
    });
  }
}
