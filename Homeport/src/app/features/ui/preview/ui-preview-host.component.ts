import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, Output, ViewEncapsulation, OnChanges } from '@angular/core';
import { UiNode } from '../ui-model.service';
import { UiNodeViewComponent } from '../view/ui-node-view.component';
import { UiClassStyleService, UiState } from '../services/ui-class-style.service';
import { UiBreakpointsService } from '../services/ui-breakpoints.service';
import { UiTokensService } from '../services/ui-tokens.service';

@Component({
  selector: 'ui-preview-host',
  standalone: true,
  encapsulation: ViewEncapsulation.ShadowDom,
  imports: [CommonModule, UiNodeViewComponent],
  host: { '[class.no-editing]': '!editing' },
  template: `
  <style>
    :host { display:block; }
    /* Minimal base to keep preview readable inside shadow */
    *, *::before, *::after { box-sizing: border-box; }
    /* body, div, section, header, footer, p, h1, h2, h3, h4, h5, h6, span, label, ul, li, button, input, textarea, img, a, aside { margin:0; padding:0; } */
    ul { list-style: disc; padding-left: 20px; }
    ol { list-style: decimal; padding-left: 20px; }
    a { color: inherit; text-decoration: underline; }
    img { max-width: 100%; height: auto; display: inline-block; }
    button, input, textarea, select { font: inherit; }
    /* When not editing, ensure any hover controls never show */
    :host(.no-editing) .hover-actions { display: none !important; }
    :host(.no-editing) .selected { outline: none !important; }
  </style>
  <style [innerHTML]="classCss"></style>
  <ui-node-view [node]="root" [selectedId]="selectedId" [bp]="bp" [state]="state" [editing]="editing"
    (select)="select.emit($event)" (dblselect)="dblselect.emit($event)" (ctxmenu)="context.emit($event)"></ui-node-view>
  `
})
export class UiPreviewHostComponent implements OnChanges {
  @Input() root!: UiNode;
  @Input() selectedId: string | null = null;
  @Input() bp: 'auto'|'xs'|'sm'|'md'|'lg'|'xl' = 'auto';
  @Input() state: UiState = 'base';
  @Input() editing: boolean = true;
  @Input() version: number | null = null; // trigger change detection on external bumps
  @Output() select = new EventEmitter<string>();
  @Output() dblselect = new EventEmitter<string>();
  @Output() context = new EventEmitter<{ id: string; x: number; y: number }>();

  classCss = '';
  constructor(private tokens: UiTokensService, private el: ElementRef<HTMLElement>, private cls: UiClassStyleService, private bpSvc: UiBreakpointsService) {}
  ngOnChanges(): void {
    try { this.tokens.applyTo(this.el.nativeElement.shadowRoot as ShadowRoot); } catch {}
    this.classCss = this.buildCss();
  }

  private buildCss(): string {
    const out: string[] = [];
    const decls = (map: Record<string,string>|undefined) => {
      const obj = map || {}; const parts: string[] = [];
      Object.keys(obj).forEach(k => { const v = obj[k]; if (v != null && v !== '') parts.push(`${k}:${v}`); });
      return parts.join(';');
    };
    const classes = this.cls.list();
    const bps = this.bpSvc.list;
    const states: UiState[] = ['base','hover','active','focus'];
    for (const c of classes) {
      const styles = (c.styles || {}) as any;
      for (const st of states) {
        const block = styles[st]; if (!block) continue;
        const base = decls(block.base);
        const pseudo = st === 'base' ? '' : `:${st}`;
        if (base) out.push(`.${c.name}${pseudo}{${base}}`);
        const bp = block.bp || {};
        Object.keys(bp).forEach(id => {
          const d = decls(bp[id]); if (!d) return;
          const def = bps.find(x => String(x.id) === String(id));
          const min = def?.min;
          if (min != null) out.push(`@media (min-width:${min}px){.${c.name}${pseudo}{${d}}}`);
          else out.push(`.${c.name}${pseudo}{${d}}`);
        });
      }
    }
    return out.join('\n');
  }
}
