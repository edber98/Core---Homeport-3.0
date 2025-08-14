import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { FormGroup } from '@angular/forms';
import { SectionConfig, FieldConfig, FormUI, DynamicFormService } from '../../dynamic-form.service';
import { Fields } from '../fields/fields';

@Component({
  selector: 'df-section',
  standalone: true,
  imports: [CommonModule, NzGridModule, NzButtonModule, NzDropDownModule, NzMenuModule, Fields],
  templateUrl: './sections.html',
  styleUrl: './sections.scss'
})
export class Sections {
  @Input({ required: true }) section!: SectionConfig;
  @Input({ required: true }) form!: FormGroup;
  @Input() ui?: FormUI;
  @Input() forceBp?: 'xs'|'sm'|'md'|'lg'|'xl';
  @Input() editMode = false;
  @Input() selectedField: FieldConfig | null = null;
  @Input() selectedSection: SectionConfig | null = null;
  @Input() allowMove = true;
  @Input() allowDelete = true;
  @Output() moveField = new EventEmitter<{ index: number; dir: 'up'|'down' }>();
  @Output() deleteField = new EventEmitter<{ index: number }>();
  @Output() selectField = new EventEmitter<{ index: number; field?: FieldConfig; section?: SectionConfig }>();
  // New: select this child section item and add typed field inside it
  @Output() selectSection = new EventEmitter<{ index: number; section: SectionConfig }>();
  @Output() addFieldTyped = new EventEmitter<{ index: number; type: string; path?: number[] }>();

  constructor(public dfs: DynamicFormService) {}
  get visible() { return this.dfs.isSectionVisible(this.section, this.form); }
  isSelected(f: FieldConfig) { return (f.type === 'section') ? (this.selectedSection === (f as any)) : (this.selectedField === f); }

  fieldSpanFor(field: FieldConfig, bp: 'xs'|'sm'|'md'|'lg'|'xl'): number {
    const spans = this.dfs.getFieldSpans(field) as any;
    switch (bp) {
      case 'xs': return spans.xs;
      case 'sm': return spans.sm;
      case 'md': return spans.md;
      case 'lg': return spans.lg;
      case 'xl': return spans.xl;
    }
  }
  fieldPercentFor(field: FieldConfig, bp: 'xs'|'sm'|'md'|'lg'|'xl'): number {
    const span = this.fieldSpanFor(field, bp);
    const clamped = Math.max(1, Math.min(24, Number(span) || 24));
    return clamped * 100 / 24;
  }

  onClickField(index: number, ev: MouseEvent) {
    if (!this.editMode) return;
    if (this.isInteractiveClick(ev)) return; // laisser l'input travailler
    const fld = (this.section.fields || [])[index];
    this.selectField.emit({ index, field: fld, section: this.section });
    ev.stopPropagation();
  }

  onInnerFieldClick(ev: MouseEvent) {
    if (!this.editMode) return;
    if (this.isInteractiveClick(ev)) ev.stopPropagation();
  }

  onClickSection(index: number, ev: MouseEvent) {
    if (!this.editMode) return;
    if (this.isInteractiveClick(ev)) return;
    const sec = (this.section.fields || [])[index] as any;
    if (sec && sec.type === 'section') this.selectSection.emit({ index, section: sec });
    ev.stopPropagation();
  }

  private isInteractiveClick(ev: MouseEvent): boolean {
    const target = ev.target as HTMLElement | null;
    const current = ev.currentTarget as HTMLElement | null;
    if (!target) return false;
    const isEditable = (el: HTMLElement) => (
      el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.tagName === 'BUTTON' ||
      el.isContentEditable || el.getAttribute('contenteditable') === 'true' ||
      /ant-select|ant-radio|ant-checkbox|ant-picker|ant-input|cm-editor/.test(el.className)
    );
    let el: HTMLElement | null = target;
    while (el && current && el !== current) {
      if (isEditable(el)) return true;
      el = el.parentElement;
    }
    return isEditable(target);
  }

}
