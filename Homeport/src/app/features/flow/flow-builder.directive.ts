import { AfterViewInit, Directive, ElementRef, NgZone, OnDestroy } from '@angular/core';

@Directive({ selector: '[vflowSafariForeignObjectPatch]', standalone: true })
export class VflowSafariForeignObjectPatchDirective implements AfterViewInit, OnDestroy {
  private mo?: MutationObserver;

  constructor(private el: ElementRef<HTMLElement>, private zone: NgZone) {
    console.log("ok")
  }

  ngAfterViewInit(): void {

    if (!this.isSafari()) return;

    this.zone.runOutsideAngular(() => {
      const host = this.el.nativeElement;

      const fo = host.closest('foreignObject') as SVGForeignObjectElement | null;
      if (!fo) return;

      // 1er enfant HTML dans foreignObject (celui que tu as ciblé en CSS)
      const first = fo.querySelector(':scope > *:first-child') as HTMLElement | null;
      if (!first) return;

      const update = () => {
        const r = fo.getBoundingClientRect();
        console.log(r)
        // On recolle le "fixed" au viewport EXACTEMENT sur le foreignObject
        first.style.top = `${r.top}px`;
        first.style.left = `${r.left}px`;
        first.style.width = `${r.width}px`;
        first.style.height = `${r.height}px`;
      };

      update();

      // Observe le transform du <g> (souvent g.vflow-node lui-même)
      const g = fo.closest('g') as SVGGElement | null;
      if (!g) return;

      this.mo = new MutationObserver(update);
      this.mo.observe(g, { attributes: true, attributeFilter: ['transform'] });

      // Bonus: resize/zoom viewport
      window.addEventListener('resize', update, { passive: true });
      window.addEventListener('scroll', update, { passive: true });
      // petit cleanup sans stocker 15 refs
      (this as any)._cleanup = () => {
        window.removeEventListener('resize', update as any);
        window.removeEventListener('scroll', update as any);
      };
    });
  }

  ngOnDestroy(): void {
    this.mo?.disconnect();
    if ((this as any)._cleanup) (this as any)._cleanup();
  }

  private isSafari(): boolean {
    const ua = navigator.userAgent;
    return /Safari/.test(ua) && !/Chrome|Chromium|Edg|Firefox/.test(ua);
  }
}
