import { Injectable } from '@angular/core';

export interface ExpressionContext {
  [k: string]: any;
}

@Injectable({ providedIn: 'root' })
export class ExpressionSandboxService {
  /**
   * Evaluates a whole input that may contain 0..n {{ ... }} islands.
   * If the whole input is just one {{ ... }}, returns the raw evaluation result.
   * Otherwise, returns a string with islands replaced by their stringified results.
   */
  evaluateTemplate(input: string, ctx: ExpressionContext): any {
    if (!input) return '';

    const island = this.extractSingleIsland(input);
    if (island) {
      return this.evalJs(island, ctx);
    }

    // Mixed template → replace {{ ... }} with stringified results
    return input.replace(/\{\{([\s\S]*?)\}\}/g, (_m, code) => {
      try { return this.stringify(this.evalJs(code, ctx)); } catch { return '⟂'; }
    });
  }

  private extractSingleIsland(s: string): string | null {
    const m = s.match(/^\s*\{\{([\s\S]*?)\}\}\s*$/);
    return m ? m[1] : null;
  }

  private stringify(v: any): string {
    if (v == null) return '' + v;
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  }

  /**
   * Minimal sandbox: creates a function with named params matching context keys.
   * Example: new Function('$json','$env', 'return ( ... )')
   */
  private evalJs(code: string, ctx: ExpressionContext): any {
    const names = Object.keys(ctx);
    const values = names.map(k => (ctx as any)[k]);
    // Provide a few safe builtins
    const SAFE = { Math, Date, JSON, Number, String, Boolean, Array, Object }; // no window/document
    const fn = new Function(...names, 'SAFE', `"use strict"; return ( ${code} );`);
    return fn(...values, SAFE);
  }

  /** Returns true if a single {{ ... }} island code is evaluable without error */
  isValidIsland(code: string, ctx: ExpressionContext): boolean {
    try { void this.evalJs(code, ctx); return true; } catch { return false; }
  }

  /** Return true if all islands in a template are evaluable */
  validateTemplate(input: string, ctx: ExpressionContext): boolean {
    if (!input) return true;
    const re = /\{\{([\s\S]*?)\}\}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(input))) {
      if (!this.isValidIsland(m[1], ctx)) return false;
    }
    return true;
  }
}
