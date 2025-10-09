import { Injectable } from '@angular/core';

export type TokenMap = Record<string, string>;

@Injectable({ providedIn: 'root' })
export class UiTokensService {
  tokens: TokenMap = {
    '--color-primary': '#1677ff',
    '--space-2': '8px',
    '--radius-sm': '6px',
    '--shadow-md': '0 6px 18px rgba(0,0,0,.12)',
    '--font-size-400': '16px'
  };

  applyTo(target?: Document | ShadowRoot | HTMLElement) {
    let rootEl: HTMLElement | null = null;
    if (!target) {
      rootEl = document.documentElement as HTMLElement;
    } else if (target instanceof Document) {
      rootEl = target.documentElement as HTMLElement;
    } else if ((target as any).host) {
      rootEl = (target as ShadowRoot).host as HTMLElement;
    } else {
      rootEl = target as HTMLElement;
    }
    if (!rootEl) return;
    Object.entries(this.tokens).forEach(([k, v]) => rootEl!.style.setProperty(k, v));
  }

  // Back-compat alias
  applyToDocument(doc: Document = document) { this.applyTo(doc); }

  set(name: string, value: string) { this.tokens[name] = value; this.applyTo(); }
  remove(name: string) { delete this.tokens[name]; this.applyTo(); }
}
