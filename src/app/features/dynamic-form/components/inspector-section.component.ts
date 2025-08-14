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
      <nz-divider nzText="Mode & Tableau"></nz-divider>
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; align-items:center;">
        <nz-form-item>
          <nz-form-label>Mode</nz-form-label>
          <nz-form-control>
            <nz-select formControlName="sec_mode">
              <nz-option nzValue="normal" nzLabel="Normal"></nz-option>
              <nz-option nzValue="array" nzLabel="Array (liste d'items)"></nz-option>
            </nz-select>
          </nz-form-control>
        </nz-form-item>
        <nz-form-item *ngIf="group.get('sec_mode')?.value === 'array'">
          <nz-form-label>Clé (FormArray)</nz-form-label>
          <nz-form-control><input nz-input formControlName="sec_key" placeholder="ex: items"/></nz-form-control>
        </nz-form-item>
      </div>
      <div *ngIf="group.get('sec_mode')?.value === 'array'" style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; align-items:center;">
        <nz-form-item>
          <nz-form-label>Items initiaux</nz-form-label>
          <nz-form-control><nz-input-number formControlName="arr_initial" [nzMin]="0"></nz-input-number></nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label>Min items</nz-form-label>
          <nz-form-control><nz-input-number formControlName="arr_min" [nzMin]="0"></nz-input-number></nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label>Max items</nz-form-label>
          <nz-form-control><nz-input-number formControlName="arr_max" [nzMin]="1"></nz-input-number></nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label>Ajouter (texte)</nz-form-label>
          <nz-form-control><input nz-input formControlName="arr_addText"/></nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label>Supprimer (texte)</nz-form-label>
          <nz-form-control><input nz-input formControlName="arr_removeText"/></nz-form-control>
        </nz-form-item>
      </div>
      <nz-divider nzText="Mise en forme interne"></nz-divider>
      <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center;">
        <nz-form-item>
          <nz-form-label>Layout</nz-form-label>
          <nz-form-control>
            <nz-select formControlName="sec_ui_layout" style="min-width:140px;">
              <nz-option nzValue="" nzLabel="Inherit"></nz-option>
              <nz-option nzValue="horizontal" nzLabel="Horizontal"></nz-option>
              <nz-option nzValue="vertical" nzLabel="Vertical"></nz-option>
              <nz-option nzValue="inline" nzLabel="Inline"></nz-option>
            </nz-select>
          </nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label>Align label</nz-form-label>
          <nz-form-control>
            <nz-select formControlName="sec_ui_labelAlign" style="min-width:140px;">
              <nz-option nzValue="" nzLabel="Inherit"></nz-option>
              <nz-option nzValue="left" nzLabel="Left"></nz-option>
              <nz-option nzValue="right" nzLabel="Right"></nz-option>
            </nz-select>
          </nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label>Labels on top</nz-form-label>
          <nz-form-control>
            <nz-select formControlName="sec_ui_labelsOnTop" style="min-width:140px;">
              <nz-option [nzValue]="null" nzLabel="Inherit"></nz-option>
              <nz-option [nzValue]="true" nzLabel="Oui"></nz-option>
              <nz-option [nzValue]="false" nzLabel="Non"></nz-option>
            </nz-select>
          </nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label>Label span</nz-form-label>
          <nz-form-control><nz-input-number formControlName="sec_ui_labelColSpan" [nzMin]="1" [nzMax]="24"></nz-input-number></nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label>Control span</nz-form-label>
          <nz-form-control><nz-input-number formControlName="sec_ui_controlColSpan" [nzMin]="1" [nzMax]="24"></nz-input-number></nz-form-control>
        </nz-form-item>
      </div>
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
