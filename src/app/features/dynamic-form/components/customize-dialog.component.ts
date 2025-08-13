import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzColorPickerModule } from 'ng-zorro-antd/color-picker';
import { SpacingEditorComponent } from './spacing-editor.component';

@Component({
  selector: 'app-customize-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NzModalModule,
    NzInputModule,
    NzInputNumberModule,
    NzDividerModule,
    NzCheckboxModule,
    NzColorPickerModule,
    SpacingEditorComponent
  ],
  template: `
  <nz-modal [nzTitle]="title" [(nzVisible)]="visible" (nzVisibleChange)="visibleChange.emit($event)" [nzWidth]="960" (nzOnCancel)="cancel.emit()" (nzOnOk)="save.emit()">
    <ng-container *nzModalContent>
      <form [formGroup]="group" class="cust-form">
        <!-- Texte principal (si présent) -->
        <div *ngIf="group.get('text')" class="row">
          <label>Texte</label>
          <input nz-input formControlName="text" />
        </div>

        <!-- Accessibilité -->
        <div *ngIf="group.get('ariaLabel')" class="row">
          <label>ARIA label</label>
          <input nz-input formControlName="ariaLabel" />
        </div>

        <!-- Activation (boutons) -->
        <div *ngIf="group.get('enabled')" class="row">
          <label>Actif</label>
          <label nz-checkbox formControlName="enabled">Activé</label>
        </div>

        <nz-divider nzText="Typographie & Couleurs" *ngIf="group.get('color') || group.get('fontSize')"></nz-divider>
        <div class="grid2" *ngIf="group.get('color') || group.get('fontSize')">
          <div *ngIf="group.get('color')" class="row">
            <label>Couleur</label>
            <nz-color-picker formControlName="color"></nz-color-picker>
          </div>
          <div *ngIf="group.get('fontSize')" class="row">
            <label>Font Size</label>
            <nz-input-number formControlName="fontSize" [nzMin]="8" style="width:100%"></nz-input-number>
          </div>
        </div>

        <nz-divider nzText="Bordures & Effets" *ngIf="group.get('borderWidth') || group.get('borderColor') || group.get('borderRadius') || group.get('boxShadow')"></nz-divider>
        <div class="grid2" *ngIf="group.get('borderWidth') || group.get('borderColor') || group.get('borderRadius') || group.get('boxShadow')">
          <div *ngIf="group.get('borderWidth')" class="row">
            <label>Border Width</label>
            <nz-input-number formControlName="borderWidth" [nzMin]="0" style="width:100%"></nz-input-number>
          </div>
          <div *ngIf="group.get('borderColor')" class="row">
            <label>Border Color</label>
            <nz-color-picker formControlName="borderColor"></nz-color-picker>
          </div>
          <div *ngIf="group.get('borderRadius')" class="row">
            <label>Border Radius</label>
            <nz-input-number formControlName="borderRadius" [nzMin]="0" style="width:100%"></nz-input-number>
          </div>
          <div *ngIf="group.get('boxShadow')" class="row">
            <label>Box Shadow</label>
            <input nz-input formControlName="boxShadow" placeholder="ex: 0 2px 8px rgba(0,0,0,.15)"/>
          </div>
        </div>

        <nz-divider nzText="Espacement" *ngIf="hasSpacing()"></nz-divider>
        <app-spacing-editor *ngIf="hasSpacing()" [group]="group"></app-spacing-editor>
      </form>
    </ng-container>
  </nz-modal>
  `,
  styles: [`
    .cust-form { display:block; }
    .row { display:flex; align-items:center; gap:8px; margin-bottom:10px; }
    .row > label { width:160px; font-weight:600; }
    .grid2 { display:grid; grid-template-columns: 1fr 1fr; gap:12px; }
  `]
})
export class CustomizeDialogComponent {
  @Input() title = 'Personnaliser';
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Input({ required: true }) group!: FormGroup;
  @Output() save = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  hasSpacing() {
    const g = this.group;
    const keys = ['m_top','m_right','m_bottom','m_left','p_top','p_right','p_bottom','p_left'];
    return keys.some(k => !!g.get(k));
  }
}
