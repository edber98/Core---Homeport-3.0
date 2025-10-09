import { Directive, ElementRef, Input, OnChanges, Renderer2, RendererStyleFlags2, SimpleChanges } from '@angular/core';

@Directive({
  selector: '[uiApplyStyles]',
  standalone: true,
})
export class UiApplyStylesDirective implements OnChanges {
  @Input('uiApplyStyles') styles: Record<string, any> | null = null;
  private prevKeys = new Set<string>();

  constructor(private el: ElementRef<HTMLElement>, private rd: Renderer2) {}

  ngOnChanges(_ch: SimpleChanges): void {
    const map = this.styles || {};
    // remove old styles not present anymore
    for (const k of Array.from(this.prevKeys)) {
      if (!(k in map)) {
        this.rd.removeStyle(this.el.nativeElement, k);
        this.prevKeys.delete(k);
      }
    }
    // apply new styles with !important support
    Object.keys(map).forEach(k => {
      let v = map[k];
      if (v == null || v === '') { this.rd.removeStyle(this.el.nativeElement, k); this.prevKeys.delete(k); return; }
      let s = String(v).trim();
      let important = false;
      // Normalize multiple !important
      s = s.replace(/\s*!important\b/gi, (m) => { important = true; return ''; }).trim();
      const flag = important ? RendererStyleFlags2.Important : undefined as any;
      this.rd.setStyle(this.el.nativeElement, k, s, flag);
      this.prevKeys.add(k);
    });
  }
}

