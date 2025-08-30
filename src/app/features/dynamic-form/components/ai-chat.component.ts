import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ChangeDetectorRef, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { AiFormAgentService, AgentEvent } from '../../../services/ai-form-agent.service';

type Msg = { role: 'user'|'assistant'|'system'; text: string };

@Component({
  selector: 'df-ai-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzInputModule, NzIconModule],
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
        <div class="txt">{{ m.text }}</div>
      </div>
      <div class="bubble assistant" *ngIf="streaming">
        <div class="txt">{{ streamingText }}</div>
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
        <input nz-input [(ngModel)]="text" [disabled]="busy" placeholder="Décrivez le formulaire (ex: Inscription, adresse, paiement)…" (keyup.enter)="send()"/>
        <button nz-button nzType="primary" (click)="send()" [disabled]="!text || busy">Envoyer</button>
        <button nz-button class="ml" (click)="stop()" *ngIf="busy">Stop</button>
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
    .composer { display:flex; gap:8px; }
    .opts { display:flex; align-items:center; gap:10px; color:#475569; font-size:12px; margin-bottom:4px; }
    .opts select { margin-left:6px; }
    .ml { margin-left: 6px; }
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
  finalSchema: any = null;

  layout: 'vertical'|'horizontal'|'inline' = 'vertical';
  steps = false;

  private stopFn?: () => void;

  @ViewChild('scroller') scroller?: ElementRef<HTMLDivElement>;

  constructor(private agent: AiFormAgentService, private cdr: ChangeDetectorRef) {}

  ngAfterViewInit(): void {
    this.scrollToBottom();
  }

  send() {
    const t = (this.text || '').trim();
    if (!t || this.busy) return;
    this.messages.push({ role: 'user', text: t });
    this.text = '';
    this.busy = true; this.streaming = true; this.streamingText = '';
    const stream = this.agent.stream({ prompt: t, layout: this.layout, steps: this.steps, maxFields: this.maxFields });
    this.stopFn = stream.stop;
    stream.events$.subscribe({
      next: (ev: AgentEvent) => this.onEvent(ev),
      error: () => this.onError('Erreur de flux')
    });
  }

  stop() {
    try { this.stopFn?.(); } catch {}
    this.busy = false; this.streaming = false;
  }

  private onEvent(evt: AgentEvent) {
    if (evt.type === 'message') {
      const s = (evt.text || '').toString();
      this.streaming = true; this.streamingText += (this.streamingText ? '' : '') + s;
      this.detectAndScroll();
      return;
    }
    if (evt.type === 'final') {
      let s: any = (evt as any).schema;
      if (typeof s === 'string') { try { s = JSON.parse(s); } catch { /* ignore */ } }
      this.finalSchema = s || {};
      // Push the assistant summary message
      const text = 'Schéma généré. Prêt à charger dans le builder.';
      if (this.streamingText) {
        this.messages.push({ role: 'assistant', text: this.streamingText });
        this.streamingText = '';
      }
      this.messages.push({ role: 'assistant', text });
      this.streaming = false; this.busy = false;
      this.detectAndScroll();
      return;
    }
    if (evt.type === 'warning') {
      this.messages.push({ role: 'assistant', text: (evt.message || 'Avertissement') });
      this.detectAndScroll();
      return;
    }
    if (evt.type === 'error') {
      this.onError(evt.message || 'Erreur');
      return;
    }
    if (evt.type === 'done') {
      this.streaming = false; this.busy = false;
      this.detectAndScroll();
      return;
    }
  }

  private onError(msg: string) {
    this.streaming = false; this.busy = false;
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
}
