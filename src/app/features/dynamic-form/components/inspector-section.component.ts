import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { SpacingEditorComponent } from './spacing-editor.component';

@Component({
  selector: 'inspector-section',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NzFormModule, NzInputModule, NzDividerModule, NzInputNumberModule, NzSelectModule, SpacingEditorComponent],
  template: `
    <div [formGroup]="group">
      <nz-form-item>
        <nz-form-label>Titre</nz-form-label>
        <nz-form-control><input nz-input formControlName="title"/></nz-form-control>
      </nz-form-item>
      <nz-form-item>
        <nz-form-label>Description</nz-form-label>
        <nz-form-control><textarea nz-input rows="3" formControlName="description"></textarea></nz-form-control>
      </nz-form-item>
      <nz-divider nzText="Titre & Description Styles"></nz-divider>
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
        <nz-form-item>
          <nz-form-label>Titre couleur</nz-form-label>
          <nz-form-control><input nz-input formControlName="sec_titleColor" placeholder="#000 or red"/></nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label>Titre fontSize</nz-form-label>
          <nz-form-control><nz-input-number formControlName="sec_titleFontSize" [nzMin]="8"></nz-input-number></nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label>Titre MT/MB</nz-form-label>
          <nz-form-control>
            <div style="display:flex; gap:6px;">
              <nz-input-number formControlName="sec_titleMT" [nzMin]="0" placeholder="MT"></nz-input-number>
              <nz-input-number formControlName="sec_titleMB" [nzMin]="0" placeholder="MB"></nz-input-number>
            </div>
          </nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label>Desc couleur</nz-form-label>
          <nz-form-control><input nz-input formControlName="sec_descColor" placeholder="#666"/></nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label>Desc fontSize</nz-form-label>
          <nz-form-control><nz-input-number formControlName="sec_descFontSize" [nzMin]="8"></nz-input-number></nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label>Desc MT/MB</nz-form-label>
          <nz-form-control>
            <div style="display:flex; gap:6px;">
              <nz-input-number formControlName="sec_descMT" [nzMin]="0" placeholder="MT"></nz-input-number>
              <nz-input-number formControlName="sec_descMB" [nzMin]="0" placeholder="MB"></nz-input-number>
            </div>
          </nz-form-control>
        </nz-form-item>
      </div>
      <nz-form-item>
        <nz-form-label>Grid gutter</nz-form-label>
        <nz-form-control><nz-input-number formControlName="gridGutter" [nzMin]="0"></nz-input-number></nz-form-control>
      </nz-form-item>
      <nz-divider nzText="Condition"></nz-divider>
      <nz-form-item>
        <nz-form-label>visibleIf (JSON)</nz-form-label>
        <nz-form-control>
          <div style="display:flex; gap:6px; align-items:center;">
            <textarea nz-input rows="3" formControlName="visibleIf" placeholder='{"==":[{"var":"country"},"FR"]}' style="flex:1"></textarea>
            <button nz-button nzSize="small" (click)="openCondition.emit(); $event.preventDefault(); $event.stopPropagation()">Builder</button>
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
      <div style="display:flex; gap:8px; margin-top:8px;">
        <button nz-button (click)="openTitleStyle.emit()">Configurer style Titre…</button>
        <button nz-button (click)="openDescStyle.emit()">Configurer style Description…</button>
      </div>
    </div>
  `
})
export class InspectorSectionComponent {
  @Input({ required: true }) group!: FormGroup;
  @Output() openTitleStyle = new EventEmitter<void>();
  @Output() openDescStyle = new EventEmitter<void>();
  @Output() openCondition = new EventEmitter<void>();
}

