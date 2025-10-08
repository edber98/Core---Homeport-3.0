import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, ViewChild, ElementRef, ChangeDetectorRef, AfterViewInit, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { AiFlowAgentService, FlowAgentEvent } from '../../../services/ai-flow-agent.service';

type RichPart = { kind: 'text'|'tool'|'log'|'ai-form'; text?: string; tag?: string; name?: string; badge?: 'FLOW'|'AI FORM'|'TOOL'; status?: 'running'|'success'|'error'|'warn'|'info' };
type Msg = { role: 'user'|'assistant'|'system'; text?: string; parts?: RichPart[] };

@Component({
  selector: 'flow-ai-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzInputModule, NzIconModule],
  template: `
  <div class="chat-root">
    <div class="chat-header">
      <div class="title">Assistant Workflow</div>
      <button nz-button nzType="default" nzSize="small" class="close-btn" (click)="close.emit()"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <div class="chat-body" #scroller>
      <div class="bubble" *ngFor="let m of messages" [class.me]="m.role==='user'" [class.assistant]="m.role==='assistant'">
        <ng-container *ngIf="!m.parts; else richMsg">
          <div class="txt">{{ m.text }}</div>
        </ng-container>
        <ng-template #richMsg>
          <div class="txt rich">
            <div class="line" *ngFor="let p of (m.parts||[])" [class.tool]="p.kind==='tool'" [class.log]="p.kind==='log'" [class.aiform]="p.kind==='ai-form'">
              <span class="badge" *ngIf="p.kind==='tool' || p.badge==='TOOL'">TOOL</span>
              <span class="badge aiform" *ngIf="p.kind==='ai-form' || p.badge==='AI FORM'">AI FORM</span>
              <span class="badge flow" *ngIf="p.badge==='FLOW'">FLOW</span>
              <span class="st" [class.run]="p.status==='running'" [class.ok]="p.status==='success'" [class.err]="p.status==='error'" [class.warn]="p.status==='warn'" *ngIf="p.status">{{ p.status }}</span>
              <span class="name" *ngIf="p.name">{{ p.name }}</span>
              <span class="tag" *ngIf="p.tag">[{{ p.tag }}]</span>
              <span class="text">{{ p.text }}</span>
            </div>
          </div>
        </ng-template>
      </div>
      <div class="bubble assistant" *ngIf="streaming">
        <div class="txt rich">
          <div class="line" *ngFor="let p of streamingParts" [class.tool]="p.kind==='tool'" [class.log]="p.kind==='log'" [class.aiform]="p.kind==='ai-form'">
            <span class="badge" *ngIf="p.kind==='tool' || p.badge==='TOOL'">TOOL</span>
            <span class="badge aiform" *ngIf="p.kind==='ai-form' || p.badge==='AI FORM'">AI FORM</span>
            <span class="badge flow" *ngIf="p.badge==='FLOW'">FLOW</span>
            <span class="st" [class.run]="p.status==='running'" [class.ok]="p.status==='success'" [class.err]="p.status==='error'" [class.warn]="p.status==='warn'" *ngIf="p.status">{{ p.status }}</span>
            <span class="name" *ngIf="p.name">{{ p.name }}</span>
            <span class="tag" *ngIf="p.tag">[{{ p.tag }}]</span>
            <span class="text">{{ p.text }}</span>
          </div>
        </div>
      </div>
    </div>
    <div class="chat-footer">
      <div class="composer">
        <input nz-input [(ngModel)]="text" [disabled]="busy" placeholder="Décrivez le workflow (ex: Lire emails, filtrer, notifier)…" (keyup.enter)="send()"/>
        <button nz-button nzType="primary" (click)="send()" [disabled]="!text || busy">Envoyer</button>
        <button nz-button class="ml" (click)="stop()" *ngIf="busy">Stop</button>
      </div>
      <div class="seed">
        <textarea nz-input [(ngModel)]="seedText" [disabled]="busy" placeholder="Graphe seed (JSON optionnel: {nodes,edges})" rows="3"></textarea>
      </div>
      <!-- No extra panels: everything is embedded in bubbles -->
      <div class="actions" *ngIf="finalGraph">
        <button nz-button nzType="primary" (click)="loadIntoBuilder()">Charger dans l'éditeur</button>
        <button nz-button class="ml" (click)="resetFinal()">Effacer</button>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .chat-root { width: 420px; height: 520px; display:flex; flex-direction:column; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'; }
    .chat-header { display:flex; align-items:center; justify-content:space-between; padding:10px 12px; border-bottom:1px solid #eee; }
    .title { font-weight: 600; }
    .close-btn { border:none; }
    .chat-body { flex:1; overflow:auto; padding: 12px; display:flex; flex-direction:column; gap:10px; background: #f8fafc; }
    .bubble { max-width: 80%; padding: 10px 12px; border-radius: 18px; line-height: 1.25; font-size: 14px; box-shadow: 0 1px 0 rgba(0,0,0,.04); }
    .bubble.me { align-self: flex-end; background: #0a84ff; color: #fff; border-bottom-right-radius: 6px; }
    .bubble.assistant { align-self: flex-start; background: #e9ecef; color: #111827; border-bottom-left-radius: 6px; }
    .chat-footer { border-top: 1px solid #eee; padding: 10px; display:flex; flex-direction:column; gap:8px; background:#fff; }
    .composer { display:flex; gap:8px; }
    .ml { margin-left: 6px; }
    .txt.rich { white-space: pre-wrap; word-break: break-word; }
    .line { display:flex; align-items:baseline; gap:8px; padding:1px 0; }
    .badge { background:#e5e7eb; color:#111827; border-radius: 4px; padding:0 6px; font-weight:600; font-size:11px; }
    .badge.aiform { background:#fdba74; color:#7c2d12; }
    .badge.flow { background:#dbeafe; color:#1e3a8a; }
    .st { font-weight:600; text-transform:uppercase; font-size:11px; color:#374151; }
    .st.run { color:#2563eb; }
    .st.ok { color:#16a34a; }
    .st.err { color:#ef4444; }
    .st.warn { color:#d97706; }
    .tag { color:#6b7280; }
  `]
})
export class FlowAiChatComponent implements AfterViewInit {
  @Input() seedGraph: any = null;
  @Output() close = new EventEmitter<void>();
  @Output() graphGenerated = new EventEmitter<any>();

  messages: Msg[] = [];
  text = '';
  busy = false;
  streaming = false;
  streamingText = '';
  private assistantBuf = '';
  finalGraph: any = null; // only set on 'final'
  previewGraph: any = null; // set on 'snapshot' for live preview/log
  seedText = '';
  aiFormEvents: Array<{ t: string; msg?: string }> = [];
  execLogs: Array<{ kind: 'tool'|'log'; tag?: string; name?: string; status?: 'running'|'success'|'error'|'warn'|'info'; text?: string; at: number }> = [];
  streamingParts: RichPart[] = [];
  private recent = new Set<string>();

  private stopFn?: () => void;
  @ViewChild('scroller') scroller?: ElementRef<HTMLDivElement>;

  constructor(private agent: AiFlowAgentService, private cdr: ChangeDetectorRef) {}
  ngAfterViewInit(): void { this.scrollToBottom(); }

  send() {
    const t = (this.text || '').trim();
    if (!t || this.busy) return;
    this.messages.push({ role: 'user', text: t });
    this.text = '';
    this.busy = true; this.streaming = true; this.streamingText = '';
    this.assistantBuf = '';
    this.aiFormEvents = [];
    this.execLogs = [];
    this.streamingParts = [];
    try { this.recent.clear(); } catch {}
    let seedObj: any = undefined;
    try { const s = (this.seedText || '').trim(); if (s) seedObj = JSON.parse(s); } catch {}
    const stream = this.agent.stream({ prompt: t, seedGraph: seedObj || this.seedGraph });
    this.stopFn = stream.stop;
    stream.events$.subscribe({ next: (ev: FlowAgentEvent) => this.onEvent(ev), error: () => this.onError('Erreur de flux') });
  }
  stop() {
    try { this.stopFn?.(); } catch {}
    if (this.streamingParts.length) this.messages.push({ role: 'assistant', parts: [...this.streamingParts] });
    this.streamingParts = []; this.assistantBuf = '';
    this.busy = false; this.streaming = false; this.streamingText='';
  }

  private onEvent(evt: FlowAgentEvent) {
    if (!evt) return;
    if (evt.type === 'message' && evt.text) {
      const raw = String(evt.text);
      // Pré-découper les segments mixtes pour isoler tools et tags au milieu d’une même ligne
      const norm = raw
        .replace(/(>>>\s*tool\s+)/g, '\n$1')
        .replace(/(\u2713|✓)\s+/g, '\n$&')
        .replace(/(\[ai-form\])/gi, '\n$1')
        .replace(/(\[ai-flow\])/gi, '\n$1');
      const lines = norm.split(/\r?\n/);
      for (const seg of lines) {
        if (!seg) continue;
        const s = seg.trim();
        if (!s) continue;
        // Si c’est un tool/tag reconnu, on le traite comme ligne distincte
        if (this.tryParseExecLine(s)) continue;
        // Sinon on fusionne le texte brut au paragraphe courant (aucun espace ajouté)
        this.appendToLastTextPart(seg);
      }
      this.scrollToBottom();
      try { this.cdr.detectChanges(); } catch {}
      return;
    }
    if (evt.type === 'snapshot' && (evt as any).graph) { this.previewGraph = (evt as any).graph; try { console.log('[ai-flow][snapshot]', this.previewGraph); } catch {} }
    if (evt.type === 'final' && (evt as any).graph) {
      this.finalGraph = (evt as any).graph; try { console.log('[ai-flow][final]', this.finalGraph); } catch {}
      // Persist the streamed assistant text as a single bubble
      if (this.streamingParts.length) this.messages.push({ role: 'assistant', parts: [...this.streamingParts] });
      this.assistantBuf = ''; this.streamingText=''; this.busy = false; this.streaming = false; this.streamingParts = [];
    }
    if (evt.type === 'error') { this.onError(evt.message || 'Erreur'); }
    if ((evt.type as any)?.startsWith && (evt.type as any).startsWith('ai-form.')) {
      const t = String(evt.type).replace('ai-form.', '');
      if (t === 'message') {
        const txt = String((evt as any).text || '');
        if (txt && txt.length) this.appendToAiFormMsg(txt);
      } else if (t === 'error') {
        this.streamingParts.push({ kind: 'ai-form', status: 'error', text: (evt as any).message || (evt as any).code || 'error', badge: 'AI FORM' });
      } else if (t === 'tool.start') {
        const name = String((evt as any).name || 'tool');
        const args = (evt as any).args ? JSON.stringify((evt as any).args) : '';
        const key = `tool:start:${name}:${args}`;
        if (!this.recent.has(key)) { this.streamingParts.push({ kind: 'tool', name, status: 'running', text: args, badge: 'AI FORM' }); this.recent.add(key); }
      } else if (t === 'tool.end') {
        const name = String((evt as any).name || 'tool');
        const key = `tool:ok:${name}:ok`;
        if (!this.recent.has(key)) { this.streamingParts.push({ kind: 'tool', name, status: 'success', text: 'ok', badge: 'AI FORM' }); this.recent.add(key); }
      } else if (t === 'attach') {
        const key = `ai-form:attach:${(evt as any).parts ?? '-'}`;
        if (!this.recent.has(key)) { this.streamingParts.push({ kind: 'ai-form', status: 'success', text: `attach parts=${(evt as any).parts ?? '-'}`, badge: 'AI FORM' }); this.recent.add(key); }
      } else if (t === 'patch') {
        const ops = Array.isArray((evt as any).ops)?(evt as any).ops.length:0;
        const key = `ai-form:patch:${ops}`;
        if (!this.recent.has(key)) { this.streamingParts.push({ kind: 'ai-form', status: 'info', text: `patch ops=${ops}`, badge: 'AI FORM' }); this.recent.add(key); }
      } else if (t === 'snapshot') {
        const key = 'ai-form:snapshot';
        if (!this.recent.has(key)) { this.streamingParts.push({ kind: 'ai-form', status: 'info', text: 'snapshot', badge: 'AI FORM' }); this.recent.add(key); }
      } else if (t === 'start') {
        const key = 'ai-form:start';
        if (!this.recent.has(key)) { this.streamingParts.push({ kind: 'ai-form', status: 'running', text: 'start', badge: 'AI FORM' }); this.recent.add(key); }
      }
    }
      try { this.cdr.detectChanges(); } catch {}
    }
    // FLOW tool events -> lignes TOOL avec badge FLOW
    if (evt.type === 'flow.tool.start') {
      const name = String((evt as any).name || 'tool');
      const key = `flowtool:start:${name}`;
      if (!this.recent.has(key)) { this.streamingParts.push({ kind: 'tool', name, status: 'running', text: '', badge: 'FLOW' }); this.recent.add(key); }
      try { this.cdr.detectChanges(); } catch {}
      return;
    }
    if (evt.type === 'flow.tool.end') {
      const name = String((evt as any).name || 'tool');
      const key = `flowtool:ok:${name}`;
      if (!this.recent.has(key)) { this.streamingParts.push({ kind: 'tool', name, status: 'success', text: 'ok', badge: 'FLOW' }); this.recent.add(key); }
      try { this.cdr.detectChanges(); } catch {}
      return;
    }
  private onError(msg: string) {
    // Flush any partial assistant content on error to avoid losing context
    if (this.streamingParts.length) this.messages.push({ role: 'assistant', parts: [...this.streamingParts] });
    this.streamingParts = [];
    this.assistantBuf = '';
    this.messages.push({ role: 'assistant', text: msg });
    this.busy = false; this.streaming = false; this.streamingText='';
    try { this.cdr.detectChanges(); } catch {}
  }
  // Détecte outils/logs et insère des parts structurées dans la bulle courante; retourne true si consommé
  private tryParseExecLine(line: string): boolean {
    const s = line.trim();
    // Cas spécial: [ai-form][msg] … ou [ai-flow][msg] … → merge paragraphe
    const mMsgAiForm = s.match(/^\[ai-form\]\s*\[msg\]\s*(.*)$/i);
    if (mMsgAiForm) { this.appendToAiFormMsg(mMsgAiForm[1] || ''); return true; }
    const mMsgFlow = s.match(/^\[ai-flow\]\s*\[msg\]\s*(.*)$/i);
    if (mMsgFlow) { this.appendToFlowMsg(mMsgFlow[1] || ''); return true; }
    // Tool start
    if (s.startsWith('>>> tool ')) {
      const rest = s.slice(9).trim();
      const m = rest.match(/^(\S+)\s*(.*)$/); const name = m ? m[1] : (rest.split(/\s+/)[0] || 'tool');
      const args = m ? m[2] : '';
      const key = `tool:start:${name}:${args}`;
      if (!this.recent.has(key)) { this.streamingParts.push({ kind: 'tool', name, status: 'running', text: (args || rest), badge: 'TOOL' }); this.recent.add(key); }
      return true;
    }
    // Tool end success
    if (s.startsWith('✓ ')) {
      const rest = s.slice(2).trim();
      const m = rest.match(/^(\S+)\s*(.*)$/); const name = m ? m[1] : (rest.split(/\s+/)[0] || 'tool');
      const tail = m ? m[2] : '';
      for (let i = this.streamingParts.length - 1; i >= 0; i--) {
        const it = this.streamingParts[i];
        if (it.kind === 'tool' && it.name === name && it.status === 'running') { it.status = 'success'; break; }
      }
      const key = `tool:ok:${name}:${tail || 'ok'}`;
      if (!this.recent.has(key)) { this.streamingParts.push({ kind: 'tool', name, status: 'success', text: (tail || 'ok'), badge: 'TOOL' }); this.recent.add(key); }
      return true;
    }
    // Tagged logs: [tag] message
    const m = s.match(/^\[([^\]]+)\]\s*(.*)$/);
    if (m) {
      const tag = m[1];
      const text = m[2] || '';
      const low = s.toLowerCase();
      const status: 'error'|'warn'|'success'|'info' = (low.includes('error')||low.includes('[error]')) ? 'error' : (low.includes('warn') ? 'warn' : (low.includes('ok')||low.includes('success')) ? 'success' : 'info');
      const isFlow = this.isFlowTag(tag);
      // Dédup avec événements ai-form.* déjà traités
      const tagLc = String(tag || '').toLowerCase();
      const txLc = String(text || '').toLowerCase();
      if (tagLc === 'ai-form') {
        if (txLc.startsWith('[patch') || txLc.startsWith('patch')) {
          const mOps = txLc.match(/ops\s*=\s*(\d+)/); const ops = mOps ? Number(mOps[1]) : NaN;
          const k = `ai-form:patch:${isNaN(ops)?'na':ops}`;
          if (this.recent.has(k)) return true; else this.recent.add(k);
        } else if (txLc.startsWith('snapshot')) {
          const k = 'ai-form:snapshot'; if (this.recent.has(k)) return true; else this.recent.add(k);
        } else if (txLc.startsWith('attach')) {
          const mParts = txLc.match(/parts\s*=\s*(\d+)/); const parts = mParts ? Number(mParts[1]) : NaN;
          const k = `ai-form:attach:${isNaN(parts)?'na':parts}`; if (this.recent.has(k)) return true; else this.recent.add(k);
        }
      }
      this.streamingParts.push({ kind: 'log', tag, text, status, badge: isFlow ? 'FLOW' : undefined });
      return true;
    }
    return false;
  }
  // Merge texte brut dans la dernière part texte (paragraphe normal)
  private appendToLastTextPart(token: string) {
    // Concaténer tel quel puis éliminer les doublons de mots consécutifs
    const t = String(token || ''); if (!t) return;
    const last = this.streamingParts[this.streamingParts.length - 1];
    if (last && last.kind === 'text' && !last.badge) last.text = this.mergeText(last.text || '', t);
    else this.streamingParts.push({ kind: 'text', text: this.mergeText('', t) });
    this.streamingText = this.mergeText(this.streamingText, t);
    this.assistantBuf = this.mergeText(this.assistantBuf, t);
  }
  // Merge paragraphe AI FORM "Assistant formulaire: …"
  private appendToAiFormMsg(text: string) {
    const t = String(text || ''); if (!t.trim()) return;
    for (let i = this.streamingParts.length - 1; i >= 0; i--) {
      const p = this.streamingParts[i];
      if (p && p.kind === 'ai-form' && p.badge === 'AI FORM' && p.name === 'Assistant formulaire:') {
        p.text = this.mergeText(p.text || '', t);
        return;
      }
    }
    this.streamingParts.push({ kind: 'ai-form', badge: 'AI FORM', name: 'Assistant formulaire:', text: this.mergeText('', t) });
  }
  // Merge paragraphe FLOW "Assistant workflow: …"
  private appendToFlowMsg(text: string) {
    const t = String(text || ''); if (!t.trim()) return;
    for (let i = this.streamingParts.length - 1; i >= 0; i--) {
      const p = this.streamingParts[i];
      if (p && p.kind === 'log' && p.badge === 'FLOW' && p.name === 'Assistant workflow:') {
        p.text = this.mergeText(p.text || '', t);
        return;
      }
    }
    this.streamingParts.push({ kind: 'log', badge: 'FLOW', name: 'Assistant workflow:', text: this.mergeText('', t) });
  }
  // Fusionne deux morceaux de texte en supprimant les doublons consécutifs de mots
  private mergeText(base: string, add: string): string {
    const combined = (base || '') + add;
    // Séparer mots et espaces pour conserver la mise en forme
    const parts = combined.split(/(\s+)/);
    const out: string[] = [];
    let prevWord = '';
    for (const p of parts) {
      if (!p) continue;
      if (/^\s+$/.test(p)) { out.push(p); continue; }
      const cur = p;
      const curKey = cur.toLocaleLowerCase();
      const prevKey = prevWord.toLocaleLowerCase();
      if (curKey && curKey === prevKey) { /* skip duplicate word */ continue; }
      out.push(cur);
      prevWord = cur;
    }
    return out.join('');
  }
  private isFlowTag(tag?: string): boolean {
    const t = (tag || '').toLowerCase();
    return !!(['ai-flow','edge','layout','outputs','context','args','flags','start','condition','template','schema','node','graph','elk','connect','layout.elk'].find(k => t.includes(k)));
  }
  private scrollToBottom(){ try { const el = this.scroller?.nativeElement; if (el) setTimeout(()=> el.scrollTop = el.scrollHeight, 0); } catch {} }
  loadIntoBuilder(){ if (this.finalGraph) { try { console.log('[ai-flow][loadIntoBuilder]', this.finalGraph); } catch {} this.graphGenerated.emit(this.finalGraph); } }
  resetFinal(){ this.finalGraph = null; }
}
