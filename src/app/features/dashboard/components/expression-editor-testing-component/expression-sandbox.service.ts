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

    const safeCtx = this.normalizeContext(ctx);
    const single = this.extractSingleIsland(input);
    if (single) {
      try { return this.stringify(this.evalJs(single, safeCtx)); } catch { return ''; }
    }
    const islands = this.findIslands(input);
    if (islands.length === 0) return input;
    let out = '';
    let cursor = 0;
    for (const isl of islands) {
      out += input.slice(cursor, isl.start);
      try { out += this.stringify(this.evalJs(isl.code, safeCtx)); }
      catch { out += input.slice(isl.start, isl.end); }
      cursor = isl.end;
    }
    out += input.slice(cursor);
    return out;
  }

  /** Detailed evaluation returning final text and per-island errors (if any) */
  evaluateTemplateDetailed(input: string, ctx: ExpressionContext): { text: string; errors: { index: number; code: string; message: string }[] } {
    const errors: { index: number; code: string; message: string }[] = [];
    if (!input) return { text: '', errors };
    const safeCtx = this.normalizeContext(ctx);
    const single = this.extractSingleIsland(input);
    if (single != null) {
      try { return { text: this.stringify(this.evalJs(single, safeCtx)), errors }; }
      catch (e: any) { errors.push({ index: 0, code: single, message: String(e?.message || e) }); return { text: input, errors }; }
    }
    const islands = this.findIslands(input);
    if (!islands.length) return { text: input, errors };
    let out = '';
    let cursor = 0; let i = 0;
    for (const isl of islands) {
      out += input.slice(cursor, isl.start);
      try { out += this.stringify(this.evalJs(isl.code, safeCtx)); }
      catch (e: any) { errors.push({ index: i, code: isl.code, message: String(e?.message || e) }); out += input.slice(isl.start, isl.end); }
      cursor = isl.end;
      i++;
    }
    out += input.slice(cursor);
    return { text: out, errors };
  }

  private extractSingleIsland(s: string): string | null {
    const trimmed = String(s || '').trim();
    const islands = this.findIslands(trimmed);
    if (islands.length !== 1) return null;
    const only = islands[0];
    if (only.start === 0 && only.end === trimmed.length) return only.code;
    return null;
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
    const { ok, error } = this.isSafeExpression(code);
    if (!ok) throw new Error(error || 'Unsafe expression');
    const names = Object.keys(ctx);
    const values = names.map(k => (ctx as any)[k]);
    // Provide safe builtins only via SAFE, and destructure them explicitly
    const SAFE = { Math, Date, JSON, Number, String, Boolean, Array, Object };
    const prelude = '"use strict"; const { Math, Date, JSON, Number, String, Boolean, Array, Object } = SAFE;';
    const fn = new Function(...names, 'SAFE', `${prelude} return ( ${code} );`);
    return fn(...values, SAFE);
  }

  /** Returns true if a single {{ ... }} island code is evaluable without error */
  isValidIsland(code: string, ctx: ExpressionContext): boolean {
    try { void this.evalJs(code, this.normalizeContext(ctx)); return true; } catch { return false; }
  }

  /** Return true if all islands in a template are evaluable */
  validateTemplate(input: string, ctx: ExpressionContext): boolean {
    if (!input) return true;
    const safeCtx = this.normalizeContext(ctx);
    for (const isl of this.findIslands(input)) {
      if (!this.isValidIsland(isl.code, safeCtx)) return false;
    }
    return true;
  }

  /**
   * Normalize context to be compatible with frontend/backends that use both
   * prefixed ($json) and unprefixed (json) keys.
   */
  private normalizeContext(ctx: ExpressionContext): ExpressionContext {
    const out: ExpressionContext = { ...ctx };
    const pairs: [string, string][] = [ ['json', '$json'], ['env', '$env'], ['node', '$node'], ['now', '$now'] ];
    for (const [a, b] of pairs) {
      if (out[a] != null && out[b] == null) out[b] = out[a];
      if (out[b] != null && out[a] == null) out[a] = out[b];
    }
    // Deep-freeze objects to avoid accidental mutation
    for (const k of Object.keys(out)) {
      if (out[k] && typeof out[k] === 'object') this.deepFreeze(out[k]);
    }
    return out;
  }

  private deepFreeze<T extends object>(obj: T): T {
    try {
      Object.freeze(obj);
      Object.getOwnPropertyNames(obj).forEach(prop => {
        const v: any = (obj as any)[prop];
        if (v && (typeof v === 'object' || typeof v === 'function') && !Object.isFrozen(v)) this.deepFreeze(v);
      });
    } catch {}
    return obj;
  }

  /** Basic safety gate: disallow statements and dangerous globals; allow expressions only */
  private isSafeExpression(code: string): { ok: boolean; error?: string } {
    const s = String(code || '').trim();
    if (!s) return { ok: true };
    // Disallow semicolons and control statements to keep it an expression
    const banned = /(\bfunction\b|\bclass\b|\bwhile\b|\bfor\b|\btry\b|\bcatch\b|\bimport\b|\bexport\b|\bawait\b|\byield\b|;)/;
    if (banned.test(s)) return { ok: false, error: 'Only expressions are allowed' };
    // Allow `new Date(...)` but ban other `new` usages
    if (/\bnew\b/.test(s) && !/\bnew\s+Date\s*\(/.test(s)) return { ok: false, error: 'Disallowed constructor' };
    // Disallow dangerous identifiers
    const globals = /(window|document|globalThis|Function|eval|XMLHttpRequest|fetch|WebSocket)/;
    if (globals.test(s)) return { ok: false, error: 'Disallowed identifier' };
    // Allow assignments only inside ternary branches? Keep simple: disallow bare assignment
    if (/(^|[^=!<>]|\()=([^=]|$)/.test(s)) return { ok: false, error: 'Assignment not allowed' };
    return { ok: true };
  }

  private findIslands(input: string): { start: number; end: number; code: string }[] {
    const s = String(input || '');
    const out: { start: number; end: number; code: string }[] = [];
    for (let i = 0; i < s.length - 1; ) {
      if (s[i] === '{' && s[i + 1] === '{') {
        const start = i;
        i += 2;
        let endIdx = -1;
        for (let j = i; j < s.length - 1; j++) {
          if (s[j] === '}' && s[j + 1] === '}') { endIdx = j; break; }
        }
        if (endIdx === -1) break; // unmatched, stop
        const code = s.slice(i, endIdx);
        out.push({ start, end: endIdx + 2, code });
        i = endIdx + 2;
      } else {
        i++;
      }
    }
    return out;
  }
}
