import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, ViewChild, ElementRef, ChangeDetectorRef, AfterViewInit, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { AiFlowAgentService, FlowAgentEvent } from '../../../services/ai-flow-agent.service';

type Msg = { role: 'user'|'assistant'|'system'; text: string };

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
        <div class="txt">{{ m.text }}</div>
      </div>
      <div class="bubble assistant" *ngIf="streaming"><div class="txt">{{ streamingText }}</div></div>
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
      <!-- Inline AI Form events panel (forwarded from Flow Agent) -->
      <div class="ai-form-panel" *ngIf="aiFormEvents.length">
        <div class="row" *ngFor="let e of aiFormEvents">
          <span class="badge">AI Form</span>
          <span class="evt">{{ e.t }}</span>
          <span class="msg" *ngIf="e.msg">· {{ e.msg }}</span>
        </div>
      </div>
      <!-- Exec logs panel: tools and tagged logs parsed from assistant messages -->
      <div class="exec-panel" *ngIf="execLogs.length">
        <div class="row" *ngFor="let r of execLogs">
          <span class="st" [class.run]="r.status==='running'" [class.ok]="r.status==='success'" [class.err]="r.status==='error'" [class.warn]="r.status==='warn'">{{ r.status || 'info' }}</span>
          <span class="tool" *ngIf="r.kind==='tool'">{{ r.name }}</span>
          <span class="tag" *ngIf="r.kind==='log'">[{{ r.tag }}]</span>
          <span class="txt">{{ r.text }}</span>
        </div>
      </div>
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
    .ai-form-panel { max-height: 120px; overflow:auto; background:#fff7ed; border:1px solid #fed7aa; border-radius: 6px; padding:6px 8px; font-size:12px; color:#7c2d12; }
    .ai-form-panel .row { display:flex; align-items:center; gap:8px; padding:2px 0; }
    .ai-form-panel .badge { background:#fdba74; color:#7c2d12; border-radius: 4px; padding:0 6px; font-weight:600; }
    .exec-panel { max-height: 140px; overflow:auto; background:#f8fafc; border:1px solid #e5e7eb; border-radius:6px; padding:6px 8px; font-size:12px; color:#111827; }
    .exec-panel .row { display:flex; align-items:center; gap:8px; padding:1px 0; }
    .exec-panel .tool { font-weight:600; }
    .exec-panel .tag { color:#6b7280; }
    .exec-panel .st { font-weight:600; text-transform:uppercase; font-size:11px; color:#374151; }
    .exec-panel .st.run { color:#2563eb; }
    .exec-panel .st.ok { color:#16a34a; }
    .exec-panel .st.err { color:#ef4444; }
    .exec-panel .st.warn { color:#d97706; }
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
    let seedObj: any = undefined;
    try { const s = (this.seedText || '').trim(); if (s) seedObj = JSON.parse(s); } catch {}
    const stream = this.agent.stream({ prompt: t, seedGraph: seedObj || this.seedGraph });
    this.stopFn = stream.stop;
    stream.events$.subscribe({ next: (ev: FlowAgentEvent) => this.onEvent(ev), error: () => this.onError('Erreur de flux') });
  }
  stop() {
    try { this.stopFn?.(); } catch {}
    if (this.assistantBuf && this.assistantBuf.trim()) this.messages.push({ role: 'assistant', text: this.assistantBuf });
    this.assistantBuf = '';
    this.busy = false; this.streaming = false; this.streamingText='';
  }

  private onEvent(evt: FlowAgentEvent) {
    if (!evt) return;
    if (evt.type === 'message' && evt.text) {
      const raw = String(evt.text);
      const lines = raw.split(/\r?\n/);
      for (const line of lines) {
        if (!line) continue;
        if (!this.tryParseExecLine(line)) {
          this.streamingText += line + '\n';
          this.assistantBuf += line + '\n';
        }
      }
      this.scrollToBottom();
      return;
    }
    if (evt.type === 'snapshot' && (evt as any).graph) { this.previewGraph = (evt as any).graph; try { console.log('[ai-flow][snapshot]', this.previewGraph); } catch {} }
    if (evt.type === 'final' && (evt as any).graph) {
      this.finalGraph = (evt as any).graph; try { console.log('[ai-flow][final]', this.finalGraph); } catch {}
      // Persist the streamed assistant text as a single bubble
      if (this.assistantBuf && this.assistantBuf.trim()) this.messages.push({ role: 'assistant', text: this.assistantBuf });
      this.assistantBuf = ''; this.streamingText=''; this.busy = false; this.streaming = false;
    }
    if (evt.type === 'error') { this.onError(evt.message || 'Erreur'); }
    if ((evt.type as any)?.startsWith && (evt.type as any).startsWith('ai-form.')) {
      const t = String(evt.type).replace('ai-form.', '');
      if (t === 'message') this.aiFormEvents.push({ t, msg: (evt as any).text || '' });
      else if (t === 'error') this.aiFormEvents.push({ t, msg: (evt as any).message || (evt as any).code || 'error' });
      else if (t === 'attach') this.aiFormEvents.push({ t, msg: `attach parts=${(evt as any).parts ?? '-'}` });
      else if (t === 'patch') this.aiFormEvents.push({ t, msg: `ops=${Array.isArray((evt as any).ops)?(evt as any).ops.length:0}` });
      else this.aiFormEvents.push({ t });
      if (this.aiFormEvents.length > 50) this.aiFormEvents.shift();
      // Hide sub-panel when AI Form generation signals completion
      if (t === 'final') this.aiFormEvents = [];
    }
    try { this.cdr.detectChanges(); } catch {}
  }
  private onError(msg: string) {
    // Flush any partial assistant text on error to avoid losing context
    if (this.assistantBuf && this.assistantBuf.trim()) this.messages.push({ role: 'assistant', text: this.assistantBuf });
    this.assistantBuf = '';
    this.messages.push({ role: 'assistant', text: msg });
    this.busy = false; this.streaming = false; this.streamingText='';
    try { this.cdr.detectChanges(); } catch {}
  }
  // Detect tool/log lines and push structured entries; returns true if consumed
  private tryParseExecLine(line: string): boolean {
    const at = Date.now();
    const s = line.trim();
    // Tool start
    if (s.startsWith('>>> tool ')) {
      const rest = s.slice(9).trim();
      const name = rest.split(/\s+/)[0] || 'tool';
      this.execLogs.push({ kind: 'tool', name, status: 'running', text: rest, at });
      if (this.execLogs.length > 200) this.execLogs.shift();
      return true;
    }
    // Tool end success
    if (s.startsWith('✓ ')) {
      const rest = s.slice(2).trim();
      const name = rest.split(/\s+/)[0] || 'tool';
      for (let i = this.execLogs.length - 1; i >= 0; i--) {
        const it = this.execLogs[i];
        if (it.kind === 'tool' && it.name === name && it.status === 'running') { it.status = 'success'; break; }
      }
      this.execLogs.push({ kind: 'tool', name, status: 'success', text: rest, at });
      if (this.execLogs.length > 200) this.execLogs.shift();
      return true;
    }
    // Tagged logs: [tag] message
    const m = s.match(/^\[([^\]]+)\]\s*(.*)$/);
    if (m) {
      const tag = m[1];
      const text = m[2] || '';
      const low = s.toLowerCase();
      const status: 'error'|'warn'|'success'|'info' = (low.includes('error')||low.includes('[error]')) ? 'error' : (low.includes('warn') ? 'warn' : (low.includes('ok')||low.includes('success')) ? 'success' : 'info');
      this.execLogs.push({ kind: 'log', tag, text, status, at });
      if (this.execLogs.length > 200) this.execLogs.shift();
      return true;
    }
    return false;
  }
  private scrollToBottom(){ try { const el = this.scroller?.nativeElement; if (el) setTimeout(()=> el.scrollTop = el.scrollHeight, 0); } catch {} }
  loadIntoBuilder(){ if (this.finalGraph) { try { console.log('[ai-flow][loadIntoBuilder]', this.finalGraph); } catch {} this.graphGenerated.emit(this.finalGraph); } }
  resetFinal(){ this.finalGraph = null; }
}
