import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { FormGroup } from '@angular/forms';
import { SectionConfig, FieldConfig, FormUI, DynamicFormService } from '../../dynamic-form.service';
import { Fields } from '../fields/fields';

@Component({
  selector: 'df-section',
  standalone: true,
  imports: [CommonModule, NzGridModule, Fields],
  templateUrl: './sections.html',
  styleUrl: './sections.scss'
})
export class Sections {
  @Input({ required: true }) section!: SectionConfig;
  @Input({ required: true }) form!: FormGroup;
  @Input() ui?: FormUI;
  @Input() editMode = false;
  @Input() selectedField: FieldConfig | null = null;
  @Input() allowMove = true;
  @Input() allowDelete = true;
  @Output() moveField = new EventEmitter<{ index: number; dir: 'up'|'down' }>();
  @Output() deleteField = new EventEmitter<{ index: number }>();
  @Output() selectField = new EventEmitter<{ index: number }>();

  constructor(public dfs: DynamicFormService) {}
  get visible() { return this.dfs.isSectionVisible(this.section, this.form); }
  isSelected(f: FieldConfig) { return this.selectedField === f; }

  onClickField(index: number, ev: MouseEvent) {
    if (!this.editMode) return;
    this.selectField.emit({ index });
    ev.stopPropagation();
  }

}
