import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzTreeModule } from 'ng-zorro-antd/tree';
import { NzDropDownModule, NzContextMenuService, NzDropdownMenuComponent } from 'ng-zorro-antd/dropdown';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { FormsModule } from '@angular/forms';
import { MonacoJsonEditorComponent } from './monaco-json-editor.component';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzTabsModule } from 'ng-zorro-antd/tabs';

@Component({
  selector: 'df-context-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, NzCardModule, NzButtonModule, NzDividerModule, NzTreeModule, NzDropDownModule, NzMenuModule, NzInputModule, NzToolTipModule, NzTabsModule, MonacoJsonEditorComponent],
  templateUrl: './context-panel.component.html',
  styleUrls: ['./context-panel.component.scss']
})
export class ContextPanelComponent {
  @Input() treeNodes: any[] = [];
  @Input() treeSelectedKeys: string[] = [];
  @Input() stepsMode = false;
  @Input() canAddSectionBtn = true;
  @Input() canAddFieldBtn = true;
  @Input() json = '';
  @Input() activeTab: 'structure' | 'import' = 'structure';

  @Output() selectFormSettings = new EventEmitter<void>();
  @Output() addStep = new EventEmitter<void>();
  @Output() addSection = new EventEmitter<void>();
  @Output() addSectionArray = new EventEmitter<void>();
  @Output() addField = new EventEmitter<void>();

  @Output() treeDrop = new EventEmitter<any>();
  @Output() treeClick = new EventEmitter<string>();
  @Output() treeExpand = new EventEmitter<{ key: string; expanded: boolean }>();

  @Output() ctxAddStep = new EventEmitter<void>();
  @Output() ctxAddSectionRoot = new EventEmitter<void>();
  @Output() ctxAddFieldRoot = new EventEmitter<void>();
  @Output() ctxAddFieldRootTyped = new EventEmitter<{ type: string }>();
  @Output() ctxAddSectionRootArray = new EventEmitter<void>();

  @Output() ctxStepAddSection = new EventEmitter<{ key: string }>();
  @Output() ctxStepAddField = new EventEmitter<{ key: string }>();
  @Output() ctxStepAddFieldTyped = new EventEmitter<{ key: string; type: string }>();
  @Output() ctxStepDelete = new EventEmitter<{ key: string }>();
  @Output() ctxStepAddSectionArray = new EventEmitter<{ key: string }>();

  @Output() ctxSectionAddSection = new EventEmitter<{ key: string }>();
  @Output() ctxSectionAddField = new EventEmitter<{ key: string }>();
  @Output() ctxSectionAddFieldTyped = new EventEmitter<{ key: string; type: string }>();
  @Output() ctxSectionDelete = new EventEmitter<{ key: string }>();
  @Output() ctxSectionAddSectionArray = new EventEmitter<{ key: string }>();

  @Output() ctxFieldDelete = new EventEmitter<{ key: string }>();

  // New actions: duplicate and insert before/after
  @Output() ctxSectionDuplicate = new EventEmitter<{ key: string }>();
  @Output() ctxSectionInsertBefore = new EventEmitter<{ key: string }>();
  @Output() ctxSectionInsertAfter = new EventEmitter<{ key: string }>();
  @Output() ctxFieldDuplicate = new EventEmitter<{ key: string }>();
  @Output() ctxFieldInsertBefore = new EventEmitter<{ key: string }>();
  @Output() ctxFieldInsertAfter = new EventEmitter<{ key: string }>();

  @Output() jsonChange = new EventEmitter<string>();
  @Output() doImport = new EventEmitter<void>();
  @Output() doExport = new EventEmitter<void>();

  currentCtxKey: string | null = null;
  constructor(private dropdown: NzContextMenuService) {}

  iconForNode(node: any): string {
    const type = node?.origin?.type ?? node?.type;
    switch (type) {
      case 'root': return 'fa-solid fa-sliders';
      case 'step': return 'fa-solid fa-list-ol';
      case 'section': return 'fa-solid fa-layer-group';
      case 'section_array': return 'fa-solid fa-boxes-stacked';
      case 'text': return 'fa-solid fa-font';
      case 'textarea': return 'fa-solid fa-align-left';
      case 'number': return 'fa-solid fa-hashtag';
      case 'date': return 'fa-regular fa-calendar';
      case 'cron': return 'fa-regular fa-clock';
      case 'select': return 'fa-solid fa-caret-down';
      case 'radio': return 'fa-regular fa-circle-dot';
      case 'checkbox': return 'fa-regular fa-square-check';
      case 'email': return 'fa-solid fa-envelope';
      case 'tel': return 'fa-solid fa-phone';
      case 'color': return 'fa-solid fa-palette';
      case 'file': return 'fa-solid fa-file-arrow-up';
      case 'tags': return 'fa-solid fa-tags';
      case 'schema_builder': return 'fa-solid fa-table-columns';
      case 'textblock': return 'fa-solid fa-paragraph';
      default: return 'fa-solid fa-square-plus';
    }
  }

  onTreeClick(evt: any) {
    const key = evt?.node?.key as string | undefined;
    if (key) this.treeClick.emit(key);
  }
  onTreeDrop(evt: any) { this.treeDrop.emit(evt); }
  onTreeExpand(evt: any) {
    const key = evt?.node?.key as string | undefined;
    const expanded = !!evt?.node?.isExpanded;
    if (key) this.treeExpand.emit({ key, expanded });
  }

  openTreeMenu(event: MouseEvent, menu: NzDropdownMenuComponent, key: string) {
    event.preventDefault();
    event.stopPropagation();
    this.currentCtxKey = key;
    // Delay slightly to avoid conflicts with nz-tree internal handlers and DOM refresh
    setTimeout(() => this.dropdown.create(event, menu), 0);
  }

  // Root
  onCtxAddStep() { this.dropdown.close(); this.ctxAddStep.emit(); }
  onCtxAddFieldRoot() { this.dropdown.close(); this.ctxAddFieldRoot.emit(); }
  onCtxAddSectionRoot() { this.dropdown.close(); this.ctxAddSectionRoot.emit(); }
  onCtxAddFieldRootTyped(t: string) { this.dropdown.close(); this.ctxAddFieldRootTyped.emit({ type: t }); }
  onCtxAddSectionRootArray() { this.dropdown.close(); this.ctxAddSectionRootArray.emit(); }

  // Step
  onCtxStepAddSection() { this.dropdown.close(); if (this.currentCtxKey) this.ctxStepAddSection.emit({ key: this.currentCtxKey }); }
  onCtxStepAddField() { this.dropdown.close(); if (this.currentCtxKey) this.ctxStepAddField.emit({ key: this.currentCtxKey }); }
  onCtxStepAddFieldTyped(t: string) { this.dropdown.close(); if (this.currentCtxKey) this.ctxStepAddFieldTyped.emit({ key: this.currentCtxKey, type: t }); }
  onCtxStepDelete() { this.dropdown.close(); if (this.currentCtxKey) this.ctxStepDelete.emit({ key: this.currentCtxKey }); }
  onCtxStepAddSectionArray() { this.dropdown.close(); if (this.currentCtxKey) this.ctxStepAddSectionArray.emit({ key: this.currentCtxKey }); }

  // Section
  onCtxSectionAddSection() { this.dropdown.close(); if (this.currentCtxKey) this.ctxSectionAddSection.emit({ key: this.currentCtxKey }); }
  onCtxSectionAddField() { this.dropdown.close(); if (this.currentCtxKey) this.ctxSectionAddField.emit({ key: this.currentCtxKey }); }
  onCtxSectionAddFieldTyped(t: string) { this.dropdown.close(); if (this.currentCtxKey) this.ctxSectionAddFieldTyped.emit({ key: this.currentCtxKey, type: t }); }
  onCtxSectionDelete() { this.dropdown.close(); if (this.currentCtxKey) this.ctxSectionDelete.emit({ key: this.currentCtxKey }); }
  onCtxSectionAddSectionArray() { this.dropdown.close(); if (this.currentCtxKey) this.ctxSectionAddSectionArray.emit({ key: this.currentCtxKey }); }

  // Field
  onCtxFieldDelete() { this.dropdown.close(); if (this.currentCtxKey) this.ctxFieldDelete.emit({ key: this.currentCtxKey }); }

  // Duplicate/Insert helpers
  onCtxSectionDuplicate() { this.dropdown.close(); if (this.currentCtxKey) this.ctxSectionDuplicate.emit({ key: this.currentCtxKey }); }
  onCtxSectionInsertBefore() { this.dropdown.close(); if (this.currentCtxKey) this.ctxSectionInsertBefore.emit({ key: this.currentCtxKey }); }
  onCtxSectionInsertAfter() { this.dropdown.close(); if (this.currentCtxKey) this.ctxSectionInsertAfter.emit({ key: this.currentCtxKey }); }
  onCtxFieldDuplicate() { this.dropdown.close(); if (this.currentCtxKey) this.ctxFieldDuplicate.emit({ key: this.currentCtxKey }); }
  onCtxFieldInsertBefore() { this.dropdown.close(); if (this.currentCtxKey) this.ctxFieldInsertBefore.emit({ key: this.currentCtxKey }); }
  onCtxFieldInsertAfter() { this.dropdown.close(); if (this.currentCtxKey) this.ctxFieldInsertAfter.emit({ key: this.currentCtxKey }); }
}
