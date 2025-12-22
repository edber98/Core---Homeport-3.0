import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ChangeDetectorRef, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { AiFormAgentService, AgentEvent } from '../../../services/ai-form-agent.service';
import { ChatRendererComponent } from '../../../shared/chat/chat-renderer.component';
import { RichPart, mergeText } from '../../../shared/chat/chat-types';

type Msg = { role: 'user'|'assistant'|'system'; text?: string; parts?: RichPart[] };

@Component({
  selector: 'df-ai-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzInputModule, NzIconModule, ChatRendererComponent],
  template: `
  <div class="chat-root">
    <div class="chat-header">
      <div class="title">Assistant Formulaire</div>
      <button nz-button nzType="default" nzSize="small" class="close-btn" (click)="close.emit()">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
    <div class="chat-body" #scroller>
      <div class="bubble" *ngFor="let m of messages" [class.me]="m.role==='user'" [class.assistant]="m.role==='assistant'">
        <ng-container *ngIf="!m.parts; else richMsg">
          <div class="txt">{{ m.text }}</div>
        </ng-container>
        <ng-template #richMsg>
          <div class="txt rich"><chat-renderer [parts]="m.parts || []"></chat-renderer></div>
        </ng-template>
      </div>
      <div class="bubble assistant" *ngIf="streaming">
        <div class="txt rich"><chat-renderer [parts]="streamingParts"></chat-renderer></div>
      </div>
    </div>
    <div class="chat-footer">
      <div class="opts">
        <label>
          <span>Layout</span>
          <select [(ngModel)]="layout">
            <option value="vertical">vertical</option>
            <option value="horizontal">horizontal</option>
            <option value="inline">inline</option>
          </select>
        </label>
        <label class="ml">
          <input type="checkbox" [(ngModel)]="steps"/>
          <span>Steps</span>
        </label>
      </div>
      <div class="composer">
        <textarea #composerInput nz-input class="composer-input" [(ngModel)]="text" [disabled]="busy"
          placeholder="Décrivez le formulaire (ex: Inscription, adresse, paiement)…" rows="1"
          (input)="onComposerInput()" (keydown.enter)="onComposerEnter($event)"></textarea>
        <button nz-button nzType="primary" (click)="send()" [disabled]="!text || busy">Envoyer</button>
        <button nz-button class="ml" (click)="stop()" *ngIf="busy">Stop</button>
      </div>
      <div class="seed">
        <textarea nz-input [(ngModel)]="seedText" [disabled]="busy" placeholder="Schéma seed (JSON optionnel, ex: champ select avec options)" rows="3"></textarea>
      </div>
      <div class="actions" *ngIf="finalSchema">
        <button nz-button nzType="primary" (click)="loadIntoBuilder()">Charger dans le builder</button>
        <button nz-button class="ml" (click)="resetFinal()">Effacer le schéma</button>
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
    .composer { display:flex; gap:8px; align-items:flex-end; }
    .composer-input { flex: 1 1 auto; min-height: 36px; max-height: 140px; resize: none; overflow-y: hidden; }
    .opts { display:flex; align-items:center; gap:10px; color:#475569; font-size:12px; margin-bottom:4px; }
    .opts select { margin-left:6px; }
    .ml { margin-left: 6px; }
    .txt.rich p { margin: 0; }
    /* Mobile responsiveness: make overlay adapt to screen */
    @media (max-width: 640px) {
      .chat-root { width: calc(100vw - 24px); max-width: 100%; height: min(80vh, 640px); }
      .bubble { max-width: 100%; }
    }
  `]
})
export class AiChatComponent implements AfterViewInit {
  @Input() maxFields = 20;
  @Output() close = new EventEmitter<void>();
  @Output() schemaGenerated = new EventEmitter<any>();

  messages: Msg[] = [];
  text = '';
  busy = false;
  streaming = false;
  streamingText = '';
  streamingParts: RichPart[] = [];
  private recent = new Set<string>();
  finalSchema: any = null;
  seedText = '';

  layout: 'vertical'|'horizontal'|'inline' = 'vertical';
  steps = false;

  private stopFn?: () => void;

  @ViewChild('scroller') scroller?: ElementRef<HTMLDivElement>;
  @ViewChild('composerInput') composerInput?: ElementRef<HTMLTextAreaElement>;

  constructor(private agent: AiFormAgentService, private cdr: ChangeDetectorRef) {}

  ngAfterViewInit(): void {
    this.scrollToBottom();
    setTimeout(() => this.onComposerInput(), 0);
  }

  send() {
    const t = (this.text || '').trim();
    if (!t || this.busy) return;
    this.messages.push({ role: 'user', text: t });
    this.text = '';
    this.onComposerInput();
    this.busy = true; this.streaming = true; this.streamingText = '';
    this.streamingParts = [];
    try { this.recent.clear(); } catch {}
    let seedObj: any = undefined;
    try { const s = (this.seedText || '').trim(); if (s) seedObj = JSON.parse(s); } catch {}
    const stream = this.agent.stream({ prompt: t, layout: this.layout, steps: this.steps, maxFields: this.maxFields, seedSchema: seedObj });
    this.stopFn = stream.stop;
    stream.events$.subscribe({ next: (ev: AgentEvent) => this.onEvent(ev), error: () => this.onError('Erreur de flux') });
  }

  stop() {
    try { this.stopFn?.(); } catch {}
    this.busy = false; this.streaming = false;
  }

  private onEvent(evt: AgentEvent) {
    if (!evt) return;
    // Structured tool events → AI FORM badge
    if (evt.type === 'tool.start') {
      const name = (evt as any).name || 'tool';
      const args = (evt as any).args;
      const key = `tool:start:${name}:${JSON.stringify(args||{})}`;
      if (!this.recent.has(key)) {
        this.streamingParts.push({ kind: 'ai-form', name, status: 'running', text: '', badge: 'AI FORM' });
        this.recent.add(key);
      }
      this.detectAndScroll();
      return;
    }
    if (evt.type === 'tool.end') {
      const name = (evt as any).name || 'tool';
      for (let i = this.streamingParts.length - 1; i >= 0; i--) {
        const it = this.streamingParts[i];
        if ((it.kind === 'ai-form' || it.kind === 'tool') && it.name === name && it.status === 'running') { it.status = 'success'; break; }
      }
      // Also append a success line
      const key = `tool:ok:${name}`;
      if (!this.recent.has(key)) { this.streamingParts.push({ kind: 'ai-form', name, status: 'success', text: 'ok', badge: 'AI FORM' }); this.recent.add(key); }
      this.detectAndScroll();
      return;
    }
    if (evt.type === 'patch') {
      const ops = Array.isArray((evt as any).ops) ? (evt as any).ops.length : 0;
      const key = `ai-form:patch:${ops}`;
      if (!this.recent.has(key)) { this.streamingParts.push({ kind: 'ai-form', status: 'info', text: `patch ops=${ops}`, badge: 'AI FORM' }); this.recent.add(key); }
      this.detectAndScroll();
      return;
    }
    if (evt.type === 'snapshot') {
      const key = 'ai-form:snapshot';
      if (!this.recent.has(key)) { this.streamingParts.push({ kind: 'ai-form', status: 'info', text: 'snapshot', badge: 'AI FORM' }); this.recent.add(key); }
      this.detectAndScroll();
      return;
    }
    if (evt.type === 'message') {
      const t = (evt.text || '').toString();
      this.appendAssistantParagraph(t);
      this.detectAndScroll();
      return;
    }
    if (evt.type === 'final') {
      let s: any = (evt as any).schema;
      if (typeof s === 'string') { try { s = JSON.parse(s); } catch {} }
      this.finalSchema = s || {};
      if (this.streamingParts.length) this.messages.push({ role: 'assistant', parts: [...this.streamingParts] });
      this.streamingParts = [];
      this.messages.push({ role: 'assistant', text: 'Formulaire généré. Prêt à charger dans le builder.' });
      this.streaming = false; this.busy = false;
      this.detectAndScroll();
      return;
    }
    if (evt.type === 'warning') {
      this.streamingParts.push({ kind: 'ai-form', status: 'warn', text: (evt.message || 'Avertissement'), badge: 'AI FORM' });
      this.detectAndScroll();
      return;
    }
    if (evt.type === 'error') {
      this.streamingParts.push({ kind: 'ai-form', status: 'error', text: (evt.message || 'Erreur'), badge: 'AI FORM' });
      this.onError(evt.message || 'Erreur');
      return;
    }
    if (evt.type === 'done') {
      if (this.streamingParts.length) this.messages.push({ role: 'assistant', parts: [...this.streamingParts] });
      this.streamingParts = [];
      this.streaming = false; this.busy = false;
      this.detectAndScroll();
      return;
    }
  }

  private onError(msg: string) {
    this.streaming = false; this.busy = false;
    if (this.streamingParts.length) this.messages.push({ role: 'assistant', parts: [...this.streamingParts] });
    this.streamingParts = [];
    if (this.streamingText) { this.messages.push({ role: 'assistant', text: this.streamingText }); this.streamingText = ''; }
    this.messages.push({ role: 'assistant', text: '✖ ' + msg });
    this.detectAndScroll();
  }

  loadIntoBuilder() {
    if (this.finalSchema) this.schemaGenerated.emit(this.finalSchema);
  }
  resetFinal() { this.finalSchema = null; }

  private detectAndScroll() {
    try { this.cdr.markForCheck(); this.cdr.detectChanges(); } catch {}
    this.scrollToBottom();
  }
  private scrollToBottom() {
    try {
      const el = this.scroller?.nativeElement; if (!el) return;
      el.scrollTop = el.scrollHeight;
    } catch {}
  }

  onComposerInput() {
    const el = this.composerInput?.nativeElement;
    if (!el) return;
    el.style.height = 'auto';
    const max = 140;
    const next = Math.min(max, el.scrollHeight || 0);
    el.style.height = `${Math.max(36, next)}px`;
    const shouldScroll = (el.scrollHeight || 0) > max;
    el.style.overflowY = shouldScroll ? 'auto' : 'hidden';
    if (shouldScroll) el.scrollTop = el.scrollHeight;
  }

  onComposerEnter(ev: Event) {
    const keyEv = ev as KeyboardEvent;
    if (keyEv.shiftKey) return;
    keyEv.preventDefault();
    this.send();
  }

  // Merge assistant paragraph as unified AI Form message block
  private appendAssistantParagraph(token: string) {
    const t = String(token || ''); if (!t) return;
    // Use a dedicated AI FORM paragraph label like Flow chat
    for (let i = this.streamingParts.length - 1; i >= 0; i--) {
      const p = this.streamingParts[i];
      if (p && p.kind === 'ai-form' && p.badge === 'AI FORM' && p.name === 'Assistant formulaire:' && !p.status) {
        p.text = mergeText(p.text || '', t);
        return;
      }
    }
    this.streamingParts.push({ kind: 'ai-form', badge: 'AI FORM', name: 'Assistant formulaire:', text: mergeText('', t) });
  }
}
