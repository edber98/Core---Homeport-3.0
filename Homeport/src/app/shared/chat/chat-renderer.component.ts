import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { RichPart } from './chat-types';

@Component({
  selector: 'chat-renderer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="line" *ngFor="let p of parts" [class.tool]="p.kind==='tool'" [class.log]="p.kind==='log'" [class.aiform]="p.kind==='ai-form'">
      <span class="badge" *ngIf="p.kind==='tool' || p.badge==='TOOL'">TOOL</span>
      <span class="badge aiform" *ngIf="p.kind==='ai-form' || p.badge==='AI FORM'">AI FORM</span>
      <span class="badge flow" *ngIf="p.badge==='FLOW'">FLOW</span>
      <span class="st" [class.run]="p.status==='running'" [class.ok]="p.status==='success'" [class.err]="p.status==='error'" [class.warn]="p.status==='warn'" *ngIf="p.status">{{ p.status }}</span>
      <span class="name" *ngIf="p.name">{{ p.name }}</span>
      <span class="tag" *ngIf="p.tag">[{{ p.tag }}]</span>
      <ng-container *ngIf="isMessagePart(p); else plain">
        <span class="text" [innerHTML]="renderMarkdown(p.text || '')"></span>
      </ng-container>
      <ng-template #plain>
        <span class="text">{{ p.text }}</span>
      </ng-template>
    </div>
  `,
  styles: [`
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
    .line.tool .text p { margin: 0; display: inline; }
    .line.log .text, .line.tool .text { color:#9ca3af; }
    .text p { margin: 0; }
  `]
})
export class ChatRendererComponent {
  @Input() parts: RichPart[] = [];

  isMessagePart(p: RichPart): boolean {
    try {
      if (!p) return false;
      if (p.kind === 'text') return true;
      if (p.kind === 'ai-form' && p.badge === 'AI FORM' && p.name === 'Assistant formulaire:' && !p.status) return true;
      if (p.kind === 'log' && p.badge === 'FLOW' && p.name === 'Assistant workflow:' && !p.status) return true;
      return false;
    } catch {
      return false;
    }
  }

  renderMarkdown(src: string): string {
    try {
      const html = marked.parse(String(src || ''), { breaks: true, gfm: true }) as string;
      return DOMPurify.sanitize(html);
    } catch { return src; }
  }
}
