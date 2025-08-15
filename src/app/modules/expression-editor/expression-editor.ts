import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild, NgZone, ChangeDetectorRef, OnChanges, SimpleChanges, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { NzInputModule } from 'ng-zorro-antd/input';
import { FormsModule } from '@angular/forms';
import { EditorState, RangeSetBuilder, Compartment } from '@codemirror/state';
import { EditorView, Decoration, ViewPlugin, ViewUpdate, keymap } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { ExpressionSandboxService } from '../../features/dashboard/components/expression-editor-testing-component/expression-sandbox.service';

type Context = Record<string, any>;

@Component({
  standalone: true,
  selector: 'app-expression-editor',
  imports: [CommonModule, FormsModule, NzPopoverModule, NzInputModule],
  templateUrl: './expression-editor.html',
  styleUrl: './expression-editor.scss',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ExpressionEditorComponent), multi: true }
  ]
})
export class ExpressionEditorComponent implements OnInit, OnDestroy, OnChanges, ControlValueAccessor {
  @Input() value = '';
  @Output() valueChange = new EventEmitter<string>();
  @Input() context: Context = { $json: {}, $env: {}, $node: {}, $now: new Date() };
  @Input() inline = true;
  @Input() errorMode = false;
  @Input() showPreview = true;
  // Controls whether preview shows error details; highlights remain unchanged
  @Input() showPreviewErrors = true;
  @Input() showFormulaAction = true;
  @Input() formulaTitle = 'Ouvrir l\'éditeur d\'expression';
  @Output() formulaClick = new EventEmitter<void>();

  @ViewChild('host', { static: false }) hostRef!: ElementRef<HTMLDivElement>;
  @ViewChild('cm', { static: false }) cmRef!: ElementRef<HTMLDivElement>;
  @ViewChild('menu', { static: false }) menuRef?: ElementRef<HTMLDivElement>;
  @ViewChild('list', { static: false }) listRef?: ElementRef<HTMLUListElement>;
  @ViewChild('originEl', { static: false }) originRef?: ElementRef<HTMLElement>;

  view!: EditorView;
  private editableCompartment = new Compartment();
  private suppressChange = false;
  private _disabled = false;
  // drag preview caret
  dragCaretVisible = false;
  dragCaretLeft = 0;
  dragCaretTop = 0;
  dragCaretHeight = 18;
  private dropProcessing = false;
  // suggestion state
  showMenu = false;
  popoverPlacement: 'bottomLeft'|'bottom'|'bottomRight'|'topLeft'|'top'|'topRight' = 'bottomLeft';
  originTop = 0;
  originLeft = 0;
  sections: { title: string; items: SuggestItem[] }[] = [];
  selIndex = 0;
  options: SuggestItem[] = [];
  // info panel content (rendered inside popover)
  infoTitle = '';
  infoBody = '';
  // flattened entries for rendering selection accurately
  get entries(): MenuEntry[] {
    const out: MenuEntry[] = [];
    let itemIndex = 0;
    for (const s of this.sections) {
      out.push({ kind: 'header', title: s.title } as MenuEntry);
      for (const it of s.items) out.push({ kind: 'item', item: it, itemIndex: itemIndex++ } as MenuEntry);
    }
    return out;
  }

  constructor(private sandbox: ExpressionSandboxService, private zone: NgZone, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {}
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] || changes['context']) this.updatePreview();
  }
  ngOnDestroy(): void {
    try { this.cmRef?.nativeElement?.removeEventListener('keydown', this.keyCapture, true); } catch {}
    this.view?.destroy();
  }

  // ControlValueAccessor
  private onChange: (val: any) => void = () => {};
  private onTouched: () => void = () => {};
  writeValue(val: any): void {
    const next = val == null ? '' : String(val);
    this.value = next;
    if (this.view) {
      const cur = this.view.state.doc.toString();
      if (cur !== next) {
        this.suppressChange = true;
        this.view.dispatch({ changes: { from: 0, to: cur.length, insert: next } });
        this.suppressChange = false;
      }
    }
    // Ensure preview is computed when value is set by the parent form
    this.updatePreview();
  }
  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void {
    this._disabled = !!isDisabled;
    if (this.view) this.view.dispatch({ effects: this.editableCompartment.reconfigure(EditorView.editable.of(!this._disabled)) });
  }

  ngAfterViewInit() {
    // Defer initialization until view children are available
    setTimeout(() => this.initEditorDom(), 0);
  }

  private initEditorDom() {
    if (!this.cmRef?.nativeElement || !this.hostRef?.nativeElement) {
      // If view is not ready yet (conditional template), retry next tick
      setTimeout(() => this.initEditorDom(), 0);
      return;
    }
    this.mount();
    // After mounting, recompute preview once in case value was set earlier
    this.updatePreview();
    // Capture key events on the CodeMirror host (capture + non-passive)
    this.cmRef.nativeElement.addEventListener('keydown', this.keyCapture, { capture: true, passive: false });
    // Drag & drop support for external tags
    const host = this.cmRef.nativeElement;
    const onDragOver = (e: DragEvent) => {
      if (!e.dataTransfer) return;
      if (e.dataTransfer.types.includes('application/x-expression-tag') || e.dataTransfer.types.includes('text/plain')) {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation(); (e as any).stopImmediatePropagation?.();
        e.dataTransfer.dropEffect = 'copy';
        const pos = this.view.posAtCoords({ x: e.clientX, y: e.clientY });
        if (pos != null) {
          this.view.focus();
          this.view.dispatch({ selection: { anchor: pos } });
          this.ensureCaretVisible();
          this.updateDragCaret(pos);
        }
      }
    };
    const onDrop = (e: DragEvent) => {
      if (!e.dataTransfer) return;
      if (this.dropProcessing) { e.preventDefault(); return; }
      this.dropProcessing = true;
      const raw = e.dataTransfer.getData('application/x-expression-tag') || e.dataTransfer.getData('text/plain');
      if (!raw) return;
      try {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation(); (e as any).stopImmediatePropagation?.();
        const data = safeParseTag(raw);
        const pos = this.view.posAtCoords({ x: e.clientX, y: e.clientY });
        const insertAt = pos != null ? pos : this.view.state.selection.main.head;
        this.insertTagAt(data, insertAt);
        this.hideDragCaret();
      } catch {}
      setTimeout(() => { this.dropProcessing = false; }, 0);
    };
    host.addEventListener('dragover', onDragOver, { capture: true });
    host.addEventListener('drop', onDrop, { capture: true });
    host.addEventListener('dragleave', () => { this.hideDragCaret(); }, { capture: true });
  }

  private keyCapture = (event: KeyboardEvent) => {
    if (!this.showMenu) return;
    const k = event.key;
    const stopAll = () => { if (event.cancelable) event.preventDefault(); event.stopPropagation(); (event as any).stopImmediatePropagation?.(); };
    if (k === 'ArrowDown') { stopAll(); this.moveSel(1); this.cdr.detectChanges(); }
    else if (k === 'ArrowUp') { stopAll(); this.moveSel(-1); this.cdr.detectChanges(); }
    else if (k === 'Tab' || k === 'Enter') { stopAll(); this.acceptSelected(this.view); this.cdr.detectChanges(); }
    else if ((event.ctrlKey || event.metaKey) && k === ' ') { stopAll(); this.closeMenu(); }
  };

  private mount() {
    const self = this;

    const highlighter = ViewPlugin.fromClass(class {
      deco: any;
      constructor(view: EditorView) { this.deco = this.build(view); }
      update(u: ViewUpdate) { if (u.docChanged || u.viewportChanged) this.deco = this.build(u.view); }
      build(view: EditorView) {
        const b = new RangeSetBuilder<any>();
        for (const { from, to } of view.visibleRanges) {
          const text = view.state.doc.sliceString(from, to);
          const opens: number[] = [];
          for (let i = 0; i < text.length - 1; i++) {
            const two = text.slice(i, i + 2);
            if (two === '{{') { opens.push(from + i); i++; }
            else if (two === '}}' && opens.length) {
              const a = opens.pop()!; const bto = from + i + 2;
              const inner = view.state.doc.sliceString(a + 2, bto - 2);
              let cls = 'cm-expr';
              const trimmed = inner.trim();
              const incomplete = trimmed.endsWith('.');
              if (!incomplete) {
                try {
                  const ok = self.sandbox.isValidIsland(inner, self.context);
                  if (!ok) cls = 'cm-expr-invalid';
                  else if (self.errorMode) cls = 'cm-expr-valid';
                } catch { cls = 'cm-expr-invalid'; }
              } else {
                cls = 'cm-expr-pending';
              }
              b.add(a, bto, Decoration.mark({ class: cls }));
              i++;
            }
          }
          for (const a of opens) b.add(a, to, Decoration.mark({ class: 'cm-expr-pending' }));
        }
        // @ts-ignore
        return b.finish();
      }
    }, { decorations: v => v.deco });

    this.view = new EditorView({
      parent: this.cmRef.nativeElement,
      state: EditorState.create({
        doc: this.value,
        extensions: [
          this.editableCompartment.of(EditorView.editable.of(!this._disabled)),
          // Put our key bindings before defaults to ensure they fire
          keymap.of([
            { key: 'Tab', preventDefault: true, run: (v) => this.acceptSelected(v) },
            { key: 'Enter', preventDefault: true, run: (v) => this.acceptSelected(v) },
            { key: 'Escape', run: () => { this.closeMenu(); return true; } },
            { key: 'ArrowDown', run: () => { this.moveSel(1); return true; } },
            { key: 'ArrowUp', run: () => { this.moveSel(-1); return true; } },
            { key: 'Ctrl-Space', run: (v) => { if (this.showMenu) { this.closeMenu(); return true; } this.updateSuggestions(v); return true; } },
            { key: 'Mod-Space', run: (v) => { if (this.showMenu) { this.closeMenu(); return true; } this.updateSuggestions(v); return true; } },
            ...defaultKeymap, ...historyKeymap,
          ]),
          history(),
          // Hard intercept keys when menu is open (Monaco-like behavior)
          EditorView.domEventHandlers({
            keydown: (event, view) => {
              if (!this.showMenu) return false;
              const k = event.key;
              if (k === 'ArrowDown') { event.preventDefault(); event.stopPropagation(); (event as any).stopImmediatePropagation?.(); this.moveSel(1); return true; }
              if (k === 'ArrowUp') { event.preventDefault(); event.stopPropagation(); (event as any).stopImmediatePropagation?.(); this.moveSel(-1); return true; }
              if (k === 'Tab' || k === 'Enter') { event.preventDefault(); event.stopPropagation(); (event as any).stopImmediatePropagation?.(); this.acceptSelected(view); return true; }
              if ((event.ctrlKey || event.metaKey) && k === ' ') { event.preventDefault(); event.stopPropagation(); (event as any).stopImmediatePropagation?.(); this.closeMenu(); return true; }
              return false;
            },
            dragover: (event, view) => {
              const dt = (event as DragEvent).dataTransfer;
              if (!dt) return false;
              if (dt.types.includes('application/x-expression-tag') || dt.types.includes('text/plain')) {
                if (event.cancelable) event.preventDefault();
                event.stopPropagation(); (event as any).stopImmediatePropagation?.();
                const pos = view.posAtCoords({ x: (event as DragEvent).clientX, y: (event as DragEvent).clientY });
                if (pos != null) {
                  view.dispatch({ selection: { anchor: pos } });
                  this.ensureCaretVisible();
                  this.updateDragCaret(pos);
                }
                return true;
              }
              return false;
            },
            drop: (event, view) => {
              const dt = (event as DragEvent).dataTransfer;
              if (!dt) return false;
              if (dt.types.includes('application/x-expression-tag') || dt.types.includes('text/plain')) {
                if (this.dropProcessing) { if (event.cancelable) event.preventDefault(); return true; }
                this.dropProcessing = true;
                const raw = dt.getData('application/x-expression-tag') || dt.getData('text/plain');
                if (!raw) return true;
                try {
                  if (event.cancelable) event.preventDefault();
                  event.stopPropagation(); (event as any).stopImmediatePropagation?.();
                  const data = safeParseTag(raw);
                  const pos = view.posAtCoords({ x: (event as DragEvent).clientX, y: (event as DragEvent).clientY });
                  const insertAt = pos != null ? pos : view.state.selection.main.head;
                  this.insertTagAt(data, insertAt);
                  this.hideDragCaret();
                } catch {}
                setTimeout(() => { this.dropProcessing = false; }, 0);
                return true;
              }
              return false;
            },
            blur: () => { this.onTouched(); return false; }
          }),
          EditorView.updateListener.of(u => this.onUpdate(u)),
          highlighter,
          EditorView.theme({
            '&': { fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial', fontSize: '13px' },
            // Move padding from content to scroller so left gap stays visible while scrolling
            '.cm-content': { padding: '6px 0px' },
            '.cm-scroller': { overflow: 'auto' },
            '.cm-line': {padding: 0 },
            '.cm-expr': { color: '#1677ff', fontWeight: '600' },
            '.cm-expr-valid': { color: '#52c41a', fontWeight: '600' },
            '.cm-expr-invalid': { color: '#ff4d4f', fontWeight: '600' },
            '.cm-expr-pending': { color: '#9ca3af', fontWeight: '600' },
          })
        ]
      })
    });
  }

  private onUpdate(u: ViewUpdate) {
    const pos = u.state.selection.main.head;
    if (u.docChanged) {
      this.value = u.state.doc.toString();
      if (!this.suppressChange) {
        this.valueChange.emit(this.value);
        this.onChange(this.value);
      }
      // live preview
      this.updatePreview();
      // Normalize when user types '}}'
      const head = pos;
      const prev2 = head >= 2 ? u.state.doc.sliceString(head - 2, head) : '';
      if (prev2 === '}}') this.normalizeAroundClose(head);
    }
    // Si le menu est ouvert, recalculer l'état et fermer si l'îlot n'existe plus (ex: "{{" devient "{")
    if (this.showMenu) this.updateSuggestions(u.view);
  }

  private updateSuggestions(view: EditorView) {
    const pos = view.state.selection.main.head;
    const doc = view.state.doc.toString();
    const island = findIsland(doc, pos);
    if (!island) { this.closeMenu(); return; }
    // Do not suggest if exactly on closing
    const next2 = doc.slice(pos, pos + 2);
    if (next2 === '}}') { this.closeMenu(); return; }

    // Determine token bounds
    let from = pos, to = pos;
    while (from > island.innerStart && /[A-Za-z0-9_.$\[\]]/.test(doc[from - 1])) from--;
    while (to < (island.innerEnd ?? pos) && /[A-Za-z0-9_.$\[\]]/.test(doc[to])) to++;
    const token = doc.slice(from, pos);
    const endsWithDot = token.endsWith('.');

    // Build sections
    const ctxRoots = Object.keys(this.context);
    if (!token) {
      this.zone.run(() => {
        const fields = ctxRoots.map(k => ({ label: k, insert: `${k}`, kind: 'field' } as SuggestItem));
        const opts = [...fields, ...suggestMethods(), ...otherMethods()];
        this.sections = [{ title: 'Fields', items: fields }];
        this.setOptions(opts, !this.showMenu);
      });
      this.openAtCaret(view);
      return;
    }

    // Parse path parts including bracket indices, normalize [n] to segment 'n'
    const parts = parsePathParts(token);
    const rawParts = parts;
    const root = rawParts[0];
    const matchingRoots = ctxRoots.filter(r => r.startsWith(root));
    if (!ctxRoots.includes(root)) {
      // Propose filtered roots only
      const roots = matchingRoots.map(k => ({ label: k, insert: `${k}`, kind: 'field' } as SuggestItem));
      if (roots.length) {
        this.zone.run(() => { this.sections = [{ title: 'Fields', items: roots }]; this.setOptions(roots, !this.showMenu); });
        this.openAtCaret(view, to);
      } else this.closeMenu();
      return;
    }

    // Traverse object for deep suggestions: if endsWithDot, traverse all parts; else traverse up to the parent of the current (partial) segment
    let target: any = (this.context as any)[root];
    const traverseParts = endsWithDot ? rawParts.slice(1) : (rawParts.length > 1 ? rawParts.slice(1, -1) : []);
    for (const p of traverseParts) target = target?.[p];
    const lastSep = Math.max(token.lastIndexOf('.'), token.lastIndexOf('['));
    const endsWithBracket = token.endsWith('[');
    const prefix = (endsWithDot || endsWithBracket) ? '' : (lastSep >= 0 ? token.slice(lastSep + 1) : token);
    const fields = objectKeys(target)
      .filter(k => !prefix || k.toLowerCase().startsWith(prefix.toLowerCase()))
      .map(k => {
        const v = target?.[k];
        const detail = Array.isArray(v) ? 'array' : typeof v;
        const insert = k; // do not auto-append '.'; user decides
        const isObject = (v && typeof v === 'object') || Array.isArray(v);
        return { label: k, detail, insert, kind: 'field', ...(isObject ? { isObject: true } : {}) } as any as SuggestItem;
      });

    // If the current target is an array, suggest index access [0]
    if (Array.isArray(target)) {
      const idxLabel = '[0]';
      if (!prefix || idxLabel.startsWith(prefix) || prefix === '0' || prefix === '[') {
        const v0 = target[0];
        fields.unshift({ label: idxLabel, insert: '[0]', detail: typeof v0, kind: 'field', ...(v0 && typeof v0 === 'object' ? { isObject: true } : {}) } as any);
      }
    }

    if (!fields.length) { this.closeMenu(); return; }
    this.zone.run(() => { this.sections = [{ title: 'Fields', items: fields }]; this.setOptions(fields, !this.showMenu); });
    // caret is at current pos; compute from where to replace prefix
    const fromSeg = prefix ? pos - prefix.length : pos;
    this.openAtCaret(view, fromSeg);
  }

  private openAtCaret(view: EditorView, atPos?: number) {
    const pos = atPos ?? view.state.selection.main.head;
    const rect = view.coordsAtPos(pos);
    if (rect) {
      this.zone.run(() => {
        this.computePlacement(rect as any);
        if (!this.showMenu) this.selIndex = 0;
        this.showMenu = true;
        view.focus();
      });
      this.cdr.detectChanges();
      requestAnimationFrame(() => {
        this.scrollSelectedIntoView();
        this.updateInfoPanel();
      });
    }
  }
  private closeMenu() { this.zone.run(() => { this.showMenu = false; this.sections = []; this.options = []; this.selIndex = 0; }); }
  moveSel(delta: number) {
    if (!this.showMenu) return;
    const n = this.options.length;
    if (!n) return;
    this.zone.run(() => { this.selIndex = (this.selIndex + delta + n) % n; this.cdr.detectChanges(); });
    requestAnimationFrame(() => { this.scrollSelectedIntoView(); this.updateInfoPanel(); });
  }
  private flatItems() { return this.options; }
  trackEntry = (_: number, e: MenuEntry) => e.kind === 'header' ? 'h:' + (e as any).title : 'i:' + (e as any).item.label;

  clickItem(it: SuggestItem) { this.acceptItem(this.view, it); }

  private acceptSelected(view: EditorView): boolean {
    if (!this.showMenu) return false;
    const items = this.options;
    if (!items.length) return false;
    const it = items[Math.max(0, Math.min(this.selIndex, items.length - 1))];
    return this.acceptItem(view, it);
  }

  private setOptions(next: SuggestItem[], resetIndex: boolean) {
    const same = this.options.length === next.length && this.options.every((o, i) => o.label === next[i].label && o.insert === next[i].insert);
    this.options = next;
    if (resetIndex || !same) this.selIndex = 0; else this.selIndex = Math.min(this.selIndex, this.options.length - 1);
    this.cdr.detectChanges();
    // Ensure the active option is visible after options update
    requestAnimationFrame(() => { this.scrollSelectedIntoView(); this.updateInfoPanel(); });
  }

  private scrollSelectedIntoView() {
    const list = this.listRef?.nativeElement ?? (this.menuRef?.nativeElement.querySelector('ul') as HTMLElement | null);
    if (!list) return;
    const items = Array.from(list.querySelectorAll('li[role="option"]')) as HTMLElement[];
    if (!items.length) return;
    const idx = Math.max(0, Math.min(this.selIndex, items.length - 1));
    const el = items[idx];
    if (!el) return;
    // Try native scrollIntoView within the list container first
    if (typeof (el as any).scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
    // Ensure visibility via manual scrollTop corrections
    const viewTop = list.scrollTop;
    const viewBottom = viewTop + list.clientHeight;
    const itemTop = el.offsetTop;
    const itemBottom = itemTop + el.offsetHeight;
    if (itemTop < viewTop) list.scrollTop = itemTop;
    else if (itemBottom > viewBottom) list.scrollTop = itemBottom - list.clientHeight;
  }

  private acceptItem(view: EditorView, it: SuggestItem): boolean {
    
    const pos = view.state.selection.main.head;
    const doc = view.state.doc.toString();
    const island = findIsland(doc, pos);
    if (!island) return false;
    // Determine token bounds (replace only current segment)
    let from = pos, to = pos;
    while (from > island.innerStart && /[A-Za-z0-9_.$\[\]]/.test(doc[from - 1])) from--;
    while (to < (island.innerEnd ?? pos) && /[A-Za-z0-9_.$\[\]]/.test(doc[to])) to++;
    const token = doc.slice(from, pos);
    const lastDot = token.lastIndexOf('.');
    const segFrom = lastDot >= 0 ? pos - (token.length - lastDot - 1) : from;

    // Replace current segment and place cursor at end of inserted text
    let newPos = segFrom + it.insert.length;
    view.dispatch({ changes: { from: segFrom, to: pos, insert: it.insert }, selection: { anchor: newPos } });

    // If selected item is an object, ensure a trailing '.' and keep menu open
    if ((it as any).isObject) {
      const charAfter = view.state.doc.sliceString(newPos, newPos + 1);
      if (charAfter !== '.') {
        view.dispatch({ changes: { from: newPos, to: newPos, insert: '.' }, selection: { anchor: newPos + 1 } });
        newPos = newPos + 1;
      }
      // First ensure the caret is visible in the host, then update suggestions
      this.ensureCaretVisible();
      requestAnimationFrame(() => { this.updateSuggestions(view); this.updateInfoPanel(); });
      return true;
    }

    // Non-object: ensure closing braces and normalize spacing with caret at end of inner
    {
      const currentDoc = view.state.doc.toString();
      const island2 = findIsland(currentDoc, newPos);
      const hasClosing = !!(island2 && island2.innerEnd != null);
      const ahead = view.state.doc.sliceString(newPos, newPos + 2);
      if (!hasClosing && ahead !== '}}') {
        view.dispatch({ changes: { from: newPos, to: newPos, insert: '}}' } });
        this.normalizeIslandAt(newPos + 2, 'endInner');
      } else {
        const posForClose = (ahead === '}}') ? (newPos + 2) : (island2?.innerEnd ? island2.innerEnd + 2 : newPos + 2);
        if (posForClose) this.normalizeIslandAt(posForClose, 'endInner');
      }
      this.ensureCaretVisible();
      this.closeMenu();
    }
    return true;
  }

  private computePlacement(caretRect: any) {
    const hostEl = this.hostRef.nativeElement;
    const hostRect = hostEl.getBoundingClientRect();
    const spaceBelow = window.innerHeight - caretRect.bottom;
    const spaceAbove = caretRect.top;
    // Only top or bottom, let NG Zorro handle horizontal clamping
    const bottom = spaceBelow >= spaceAbove;
    this.popoverPlacement = bottom ? 'bottom' : 'top';
    // Position the virtual origin at caret X (clamped within host's visible box) and at baseline Y
    const visibleX = caretRect.left - hostRect.left; // X within the visible host viewport
    const clampedX = Math.max(0, Math.min(visibleX, hostEl.clientWidth - 1));
    this.originLeft = clampedX;
    this.originTop = bottom ? (caretRect.bottom - hostRect.top) : (caretRect.top - hostRect.top);
  }

  private updateInfoPanel() {
    const sel = this.options[this.selIndex];
    if (!sel) { return; }
    this.infoTitle = sel.label;
    if ((sel as any).doc) this.infoBody = (sel as any).doc as string;
    else this.infoBody = sel.detail ? `Type: ${sel.detail}` : '';
    // placement recompute may be needed if content changed height; keep simple for now
  }

  private normalizeAroundClose(pos: number) {
    const doc = this.view.state.doc.toString();
    const closeStart = pos - 2;
    const openStart = doc.lastIndexOf('{{', closeStart);
    if (openStart < 0) return;
    const innerStart = openStart + 2;
    const innerEnd = closeStart;
    if (innerEnd < innerStart) return;
    const inner = doc.slice(innerStart, innerEnd).trim();
    const replacement = `{{ ${inner} }}`;
    const from = openStart;
    const to = closeStart + 2;
    if (doc.slice(from, to) !== replacement) {
      this.view.dispatch({ changes: { from, to, insert: replacement }, selection: { anchor: from + replacement.length } });
    }
  }

  /** Normalize spaces inside island around a given closing pos; mode controls caret placement */
  private normalizeIslandAt(pos: number, mode: 'endInner'|'beforeClose'|'afterClose') {
    const doc = this.view.state.doc.toString();
    const closeStart = pos - 2;
    const openStart = doc.lastIndexOf('{{', closeStart);
    if (openStart < 0) return;
    const innerStart = openStart + 2;
    const innerEnd = closeStart;
    if (innerEnd < innerStart) return;
    const inner = doc.slice(innerStart, innerEnd).trim();
    const replacement = `{{ ${inner} }}`;
    const from = openStart;
    const to = closeStart + 2;
    if (doc.slice(from, to) !== replacement) {
      const anchor = this.computeAnchor(from, replacement, inner.length, mode);
      this.view.dispatch({ changes: { from, to, insert: replacement }, selection: { anchor } });
    } else {
      const anchor = this.computeAnchor(from, replacement, inner.length, mode);
      this.view.dispatch({ selection: { anchor } });
    }
  }

  private computeAnchor(from: number, replacement: string, innerLen: number, mode: 'endInner'|'beforeClose'|'afterClose') {
    if (mode === 'beforeClose') return from + replacement.length - 2; // before '}}'
    if (mode === 'afterClose') return from + replacement.length; // after '}}'
    // endInner: after '{{ ' + inner
    return from + 3 + innerLen; // 2 braces + space + inner length
  }

  private ensureCaretVisible() {
    try {
      const scroller = this.cmRef.nativeElement.querySelector('.cm-scroller') as HTMLElement | null;
      if (!scroller) return;
      const pos = this.view.state.selection.main.head;
      const caret = this.view.coordsAtPos(pos);
      if (!caret) return;
      const margin = 24; // breathing room so caret isn't touching the edge
      const rect = scroller.getBoundingClientRect();
      const caretX = (caret.left - rect.left) + scroller.scrollLeft;
      const targetMin = Math.max(0, caretX - (scroller.clientWidth - margin));
      const targetMax = Math.max(0, caretX - margin);
      if (caret.right > rect.right - margin) {
        scroller.scrollTo({ left: targetMin, behavior: 'smooth' });
      } else if (caret.left < rect.left + margin) {
        scroller.scrollTo({ left: targetMax, behavior: 'smooth' });
      }
    } catch {}
  }

  private updateDragCaret(pos: number) {
    try {
      const cmHost = this.cmRef.nativeElement as HTMLElement;
      const caret = this.view.coordsAtPos(pos);
      if (!caret) return;
      const hostRect = cmHost.getBoundingClientRect();
      const top = Math.max(0, caret.top - hostRect.top);
      const bottom = Math.max(top + 14, caret.bottom - hostRect.top);
      this.zone.run(() => {
        this.dragCaretVisible = true;
        this.dragCaretLeft = Math.max(0, caret.left - hostRect.left);
        this.dragCaretTop = top;
        this.dragCaretHeight = bottom - top;
      });
      this.cdr.detectChanges();
    } catch {}
  }
  private hideDragCaret() {
    this.zone.run(() => { this.dragCaretVisible = false; });
    this.cdr.detectChanges();
  }

  /** Insert a dragged tag (e.g., { path: 'json.user.name', name: 'name' }) at a given document position */
  private insertTagAt(tag: { path: string; name?: string }, pos: number) {
    const doc = this.view.state.doc.toString();
    const island = findIsland(doc, pos);
    if (island) {
      // Inside an island: insert tag.path exactly at caret (no auto-dot)
      const insert = tag.path;
      this.view.dispatch({ changes: { from: pos, to: pos, insert }, selection: { anchor: pos + insert.length } });
      this.ensureCaretVisible();
      this.closeMenu();
    } else {
      // Outside: wrap the current token (if any) to avoid splitting like: json{{ json.id }}.id
      let from = pos, to = pos;
      const isPathChar = (ch: string) => /[A-Za-z0-9_.$\[\]]/.test(ch);
      while (from > 0 && isPathChar(doc[from - 1])) from--;
      while (to < doc.length && isPathChar(doc[to])) to++;
      const insert = `{{ ${tag.path} }}`;
      this.view.dispatch({ changes: { from, to, insert }, selection: { anchor: from + insert.length } });
      this.ensureCaretVisible();
    }
  }

  preview = '';
  private updatePreview() {
    try {
      const r = this.sandbox.evaluateTemplateDetailed(this.value || '', this.context);
      const suffix = (this.showPreviewErrors && r.errors.length) ? (`\nErrors:\n- ` + r.errors.map(e => e.message).join('\n- ')) : '';
      this.preview = r.text + suffix;
    } catch { this.preview = ''; }
  }

  onFormulaClick(e: MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    this.formulaClick.emit();
  }
}

function objectKeys(obj: any): string[] { return obj && typeof obj === 'object' ? Object.keys(obj) : []; }

function parsePathParts(token: string): string[] {
  // Convert bracket indices [n] to .n then split by '.' and remove empty segments
  if (!token) return [];
  const normalized = token.replace(/\[(\d+)\]/g, '.$1');
  return normalized.split('.').filter(s => s.length > 0);
}

function safeParseTag(raw: string): { path: string; name?: string } {
  try {
    const j = JSON.parse(raw);
    if (j && typeof j.path === 'string') return j;
  } catch {}
  // fallback: consider plain text as the path
  return { path: String(raw) };
}

function findIsland(doc: string, pos: number): { open: number; close?: number; innerStart: number; innerEnd?: number } | null {
  const before = doc.slice(0, pos);
  const open = before.lastIndexOf('{{');
  if (open < 0) return null;
  const closeBefore = before.lastIndexOf('}}');
  if (closeBefore > open) return null; // last open is already closed before pos
  const innerStart = open + 2;
  const after = doc.slice(innerStart);
  const closeAfter = after.indexOf('}}');
  const innerEnd = closeAfter >= 0 ? innerStart + closeAfter : undefined;
  return { open, innerStart, innerEnd } as any;
}

type SuggestItem = { label: string; detail?: string; insert: string; kind: 'field'|'method' };
type MenuEntry = { kind: 'header'; title: string } | { kind: 'item'; item: SuggestItem; itemIndex: number };

function suggestMethods(): SuggestItem[] {
  const names = ['keys', 'values', 'isEmpty', 'hasField'];
  return names.map(n => ({ label: `${n}()`, insert: `${n}()`, kind: 'method' }));
}
function otherMethods(): SuggestItem[] {
  const names = ['compact', 'isNotEmpty', 'keepFieldsContaining', 'removeField', 'removeFieldsContaining', 'toJsonString', 'urlEncode'];
  return names.map(n => ({ label: `${n}()`, insert: `${n}()`, kind: 'method' }));
}
