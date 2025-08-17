import { CommonModule } from '@angular/common';
import { Component, ChangeDetectorRef, NgZone } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UiModelService, UiNode, UiTag } from './ui-model.service';
import { UiRulesService } from './ui-rules.service';
import { UiHistoryService } from './ui-history.service';
import { UiPalettePanelComponent } from './palette/ui-palette-panel.component';
import { UiInspectorPanelComponent } from './inspector/ui-inspector-panel.component';
import { UiStylesPanelComponent } from './inspector/ui-styles-panel.component';
import { UiTreeNzPanelComponent } from './tree/ui-tree-nz-panel.component';
import { UiPreviewHostComponent } from './preview/ui-preview-host.component';
import { UiTopbarComponent } from './topbar/ui-topbar.component';
import { UiClassManagerComponent } from './classes/ui-class-manager.component';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { UiBreakpointsService } from './services/ui-breakpoints.service';
import { UiTokensService } from './services/ui-tokens.service';
import { UiClassStyleService } from './services/ui-class-style.service';
import { UiHtmlIoService } from './services/ui-html-io.service';

@Component({
  selector: 'ui-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, NzSelectModule, UiTopbarComponent, UiPalettePanelComponent, UiInspectorPanelComponent, UiStylesPanelComponent, UiTreeNzPanelComponent, UiClassManagerComponent, UiPreviewHostComponent],
  templateUrl: './ui-builder.component.html',
  styleUrl: './ui-builder.component.scss'
})
export class UiBuilderComponent {
  constructor(public model: UiModelService, private rules: UiRulesService, public history: UiHistoryService, private bpSvc: UiBreakpointsService, private tokens: UiTokensService, private clsSvc: UiClassStyleService, private htmlIo: UiHtmlIoService, private zone: NgZone, private cdr: ChangeDetectorRef) {
    this.history.reset(this.snapshot());
    try { this.tokens.applyToDocument(); } catch {}
  }

  elements = [
    { tag: 'div', label: 'Container' },
    { tag: 'section', label: 'Section' },
    { tag: 'grid', label: 'Grid' },
    { tag: 'flex', label: 'Flex Box' },
    { tag: 'stack', label: 'Stack' },
    { tag: 'spacer', label: 'Spacer' },
    { tag: 'h1', label: 'Heading 1' },
    { tag: 'h2', label: 'Heading 2' },
    { tag: 'p', label: 'Paragraph' },
    { tag: 'span', label: 'Span' },
    { tag: 'label', label: 'Label' },
    { tag: 'input', label: 'Input' },
    { tag: 'button', label: 'Button' },
    { tag: 'divider', label: 'Divider' },
    { tag: 'card', label: 'Card' },
    { tag: 'badge', label: 'Badge' },
    { tag: 'chip', label: 'Chip' },
    { tag: 'tabs', label: 'Tabs' },
    { tag: 'collapse', label: 'Collapse' },
    { tag: 'steps', label: 'Steps' },
    { tag: 'ul', label: 'List' },
    { tag: 'li', label: 'List Item' },
  ] as Array<{ tag: UiTag, label: string }>;

  add(tag: string) {
    const parentId = this.model.selected?.id || 'root';
    const parent = this.model.findById(parentId) || this.model.root;
    if (!this.rules.canNest(parent.tag as UiTag, tag as UiTag)) return;
    const n = this.model.addChild(parentId, tag as UiTag);
    this.model.select(n.id);
    this.push();
  }

  onPatch(p: Partial<UiNode>) { if (!this.model.selected) return; this.model.update(this.model.selected.id, p); this.push(); }
  onSelect(id: string) { this.model.select(id); }
  moveUp() { if (!this.model.selected) return; this.model.moveUp(this.model.selected.id); this.push(); }
  moveDown() { if (!this.model.selected) return; this.model.moveDown(this.model.selected.id); this.push(); }
  remove() { if (!this.model.selected) return; this.model.remove(this.model.selected.id); this.push(); }
  removeById(id: string) { this.model.remove(id); this.push(); }
  addInside(id: string) { this.model.select(id); }

  // Import/Export (JSON)
  importing = false;
  json = '';
  openImport() { this.importing = true; this.json = this.model.export(); }
  doImport() {
    try {
      const obj = JSON.parse(this.json || '{}');
      this.zone.run(() => {
        if (obj && obj.id && obj.tag) {
          // Backward compat: model-only import
          this.model.import(this.json);
        } else {
          // Project import
          const proj = obj || {};
          if (proj.model) { this.model.root = proj.model; }
          if (proj.classes) { (this.clsSvc as any).classes = proj.classes; }
          if (proj.tokens) { this.tokens.tokens = proj.tokens; this.tokens.applyToDocument(); }
          if (proj.breakpoints) { (this.bpSvc as any).list = proj.breakpoints; }
          this.model.version++; // trigger refresh
        }
        this.previewVersion++;
        try { this.cdr.detectChanges(); } catch {}
      });
    } catch { /* ignore */ }
    this.importing = false; this.push();
  }
  cancelImport() { this.importing = false; }
  private buildProject() {
    return {
      version: 1,
      model: this.model.root,
      classes: this.clsSvc.list(),
      tokens: this.tokens.tokens,
      breakpoints: this.bpSvc.list,
    };
  }
  doExport() {
    const data = JSON.stringify(this.buildProject(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = 'ui-project.json'; a.click(); URL.revokeObjectURL(url);
  }

  // HTML import/export
  onImportHtml(ev: Event) {
    const input = ev.target as HTMLInputElement; const file = input?.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const txt = String(reader.result || '');
      this.zone.run(() => {
        const root = this.htmlIo.importHtml(txt);
        this.model.root = root; this.model.version++;
        this.push();
        this.previewVersion++;
        try { this.cdr.detectChanges(); } catch {}
      });
    };
    reader.readAsText(file);
    input.value = '';
  }
  exportHtml() {
    const html = this.htmlIo.exportHtml(this.model.root);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = 'page.html'; a.click(); URL.revokeObjectURL(url);
  }
  refreshPreview() { this.previewVersion++; }

  // Preview breakpoints
  bp: 'auto'|'xs'|'sm'|'md'|'lg'|'xl' = 'auto';
  canvasWidth: number | null = null;
  device: 'desktop'|'tablet'|'mobile-portrait'|'mobile-landscape' = 'desktop';
  zoomPct = 100;
  showRulers = false; showGuides = false; showGrid = false;
  previewMode = false;
  previewState: 'base'|'hover'|'active'|'focus' = 'base';
  previewVersion = 0;
  onBpChange(v: any) {
    this.bp = v as any;
    this.bpSvc.setCurrent(this.bp);
    const map: any = { xs: 375, sm: 640, md: 768, lg: 1024, xl: 1280 };
    this.canvasWidth = this.bp === 'auto' ? null : (map[this.bp] || null);
  }
  onDeviceChange(d: any) { this.device = d as any; const map: any = { 'desktop': null, 'tablet': 768, 'mobile-portrait': 375, 'mobile-landscape': 812 }; this.canvasWidth = map[this.device] || null; }
  onZoomChange(p: number) { this.zoomPct = Math.max(25, Math.min(200, Number(p)||100)); }
  onPublish() { /* placeholder */ }
  openBreakpoints() { /* placeholder for manager modal */ }
  openDesignSystem() { /* placeholder for design tokens modal */ }

  // Class manager helpers to attach/detach classes on selection
  addClassToSelection(name: string) {
    const sel = this.model.selected; if (!sel) return;
    const set = new Set(sel.classes || []); set.add(name);
    this.model.update(sel.id, { classes: Array.from(set) });
  }
  removeClassFromSelection(name: string) {
    const sel = this.model.selected; if (!sel) return;
    const arr = (sel.classes || []).filter(c => c !== name);
    this.model.update(sel.id, { classes: arr });
  }

  // Undo/redo
  get canUndo() { return this.history.canUndo(); }
  get canRedo() { return this.history.canRedo(); }
  undo() { const s = this.history.undo(); if (s) { this.model.root = s.root; this.model.selectedId = s.selectedId; } }
  redo() { const s = this.history.redo(); if (s) { this.model.root = s.root; this.model.selectedId = s.selectedId; } }
  private push() { this.history.push(this.snapshot()); }
  private snapshot() { return { root: JSON.parse(JSON.stringify(this.model.root)), selectedId: this.model.selectedId }; }

  // Reorder siblings from tree DnD
  onReorder(e: { parentId: string | null; previousIndex: number; currentIndex: number }) {
    const pid = e.parentId || 'root';
    const parent = pid === this.model.root.id ? this.model.root : (this.model.findById(pid) || this.model.root);
    const arr = parent.children || [];
    if (e.previousIndex < 0 || e.previousIndex >= arr.length || e.currentIndex < 0 || e.currentIndex >= arr.length) return;
    const copy = [...arr];
    const [item] = copy.splice(e.previousIndex, 1);
    copy.splice(e.currentIndex, 0, item);
    parent.children = copy;
    this.push();
  }

  // Move from nz-tree (reparent or reorder)
  onMoveNode(e: { id: string; newParentId: string; index: number }) {
    this.model.moveToParent(e.id, e.newParentId, e.index);
    this.push();
  }
}
