import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, ChangeDetectorRef, ViewChild, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { ChatRendererComponent } from '../../../shared/chat/chat-renderer.component';
import { AiConsoleBackendService, AiChatThread, AiChatMessage, AiContext } from '../../../services/ai-console-backend.service';
import { AiWorkflowAgentV2Service, WorkflowAgentV2Event } from '../../../services/ai-workflow-agent-v2.service';

type Msg = AiChatMessage & { pending?: boolean };

@Component({
  selector: 'ai-console-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzIconModule, ChatRendererComponent, NzDrawerModule],
  template: `
  <div class="console-chat">
    <!-- Threads/Context panel (desktop) -->
    <div class="pane threads desktop-only">
      <ng-container *ngTemplateOutlet="threadsPanel"></ng-container>
    </div>

    <!-- Center chat panel -->
    <div class="pane dialog">
      <!-- Top toolbar (mobile + desktop) -->
      <div class="toolbar">
        <button class="btn icon ghost" (click)="leftDrawerVisible=true" title="Chats"><i class="fa-regular fa-comments"></i></button>
        <div class="spacer"></div>
        <button class="btn icon ghost" (click)="openViewer.emit()" title="Flow"><i class="fa-regular fa-diagram-project"></i></button>
        <button class="btn icon primary" (click)="save.emit()" [disabled]="!flowId" title="Sauvegarder"><i class="fa-regular fa-floppy-disk"></i></button>
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

    <!-- Shared panel template -->
    <ng-template #threadsPanel>
      <div class="hdr">
        <div class="t">Chats</div>
        <div class="spacer"></div>
        <button class="btn icon" (click)="createThread()" title="Ajouter un chat"><i class="fa-solid fa-plus"></i></button>
      </div>
      <div class="list" *ngIf="threads?.length; else emptyThreads">
        <button class="item" *ngFor="let t of threads" [class.active]="t.id===threadId" (click)="selectThread(t)">
          <div class="name mono" [title]="t.title">{{ t.title }}</div>
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
          <button class="btn" (click)="saveCtx()"><i class="fa-regular fa-floppy-disk"></i> Sauver</button>
          <button class="btn danger" (click)="clearCtx()"><i class="fa-regular fa-trash-can"></i> Effacer</button>
        </div>
      </div>
    </ng-template>
  </div>

  <!-- Mobile left drawer for threads/context (outside layout to avoid taking space) -->
  <nz-drawer *ngIf="isMobile" [nzVisible]="leftDrawerVisible" nzPlacement="left" [nzWidth]="'86%'" [nzClosable]="true" nzTitle="Chats & Contexte" [nzBodyStyle]="{padding:'8px'}" (nzOnClose)="leftDrawerVisible=false">
    <ng-container *nzDrawerContent>
      <div class="drawer-threads">
        <ng-container *ngTemplateOutlet="threadsPanel"></ng-container>
      </div>
    </ng-container>
  </nz-drawer>
  `,
  styles: [`
    :host { display:block; height:100%; }
    .console-chat { position: relative; display:flex; flex-direction: row; gap: 0; height: 100%; min-height:0; }
    .pane { min-height:0; }
    .pane.threads { background:#fff; display:flex; flex-direction:column; padding-top:0; overflow:hidden; flex: 0 0 260px; }
    .pane.threads.desktop-only { margin-top:63px; }
    .hdr { display:flex; align-items:center; gap:8px; padding:8px 10px; border-bottom:1px solid #f0f0f0; position:sticky; top:0; background:#fff; z-index:1; }
    .hdr .t { font-weight:600; }
    .hdr .spacer { margin-left:auto; }
    .btn { appearance:none; border:0; background:#f3f4f6; color:#111; padding:8px 10px; border-radius:12px; cursor:pointer; font-weight:600; font-size:12px; display:inline-flex; align-items:center; gap:8px; }
    .btn:hover { background:#e5e7eb; }
    .btn.primary { background:#1677ff; color:#fff; }
    .btn.primary:hover { filter:brightness(.95); }
    .btn.ghost { background:#fff; border:1px solid #e5e7eb; }
    .btn.danger { background:#fee2e2; color:#b91c1c; }
    .mobile-only { display:none; }
    .desktop-only { display:block; }
    .list { display:flex; flex-direction:column; gap:6px; padding: 0 10px 8px; overflow:auto; flex:1 1 auto; min-height:0; }
    .item { position: relative; text-align:left; background:#fff; border:1px solid transparent; border-radius:10px; padding:8px; cursor:pointer; }
    .item.active { border-color:#1677ff; box-shadow: 0 0 0 2px rgba(22,119,255,0.12); }
    .item .name { font-size:12px; color:#111; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display:block; padding-right: 24px; }
    .item .sub { font-size:11px; color:#8c8c8c; }
    .item .del { position:absolute; right:6px; top:6px; background:transparent; border:0; color:#8c8c8c; cursor:pointer; }
    .empty { color:#8c8c8c; font-size:12px; padding: 0 10px 10px; }
    .ctx { margin-top:auto; border-top:1px solid #f0f0f0; padding:10px; display:flex; flex-direction:column; gap:6px; }
    .ctx-hdr { font-weight:600; font-size:12px; color:#444; }
    .ctx textarea { width:100%; border:1px solid #e5e7eb; border-radius:10px; padding:8px; resize:vertical; min-height:72px; }
    .ctx .row { display:flex; gap:6px; }
    .mono { font-family: ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace; }
    .drawer-threads { display:flex; flex-direction:column; min-height:100%; }
    .pane.dialog { background:#fff; display:flex; flex-direction: column; min-height:0; flex: 1 1 auto; }
    .toolbar { position:relative; top:auto; z-index:1; display:flex; align-items:center; gap:8px; padding:8px 10px; background:#fff; }
    .toolbar .spacer { margin-left:auto; }
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
    .btn.icon { width:36px; height:36px; padding:0; justify-content:center; }
    @media (max-width: 1024px) { 
      .console-chat { flex-direction: column; }
      .mobile-only { display:flex; }
      .desktop-only { display:block; }
      .pane.threads { display:none; }
      .pane.dialog { padding-top: 63px; }
      .bubble { max-width: 92%; }
      .composer { grid-template-columns: 1fr; }
      .send { width:100%; justify-content:center; }
    }
  `]
})
export class AiConsoleChatComponent implements OnInit, OnDestroy {
  @Input() flowId: string | null = null;
  @Output() snapshot = new EventEmitter<any>();
  @Output() openThread = new EventEmitter<AiChatThread>();
  @Output() save = new EventEmitter<void>();
  @Output() openViewer = new EventEmitter<void>();
  threads: AiChatThread[] = [];
  threadId: string | null = null;
  ctxText = '';
  messages: Msg[] = [];
  prompt = '';
  @ViewChild('promptEl') promptEl?: ElementRef<HTMLTextAreaElement>;
  isMobile = false;
  leftDrawerVisible = false;
  private mql?: MediaQueryList;
  private onMqlChange?: () => void;

  constructor(private api: AiConsoleBackendService, private agentV2: AiWorkflowAgentV2Service, private cdr: ChangeDetectorRef) {}

  ngOnInit() { 
    this.refresh(); 
    try {
      this.mql = window.matchMedia('(max-width: 1024px)');
      this.onMqlChange = () => { this.isMobile = !!this.mql?.matches; try { this.cdr.detectChanges(); } catch {} };
      this.mql.addEventListener ? this.mql.addEventListener('change', this.onMqlChange) : (this.mql as any).addListener?.(this.onMqlChange);
      this.onMqlChange();
    } catch {}
  }
  ngOnDestroy() {
    try { if (this.mql && this.onMqlChange) { this.mql.removeEventListener ? this.mql.removeEventListener('change', this.onMqlChange) : (this.mql as any).removeListener?.(this.onMqlChange); } } catch {}
  }

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
  autoGrow() {
    try {
      const el = this.promptEl?.nativeElement; if (!el) return;
      el.style.height = '0px';
      el.style.height = Math.min(el.scrollHeight, 160) + 'px';
    } catch {}
  }
  send() {
    const tid = this.threadId; const txt = (this.prompt || '').trim(); if (!tid || !txt) return;
    const now = Date.now();
    const m: Msg = { id: `${tid}-${now.toString(36)}`, threadId: tid, role: 'user', text: txt, createdAt: now, pending: false } as any;
    this.messages = [...this.messages, m];
    this.prompt = '';
    try { this.cdr.detectChanges(); } catch {}
    // Persist user message, then start SSE to avoid racing with empty history on the backend
    this.api.appendMessage(tid, { threadId: tid, role: 'user', text: txt } as any).subscribe(() => {
      // Stream agent and persist assistant reply at the end
      // Ne pas passer le prompt en query (privacy). L'agent récupère le dernier message user depuis l'historique (threadId)
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
        try { console.log('[AiConsoleChat][event]', ev); } catch {}
        if (!ev) return;
        if (ev.type === 'message' && ev.text) {
          const raw = String(ev.text || '');
          // Rendu proche v1: insère des sauts de ligne AVANT les logs de tool, mais pas pour le texte normal
          // Concatener tel quel; si c'est un log de tool, forcer un saut de ligne avant
          const lines = raw.split(/\r?\n/);
          for (const seg of lines) {
            if (seg === undefined || seg === null) continue;
            const isTool = /^\[tool\]/i.test(seg);
            appendToLastTextPart(isTool ? ("\n" + seg) : seg);
          }
          // Aperçu progressif dans une bulle unique (pending)
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
        // Le frontend n'ajoute aucun autre message automatique; tout vient de l'agent
        if ((ev as any).type === 'snapshot' && (ev as any).graph) {
          try { this.snapshot.emit((ev as any).graph); } catch {}
        }
        if (ev.type === 'final' || ev.type === 'done') {
          // Persist assistant message once final
          const parts = assistantParts.slice();
          assistantParts = [];
          const others = this.messages.filter(x => !x.pending);
          this.messages = [...others, { id: `${tid}-${Date.now().toString(36)}`, threadId: tid, role: 'assistant', parts, createdAt: Date.now() } as any];
          try { this.cdr.detectChanges(); } catch {}
          this.api.appendMessage(tid, { threadId: tid, role: 'assistant', parts } as any).subscribe(() => {});
          // Charger le graphe final si fourni
          try {
            const anyEv: any = ev as any;
            if (anyEv && anyEv.graph) {
              this.snapshot.emit(anyEv.graph);
            }
          } catch {}
        }
      },
      error: (err) => { try { console.error('[AiConsoleChat][error]', err); sub.unsubscribe(); } catch {} },
      complete: () => { try { console.log('[AiConsoleChat] stream complete'); sub.unsubscribe(); } catch {} }
    });
    });
  }
}
