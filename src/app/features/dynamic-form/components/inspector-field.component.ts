import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzColorPickerModule } from 'ng-zorro-antd/color-picker';
import { SpacingEditorComponent } from './spacing-editor.component';
import { JsonEditorComponent } from './json-editor.component';
import { MonacoJsonEditorComponent } from './monaco-json-editor.component';

@Component({
  selector: 'inspector-field',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NzFormModule, NzInputModule, NzSelectModule, NzInputNumberModule, NzDividerModule, NzSwitchModule, NzColorPickerModule, SpacingEditorComponent, JsonEditorComponent, MonacoJsonEditorComponent],
  template: `
    <div [formGroup]="group">
      <nz-form-item>
        <nz-form-label>Type</nz-form-label>
        <nz-form-control>
          <nz-select formControlName="type">
            <nz-option nzValue="text" nzLabel="text"></nz-option>
            <nz-option nzValue="textarea" nzLabel="textarea"></nz-option>
            <nz-option nzValue="number" nzLabel="number"></nz-option>
            <nz-option nzValue="date" nzLabel="date"></nz-option>
            <nz-option nzValue="select" nzLabel="select"></nz-option>
            <nz-option nzValue="radio" nzLabel="radio"></nz-option>
            <nz-option nzValue="checkbox" nzLabel="checkbox"></nz-option>
            <nz-option nzValue="textblock" nzLabel="textblock"></nz-option>
          </nz-select>
        </nz-form-control>
      </nz-form-item>

      <ng-container *ngIf="group.get('type')?.value !== 'textblock'">
        <nz-form-item>
          <nz-form-label>Key</nz-form-label>
          <nz-form-control><input nz-input formControlName="key"/></nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label>Label</nz-form-label>
          <nz-form-control><input nz-input formControlName="label"/></nz-form-control>
        </nz-form-item>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
          <nz-form-item>
            <nz-form-label>Label color</nz-form-label>
            <nz-form-control>
              <nz-color-picker formControlName="fld_labelColor"></nz-color-picker>
            </nz-form-control>
          </nz-form-item>
          <nz-form-item>
            <nz-form-label>Label fontSize</nz-form-label>
            <nz-form-control><nz-input-number formControlName="fld_labelFontSize" [nzMin]="8"></nz-input-number></nz-form-control>
          </nz-form-item>
        </div>
        <nz-form-item>
          <nz-form-label>Expression</nz-form-label>
          <nz-form-control>
            <nz-switch formControlName="expression_allow"></nz-switch>
          </nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label>Placeholder</nz-form-label>
          <nz-form-control><input nz-input formControlName="placeholder"/></nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label>Description</nz-form-label>
          <nz-form-control><textarea nz-input rows="2" formControlName="description"></textarea></nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label>Default</nz-form-label>
          <nz-form-control><input nz-input formControlName="default"/></nz-form-control>
        </nz-form-item>
        <nz-form-item *ngIf="group.get('type')?.value==='select' || group.get('type')?.value==='radio'">
          <nz-form-label>Options (JSON)</nz-form-label>
          <nz-form-control>
            <div style="display:flex; gap:6px; align-items:center;">
              <monaco-json-editor [value]="$any(group.controls['options'].value)" (valueChange)="group.get('options')?.setValue($event)" [height]="160" style="flex:1"></monaco-json-editor>
              <button nz-button nzSize="small" (click)="openOptions.emit(); $event.preventDefault(); $event.stopPropagation()">Builder…</button>
            </div>
          </nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label>validators (JSON)</nz-form-label>
          <nz-form-control>
            <monaco-json-editor [value]="$any(group.controls['validators'].value)" (valueChange)="group.get('validators')?.setValue($event)" [height]="180"></monaco-json-editor>
          </nz-form-control>
        </nz-form-item>

        <nz-divider nzText="Condition"></nz-divider>
        <nz-form-item>
          <nz-form-label>visibleIf (JSON)</nz-form-label>
          <nz-form-control>
            <div style="display:flex; gap:6px; align-items:center;">
              <monaco-json-editor [value]="$any(group.controls['visibleIf'].value)" (valueChange)="group.get('visibleIf')?.setValue($event)" [height]="160" style="flex:1"></monaco-json-editor>
              <button nz-button nzSize="small" (click)="openCondition.emit('visibleIf'); $event.preventDefault(); $event.stopPropagation()">Builder</button>
            </div>
          </nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label>requiredIf (JSON)</nz-form-label>
          <nz-form-control>
            <div style="display:flex; gap:6px; align-items:center;">
              <monaco-json-editor [value]="$any(group.controls['requiredIf'].value)" (valueChange)="group.get('requiredIf')?.setValue($event)" [height]="160" style="flex:1"></monaco-json-editor>
              <button nz-button nzSize="small" (click)="openCondition.emit('requiredIf'); $event.preventDefault(); $event.stopPropagation()">Builder</button>
            </div>
          </nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label>disabledIf (JSON)</nz-form-label>
          <nz-form-control>
            <div style="display:flex; gap:6px; align-items:center;">
              <monaco-json-editor [value]="$any(group.controls['disabledIf'].value)" (valueChange)="group.get('disabledIf')?.setValue($event)" [height]="160" style="flex:1"></monaco-json-editor>
              <button nz-button nzSize="small" (click)="openCondition.emit('disabledIf'); $event.preventDefault(); $event.stopPropagation()">Builder</button>
            </div>
          </nz-form-control>
        </nz-form-item>

        <nz-divider nzText="Colonnes"></nz-divider>
        <div style="display:flex; flex-direction:row; gap:8px;">
          <nz-form-item>
            <nz-form-label>XS</nz-form-label>
            <nz-form-control><nz-input-number formControlName="col_xs" [nzMin]="1" [nzMax]="24"></nz-input-number></nz-form-control>
          </nz-form-item>
          <nz-form-item>
            <nz-form-label>SM</nz-form-label>
            <nz-form-control><nz-input-number formControlName="col_sm" [nzMin]="1" [nzMax]="24"></nz-input-number></nz-form-control>
          </nz-form-item>
          <nz-form-item>
            <nz-form-label>MD</nz-form-label>
            <nz-form-control><nz-input-number formControlName="col_md" [nzMin]="1" [nzMax]="24"></nz-input-number></nz-form-control>
          </nz-form-item>
          <nz-form-item>
            <nz-form-label>LG</nz-form-label>
            <nz-form-control><nz-input-number formControlName="col_lg" [nzMin]="1" [nzMax]="24"></nz-input-number></nz-form-control>
          </nz-form-item>
          <nz-form-item>
            <nz-form-label>XL</nz-form-label>
            <nz-form-control><nz-input-number formControlName="col_xl" [nzMin]="1" [nzMax]="24"></nz-input-number></nz-form-control>
          </nz-form-item>
        </div>

        <nz-divider nzText="Espacement (margin / padding)"></nz-divider>
        <app-spacing-editor [group]="group"></app-spacing-editor>
      </ng-container>

      <ng-container *ngIf="group.get('type')?.value==='textblock'">
        <nz-form-item>
          <nz-form-label>HTML</nz-form-label>
          <nz-form-control><textarea nz-input rows="6" formControlName="textHtml"></textarea></nz-form-control>
        </nz-form-item>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
          <nz-form-item>
            <nz-form-label>Texte color</nz-form-label>
            <nz-form-control>
              <nz-color-picker formControlName="tb_textColor"></nz-color-picker>
            </nz-form-control>
          </nz-form-item>
          <nz-form-item>
            <nz-form-label>Texte fontSize</nz-form-label>
            <nz-form-control><nz-input-number formControlName="tb_textFontSize" [nzMin]="8"></nz-input-number></nz-form-control>
          </nz-form-item>
        </div>
        <nz-divider nzText="Colonnes"></nz-divider>
        <div style="display:flex; flex-direction:row; gap:8px;">
          <nz-form-item>
            <nz-form-label>XS</nz-form-label>
            <nz-form-control><nz-input-number formControlName="col_xs" [nzMin]="1" [nzMax]="24"></nz-input-number></nz-form-control>
          </nz-form-item>
          <nz-form-item>
            <nz-form-label>SM</nz-form-label>
            <nz-form-control><nz-input-number formControlName="col_sm" [nzMin]="1" [nzMax]="24"></nz-input-number></nz-form-control>
          </nz-form-item>
          <nz-form-item>
            <nz-form-label>MD</nz-form-label>
            <nz-form-control><nz-input-number formControlName="col_md" [nzMin]="1" [nzMax]="24"></nz-input-number></nz-form-control>
          </nz-form-item>
          <nz-form-item>
            <nz-form-label>LG</nz-form-label>
            <nz-form-control><nz-input-number formControlName="col_lg" [nzMin]="1" [nzMax]="24"></nz-input-number></nz-form-control>
          </nz-form-item>
          <nz-form-item>
            <nz-form-label>XL</nz-form-label>
            <nz-form-control><nz-input-number formControlName="col_xl" [nzMin]="1" [nzMax]="24"></nz-input-number></nz-form-control>
          </nz-form-item>
        </div>
      </ng-container>
    </div>
  `
})
export class InspectorFieldComponent {
  @Input({ required: true }) group!: FormGroup;
  @Output() openOptions = new EventEmitter<void>();
  @Output() openCondition = new EventEmitter<'visibleIf'|'requiredIf'|'disabledIf'>();
}
