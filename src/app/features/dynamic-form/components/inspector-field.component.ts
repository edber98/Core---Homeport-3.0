import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';
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
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NzFormModule, NzInputModule, NzSelectModule, NzInputNumberModule, NzDividerModule, NzSwitchModule, NzColorPickerModule, SpacingEditorComponent, JsonEditorComponent, MonacoJsonEditorComponent],
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
        <nz-form-item *ngIf="group.get('expression_allow')?.value === true">
          <nz-form-label>Masquer erreurs d’expression (preview)</nz-form-label>
          <nz-form-control>
            <nz-switch formControlName="expression_hideErrors"></nz-switch>
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
        <nz-divider nzText="Validateurs"></nz-divider>
        <div style="display:flex; flex-direction:column; gap:8px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <label style="width:160px; font-weight:600;">Obligatoire</label>
            <nz-switch [(ngModel)]="v_required" (ngModelChange)="onValidatorsChanged()"></nz-switch>
          </div>
          <ng-container *ngIf="group.get('type')?.value==='text' || group.get('type')?.value==='textarea'">
            <div style="display:flex; align-items:center; gap:8px;">
              <label style="width:160px;">Min length</label>
              <nz-input-number [(ngModel)]="v_minLength" (ngModelChange)="onValidatorsChanged()" [nzMin]="0"></nz-input-number>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <label style="width:160px;">Max length</label>
              <nz-input-number [(ngModel)]="v_maxLength" (ngModelChange)="onValidatorsChanged()" [nzMin]="0"></nz-input-number>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <label style="width:160px;">Pattern (regex)</label>
              <input nz-input [(ngModel)]="v_pattern" (ngModelChange)="onValidatorsChanged()" placeholder="^\\d+$" />
            </div>
          </ng-container>
          <ng-container *ngIf="group.get('type')?.value==='number'">
            <div style="display:flex; align-items:center; gap:8px;">
              <label style="width:160px;">Min</label>
              <nz-input-number [(ngModel)]="v_min" (ngModelChange)="onValidatorsChanged()" [nzMin]="-999999"></nz-input-number>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <label style="width:160px;">Max</label>
              <nz-input-number [(ngModel)]="v_max" (ngModelChange)="onValidatorsChanged()" [nzMin]="-999999"></nz-input-number>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <label style="width:160px;">Entier</label>
              <nz-switch [(ngModel)]="v_integer" (ngModelChange)="onValidatorsChanged()"></nz-switch>
            </div>
          </ng-container>
          <ng-container *ngIf="group.get('type')?.value==='date'">
            <div style="display:flex; align-items:center; gap:8px;">
              <label style="width:160px;">Date min</label>
              <input nz-input [(ngModel)]="v_dateMin" (ngModelChange)="onValidatorsChanged()" placeholder="YYYY-MM-DD" />
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <label style="width:160px;">Date max</label>
              <input nz-input [(ngModel)]="v_dateMax" (ngModelChange)="onValidatorsChanged()" placeholder="YYYY-MM-DD" />
            </div>
          </ng-container>
        </div>

        <nz-form-item style="margin-top:8px;">
          <nz-form-label>Validators (JSON avancé)</nz-form-label>
          <nz-form-control>
            <monaco-json-editor [value]="$any(group.controls['validators'].value)" (valueChange)="group.get('validators')?.setValue($event)" [height]="160"></monaco-json-editor>
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
export class InspectorFieldComponent implements OnChanges {
  @Input({ required: true }) group!: FormGroup;
  @Output() openOptions = new EventEmitter<void>();
  @Output() openCondition = new EventEmitter<'visibleIf'|'requiredIf'|'disabledIf'>();

  // UI state for validators (per type)
  v_required = false;
  v_minLength?: number;
  v_maxLength?: number;
  v_pattern?: string;
  v_min?: number;
  v_max?: number;
  v_integer = false;
  v_dateMin?: string;
  v_dateMax?: string;

  ngOnChanges(_c: SimpleChanges) {
    // Initialize UI from current validators JSON when field/type changes
    try {
      const raw = this.group?.get('validators')?.value as string;
      const arr = this.safeParseArray(raw);
      this.applyValidatorArray(arr);
    } catch {}
  }

  onValidatorsChanged() {
    const out: any[] = [];
    // Required
    if (this.v_required) out.push({ type: 'required' });
    const type = this.group?.get('type')?.value;
    if (type === 'text' || type === 'textarea') {
      if (typeof this.v_minLength === 'number') out.push({ type: 'minLength', value: this.v_minLength });
      if (typeof this.v_maxLength === 'number') out.push({ type: 'maxLength', value: this.v_maxLength });
      if (this.v_pattern && this.v_pattern.trim()) out.push({ type: 'pattern', value: this.v_pattern });
    } else if (type === 'number') {
      if (typeof this.v_min === 'number') out.push({ type: 'min', value: this.v_min });
      if (typeof this.v_max === 'number') out.push({ type: 'max', value: this.v_max });
      if (this.v_integer) out.push({ type: 'integer' });
    } else if (type === 'date') {
      if (this.v_dateMin && this.v_dateMin.trim()) out.push({ type: 'dateMin', value: this.v_dateMin });
      if (this.v_dateMax && this.v_dateMax.trim()) out.push({ type: 'dateMax', value: this.v_dateMax });
    }
    try { this.group.get('validators')?.setValue(JSON.stringify(out)); } catch {}
  }

  private safeParseArray(v: any): any[] {
    try {
      if (!v) return [];
      if (Array.isArray(v)) return v;
      const parsed = JSON.parse(String(v));
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }
  private applyValidatorArray(arr: any[]) {
    const get = (t: string) => arr.find(x => x && x.type === t);
    this.v_required = !!get('required');
    this.v_minLength = this.numOrUndef(get('minLength')?.value);
    this.v_maxLength = this.numOrUndef(get('maxLength')?.value);
    this.v_pattern = this.strOrUndef(get('pattern')?.value);
    this.v_min = this.numOrUndef(get('min')?.value);
    this.v_max = this.numOrUndef(get('max')?.value);
    this.v_integer = !!get('integer');
    this.v_dateMin = this.strOrUndef(get('dateMin')?.value);
    this.v_dateMax = this.strOrUndef(get('dateMax')?.value);
  }
  private numOrUndef(v: any): number | undefined { return typeof v === 'number' && !Number.isNaN(v) ? v : undefined; }
  private strOrUndef(v: any): string | undefined { return typeof v === 'string' && v.length ? v : undefined; }
}
