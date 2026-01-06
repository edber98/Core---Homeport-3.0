import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { RichPart } from './chat-types';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';

@Component({
  selector: 'chat-renderer',
  standalone: true,
  imports: [CommonModule, NzToolTipModule],
  template: `
    <div class="line" *ngFor="let p of parts" [class.tool]="p.kind==='tool'" [class.log]="p.kind==='log'" [class.aiform]="p.kind==='ai-form'">
      <span class="badge" *ngIf="p.kind==='tool' || p.badge==='TOOL'">TOOL</span>
      <span class="badge aiform" *ngIf="p.kind==='ai-form' || p.badge==='AI FORM'">AI FORM</span>
      <span class="badge flow" *ngIf="p.badge==='FLOW'">FLOW</span>
      <span class="st" [class.run]="p.status==='running'" [class.ok]="p.status==='success'" [class.err]="p.status==='error'" [class.warn]="p.status==='warn'" *ngIf="p.status">{{ p.status }}</span>
      <span class="name" *ngIf="p.name">{{ p.name }}</span>
      <span class="tag" *ngIf="p.tag">[{{ p.tag }}]</span>
      <ng-container *ngIf="isMessagePart(p); else notMessage">
        <span class="text" [innerHTML]="renderMarkdown(p.text || '')"></span>
      </ng-container>
      <ng-template #notMessage>
        <ng-container *ngIf="hasHtml(p); else plain">
          <span class="text" [innerHTML]="sanitizeHtml(htmlOf(p))"></span>
        </ng-container>
      <ng-template #plain>
        <ng-container *ngIf="p.kind==='tool'; else plainDefault">
          <ng-template #tt><div class="tt-html" [innerHTML]="sanitizeHtml(p.tooltip || p.text || '')"></div></ng-template>
          <span class="text oneline" nz-tooltip [nzTooltipTitle]="tt" [nzTooltipOverlayStyle]="tooltipStyle">{{ p.text }}</span>
        </ng-container>
        <ng-template #plainDefault>
          <span class="text">{{ p.text }}</span>
        </ng-template>
      </ng-template>
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
    .line .name { flex: 0 0 auto; }
    .line .text { flex: 1 1 auto; min-width: 0; }
    .line.tool .text p { margin: 0; display: inline; }
    .line.log .text, .line.tool .text { color:#9ca3af; }
    .text p { margin: 0; }
    .oneline { display:inline-block; max-width: 100%; overflow:hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: bottom; }
    .line.log .text { display:inline-block; max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .tt-html { white-space: normal; word-break: break-word; max-width: 640px; }
  `]
})
export class ChatRendererComponent {
  @Input() parts: RichPart[] = [];
  tooltipStyle = { 'max-width.px': 640, 'white-space': 'normal', 'word-break': 'break-word' } as any;

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
      // Restreindre les balises pour éviter les titres H1/H2/H3 non désirés
      const safe = DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['p','strong','em','code','pre','a','ul','ol','li','br','span','b','i'],
        ALLOWED_ATTR: ['href','target','rel','class'],
      });
      return safe;
    } catch { return src; }
  }

  sanitizeHtml(src: string): string {
    try {
      return DOMPurify.sanitize(String(src || ''), {
        ALLOWED_TAGS: ['p','strong','em','code','pre','a','ul','ol','li','br','span','b','i','img','div','h4'],
        ALLOWED_ATTR: ['href','target','rel','class','width','height','src','alt'],
      });
    } catch { return src; }
  }

  hasHtml(p: any): boolean { try { return !!(p && p.html); } catch { return false; } }
  htmlOf(p: any): string { try { return String(p?.html || ''); } catch { return ''; } }
}
