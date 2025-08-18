import { TestBed } from '@angular/core/testing';
import { UiHtmlIoService } from './ui-html-io.service';
import { UiClassStyleService } from './ui-class-style.service';
import { UiBreakpointsService } from './ui-breakpoints.service';
import { UiTokensService } from './ui-tokens.service';

describe('UiHtmlIoService responsive import', () => {
  let svc: UiHtmlIoService;
  let cls: UiClassStyleService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UiHtmlIoService, UiClassStyleService, UiBreakpointsService, UiTokensService],
    });
    svc = TestBed.inject(UiHtmlIoService);
    cls = TestBed.inject(UiClassStyleService);
  });

  it('maps base class styles and @media max-width to the correct breakpoint', () => {
    const css = `
      .grid{display:grid}
      @media (max-width: 640px){ .grid{ grid-template-columns: 1fr } }
    `;
    const html = `<!doctype html><html><head><style>${css}</style></head><body><div class="grid"></div></body></html>`;
    svc.importHtml(html);

    const base = cls.getStyles('grid', 'base', 'auto');
    expect(base['display']).toBe('grid');

    const sm = cls.getStyles('grid', 'base', 'sm');
    expect(sm['grid-template-columns']).toBe('1fr');
  });

  it('maps @media min-width to the nearest matching breakpoint', () => {
    const css = `
      .grid{display:grid}
      @media (min-width: 1280px){ .grid{ grid-template-columns: repeat(3,1fr) } }
    `;
    const html = `<!doctype html><html><head><style>${css}</style></head><body><div class="grid"></div></body></html>`;
    svc.importHtml(html);

    const xl = cls.getStyles('grid', 'base', 'xl');
    expect(xl['grid-template-columns']).toBe('repeat(3,1fr)');
  });

  it('maps @media max-width:980px to md breakpoint with default config', () => {
    const css = `
      .row{display:flex}
      @media (max-width: 980px){ .row{ gap: 8px } }
    `;
    const html = `<!doctype html><html><head><style>${css}</style></head><body><div class="row"></div></body></html>`;
    svc.importHtml(html);

    const md = cls.getStyles('row', 'base', 'md');
    expect(md['gap']).toBe('8px');
  });
});

