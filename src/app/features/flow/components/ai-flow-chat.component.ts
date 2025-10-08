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
      // Merge tokens into a single assistant bubble while streaming
      this.streamingText += evt.text;
      this.assistantBuf += evt.text;
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
  private scrollToBottom(){ try { const el = this.scroller?.nativeElement; if (el) setTimeout(()=> el.scrollTop = el.scrollHeight, 0); } catch {} }
  loadIntoBuilder(){ if (this.finalGraph) { try { console.log('[ai-flow][loadIntoBuilder]', this.finalGraph); } catch {} this.graphGenerated.emit(this.finalGraph); } }
  resetFinal(){ this.finalGraph = null; }
}
