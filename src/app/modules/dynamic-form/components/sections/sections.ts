import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { FormGroup } from '@angular/forms';
import { SectionConfig, FieldConfig, FormUI, DynamicFormService } from '../../dynamic-form.service';
import { Fields } from '../fields/fields';

@Component({
  selector: 'df-section',
  imports: [CommonModule, NzGridModule, Fields],
  templateUrl: './sections.html',
  styleUrl: './sections.scss'
})
export class Sections {
  @Input({ required: true }) section!: SectionConfig;
  @Input({ required: true }) form!: FormGroup;
  @Input() ui?: FormUI;

  constructor(public dfs: DynamicFormService) {}
  get visible() { return this.dfs.isSectionVisible(this.section, this.form); }

}
