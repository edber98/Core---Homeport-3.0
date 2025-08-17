import { Injectable } from '@angular/core';
import { UiNode, UiTag } from '../ui-model.service';
import { UiClassStyleService, UiState } from './ui-class-style.service';
import { UiBreakpointsService, UiBreakpoint } from './ui-breakpoints.service';
import { UiTokensService } from './ui-tokens.service';

@Injectable({ providedIn: 'root' })
export class UiHtmlIoService {
  private lastBodyStyle: Record<string,string> | null = null;
  private currentDoc: Document | null = null;
  private uidCounter = 0;
  private inlineBase = new Map<string, Record<string,string>>();
  private inlineBp = new Map<string, Map<string, Record<string,string>>>();
  private addClasses = new Map<string, Set<string>>();
  private selectorClass = new Map<string, string>();
  constructor(private cls: UiClassStyleService, private bpSvc: UiBreakpointsService, private tokens: UiTokensService) {}

  importHtml(html: string): UiNode {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html || '<div></div>', 'text/html');
    const body = doc.body || doc.documentElement;
    // annotate DOM so we can map selector matches to nodes
    this.uidCounter = 0; this.inlineBase.clear(); this.inlineBp.clear(); this.addClasses.clear(); this.selectorClass.clear(); this.lastBodyStyle = null;
    this.annotateDom(body);
    try { this.importStylesFromStyleTags(doc); } catch {}
    const toNode = (el: Element): UiNode => {
      const tag = (el.tagName || 'div').toLowerCase() as UiTag;
      const attrs: Record<string,string> = {};
      // Copy all attributes except class/style (managed separately)
      const names = (el.getAttributeNames ? el.getAttributeNames() : []) as string[];
      names.forEach(n => { if (n !== 'class' && n !== 'style' && n !== 'data-ui-uid') { const v = el.getAttribute(n); if (v != null) attrs[n] = v; } });
      const style: Record<string,string> = {};
      const styleAttr = el.getAttribute('style') || '';
      styleAttr.split(';').forEach(pair => {
        const [k, v] = pair.split(':');
        if (k && v) style[k.trim()] = v.trim();
      });
      const classes = Array.from(el.classList || []).map(c => String(c));
      // add synthetic classes from selector mapping
      const uid = el.getAttribute('data-ui-uid') || '';
      const extra = this.addClasses.get(uid);
      if (extra) extra.forEach(c => classes.push(c));
      // Ensure classes exist in manager
      classes.forEach(c => this.cls.ensure(c));
      // merge pending inline base styles
      const pend = this.inlineBase.get(uid);
      if (pend) Object.assign(style, pend);
      const node: UiNode = { id: this.genId(tag), tag, attrs, classes, style, children: [] };
      // merge pending inline breakpoint styles
      const mapBp = this.inlineBp.get(uid);
      if (mapBp) {
        const styleBp: any = {};
        mapBp.forEach((st, bp) => { styleBp[bp] = { ...(styleBp[bp] || {}), ...st }; });
        (node as any).styleBp = styleBp;
      }
      // Iterate childNodes to support mixed text + elements
      const children: UiNode[] = [];
      const cn = (el.childNodes || []) as any;
      for (let i = 0; i < cn.length; i++) {
        const child = cn[i];
        if (child.nodeType === 3) { // text node
          const raw = String(child.nodeValue || '');
          if (raw.trim().length) {
            children.push({ id: this.genId('#text'), tag: '#text', text: raw, children: [] });
          }
        } else if (child.nodeType === 1) { // element
          children.push(toNode(child as Element));
        }
      }
      node.children = children;
      return node;
    };
    // Wrap all body children under a root container div
    const root: UiNode = { id: 'root', tag: 'div', classes: ['ui-root'], style: {}, children: [] };
    root.children = Array.from(body.children || []).map(el => toNode(el));
    if (this.lastBodyStyle) {
      root.style = { ...(root.style || {}), ...(this.lastBodyStyle as Record<string,string>) };
    }
    return root;
  }

  exportHtml(root: UiNode): string {
    const esc = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    const toHtml = (n: UiNode): string => {
      if (n.tag === '#text') {
        const t = (n.text || '');
        return esc(t);
      }
      const tag = n.tag || 'div';
      const cls = (n.classes || []).join(' ');
      const id = n.attrs?.['id'] || '';
      const style = this.styleToString(n.style);
      const attrs: string[] = [];
      if (id) attrs.push(`id=\"${esc(id)}\"`);
      if (cls) attrs.push(`class=\"${esc(cls)}\"`);
      if (style) attrs.push(`style=\"${esc(style)}\"`);
      // other attributes
      const other = n.attrs || {};
      Object.keys(other).forEach(k => {
        if (k === 'id') return; if (k === 'class') return; if (k === 'style') return;
        const v = other[k];
        if (v != null && String(v).length) attrs.push(`${k}=\"${esc(String(v))}\"`);
      });
      const attrStr = attrs.length ? ' ' + attrs.join(' ') : '';
      const children = (n.children || []).map(c => toHtml(c)).join('');
      if (['img', 'input'].includes(tag)) return `<${tag}${attrStr}/>`;
      return `<${tag}${attrStr}>${children}</${tag}>`;
    };
    const style = this.buildStyleSheet();
    const bodyProxy = toHtml({ id: 'body-proxy', tag: 'div', classes: (root.classes||[]), style: (root.style||{}), children: root.children||[] });
    return `<!DOCTYPE html>\n<html lang=\"fr\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">${style ? `\n<style>\n${style}\n</style>`:''}</head><body>\n${bodyProxy}\n</body></html>`;
  }

  private buildStyleSheet(): string {
    const parts: string[] = [];
    // :root tokens
    const tks = (this as any).tokens?.tokens || {};
    const tkLines: string[] = [];
    Object.entries(tks).forEach(([k,v]) => tkLines.push(`${k}:${v}`));
    if (tkLines.length) parts.push(`:root{${tkLines.join(';')}}`);

    // body style (if captured)
    if ((this as any).lastBodyStyle && Object.keys((this as any).lastBodyStyle).length) {
      const b = this.decls((this as any).lastBodyStyle);
      if (b) parts.push(`body{${b}}`);
    }

    // Classes
    const classes = this.cls.list();
    const bpList = this.bpSvc.list;
    const states: UiState[] = ['base','hover','active','focus'];
    for (const c of classes) {
      const styles = (c.styles || {}) as any;
      for (const st of states) {
        const block = styles[st]; if (!block) continue;
        const base = block.base || {};
        const baseDecl = this.decls(base);
        if (baseDecl) parts.push(`.${c.name}${st==='base'?'':`:${st}`}{${baseDecl}}`);
        const bp = block.bp || {};
        Object.keys(bp).forEach(id => {
          const decl = this.decls(bp[id] || {}); if (!decl) return;
          const def = bpList.find(x => String(x.id) === String(id));
          const min = def?.min;
          if (min != null) parts.push(`@media (min-width:${min}px){.${c.name}${st==='base'?'':`:${st}`}{${decl}}}`);
          else parts.push(`.${c.name}${st==='base'?'':`:${st}`}{${decl}}`);
        });
      }
    }
    return parts.join('\n');
  }
  private decls(map: Record<string,string>): string { return Object.entries(map).map(([k,v]) => `${k}:${v}`).join(';'); }

  private styleToString(st?: Record<string,string>): string {
    const obj = st || {}; const parts: string[] = [];
    Object.keys(obj).forEach(k => { const v = obj[k]; if (v != null && v !== '') parts.push(`${k}: ${v}`); });
    return parts.join('; ');
  }
  private genId(tag: UiTag): string { return `${tag}_${Math.random().toString(36).slice(2,9)}`; }

  // === CSS <style> importer (basic) ===
  private importStylesFromStyleTags(doc: Document) {
    const styles = Array.from(doc.querySelectorAll('style')) as HTMLStyleElement[];
    const css = styles.map(s => s.textContent || '').join('\n');
    if (!css.trim()) return;
    this.currentDoc = doc;
    try { this.parseCssAndPopulateClasses(css); } finally { this.currentDoc = null; }
  }

  private parseCssAndPopulateClasses(css: string) {
    // Very simple parser: handles top-level rules and @media (min-width: Xpx)
    // Only supports class selectors like .btn or .btn.primary and optional :hover/:active/:focus
    const cleaned = css.replace(/\/\*[\s\S]*?\*\//g, '');
    let i = 0; const len = cleaned.length;
    while (i < len) {
      // Skip whitespace
      while (i < len && /\s/.test(cleaned[i])) i++;
      if (i >= len) break;
      if (cleaned.startsWith('@media', i)) {
        const start = i; const braceOpen = cleaned.indexOf('{', i);
        if (braceOpen < 0) break;
        const cond = cleaned.slice(i, braceOpen).trim();
        const braceClose = this.findMatchingBrace(cleaned, braceOpen);
        if (braceClose < 0) break;
        const inner = cleaned.slice(braceOpen + 1, braceClose);
        const bp = this.mapMediaToBreakpoint(cond);
        this.parseCssBlock(inner, bp);
        i = braceClose + 1; continue;
      }
      // Regular rule
      const selEnd = cleaned.indexOf('{', i); if (selEnd < 0) break;
      const sel = cleaned.slice(i, selEnd).trim();
      const blockEnd = this.findMatchingBrace(cleaned, selEnd);
      if (blockEnd < 0) break;
      const decl = cleaned.slice(selEnd + 1, blockEnd);
      this.applyRule(sel, decl, 'auto');
      i = blockEnd + 1;
    }
  }

  private parseCssBlock(block: string, bp: UiBreakpoint | 'auto') {
    // Split by closing braces at same nesting level
    let i = 0; const len = block.length;
    while (i < len) {
      while (i < len && /\s/.test(block[i])) i++;
      if (i >= len) break;
      const selEnd = block.indexOf('{', i); if (selEnd < 0) break;
      const sel = block.slice(i, selEnd).trim();
      const end = this.findMatchingBrace(block, selEnd); if (end < 0) break;
      const decl = block.slice(selEnd + 1, end);
      this.applyRule(sel, decl, bp);
      i = end + 1;
    }
  }

  private applyRule(selectorList: string, decl: string, bp: UiBreakpoint | 'auto') {
    const selectors = selectorList.split(',').map(s => s.trim()).filter(Boolean);
    const styles = this.parseDeclarations(decl);
    if (!Object.keys(styles).length) return;
    for (const sel of selectors) {
      if (sel === ':root') {
        // Promote CSS variables to tokens
        Object.keys(styles).forEach(k => { if (k.startsWith('--')) this.tokens.set(k, styles[k]); });
        continue;
      }
      if (/^body\b/i.test(sel)) {
        this.lastBodyStyle = { ...(this.lastBodyStyle || {}), ...styles };
        continue;
      }
      // Accept .class, .class1.class2, optionally with :hover/:active/:focus
      const m = sel.match(/^\.(?<names>[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*)(?::(?<state>hover|active|focus))?$/);
      if (m && m.groups) {
        const name = m.groups['names'];
        const state = (m.groups['state'] as UiState | undefined) || 'base';
        this.cls.setStyles(name, state, bp, styles);
        continue;
      }
      // Other selectors: inline or synthetic class applied to matched elements
      const sm = sel.match(/^(?<base>.*?)(?::(?<state>hover|active|focus))?$/);
      const state = (sm?.groups?.['state'] as UiState | undefined) || 'base';
      const baseSel = (sm?.groups?.['base'] || '').trim();
      if (!baseSel || !this.currentDoc) continue;
      let els: Element[] = [];
      try { els = Array.from(this.currentDoc.querySelectorAll(baseSel)); } catch { els = []; }
      if (!els.length) continue;
      if (state === 'base') {
        els.forEach(el => {
          const uid = el.getAttribute('data-ui-uid') || '';
          if (!uid) return;
          if (bp === 'auto') {
            const map = this.inlineBase.get(uid) || {}; Object.assign(map, styles); this.inlineBase.set(uid, map);
          } else {
            let m2 = this.inlineBp.get(uid); if (!m2) { m2 = new Map(); this.inlineBp.set(uid, m2); }
            const cur = m2.get(String(bp)) || {}; Object.assign(cur, styles); m2.set(String(bp), cur);
          }
        });
      } else {
        const sig = `${baseSel}|${state}|${bp}`;
        let cname = this.selectorClass.get(sig);
        if (!cname) { cname = `imp-${this.hash(sig)}`; this.selectorClass.set(sig, cname); }
        this.cls.setStyles(cname!, state, bp, styles);
        els.forEach(el => {
          const uid = el.getAttribute('data-ui-uid') || '';
          if (!uid) return;
          let set = this.addClasses.get(uid); if (!set) { set = new Set(); this.addClasses.set(uid, set); }
          set.add(cname!);
        });
      }
    }
  }

  private parseDeclarations(decl: string): Record<string,string> {
    const out: Record<string,string> = {};
    decl.split(';').forEach(pair => {
      const idx = pair.indexOf(':'); if (idx <= 0) return;
      const k = pair.slice(0, idx).trim();
      const v = pair.slice(idx + 1).trim();
      if (!k) return; if (!v) return;
      out[k] = v;
    });
    return out;
  }

  private findMatchingBrace(s: string, openIndex: number): number {
    let depth = 0;
    for (let j = openIndex; j < s.length; j++) {
      if (s[j] === '{') depth++;
      else if (s[j] === '}') { depth--; if (depth === 0) return j; }
    }
    return -1;
  }

  private mapMediaToBreakpoint(cond: string): UiBreakpoint | 'auto' {
    // Parses @media (min-width: Npx)
    const m = cond.match(/min-width\s*:\s*(\d+)px/i);
    if (!m) return 'auto';
    const px = Number(m[1]);
    // choose bp with min <= px and with highest min
    const list = this.bpSvc.list;
    let best: UiBreakpoint | 'auto' = 'auto'; let bestMin = -Infinity;
    for (const bp of list) {
      const min = bp.min ?? -Infinity;
      if (min <= px && min >= bestMin) { best = bp.id as UiBreakpoint; bestMin = min; }
    }
    return best;
  }

  private annotateDom(root: Element) {
    const walk = (el: Element) => {
      try { el.setAttribute('data-ui-uid', 'u' + (++this.uidCounter)); } catch {}
      Array.from(el.children || []).forEach(ch => walk(ch as Element));
    };
    walk(root);
  }
  private hash(s: string): string { let h=0; for (let i=0;i<s.length;i++){ h=((h<<5)-h)+s.charCodeAt(i); h|=0; } return Math.abs(h).toString(36); }
}
