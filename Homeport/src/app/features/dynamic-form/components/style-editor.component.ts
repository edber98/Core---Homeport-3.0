import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzColorPickerModule } from 'ng-zorro-antd/color-picker';
import { SpacingEditorComponent } from './spacing-editor.component';

@Component({
  selector: 'app-style-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NzInputNumberModule, NzDividerModule, NzColorPickerModule, SpacingEditorComponent],
  template: `
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; align-items:center; margin-bottom:8px;">
      <div>
        <div style="font-weight:600; margin-bottom:6px;">Couleur</div>
        <nz-color-picker style="width:100%" formControlName="color"></nz-color-picker>
      </div>
      <div>
        <div style="font-weight:600; margin-bottom:6px;">Font size</div>
        <nz-input-number formControlName="fontSize" [nzMin]="8" style="width:100%"></nz-input-number>
      </div>
    </div>
    <nz-divider nzText="Espacement (margin / padding)"></nz-divider>
    <app-spacing-editor [group]="group"></app-spacing-editor>
  `,
})
export class StyleEditorComponent {
  @Input({ required: true }) group!: FormGroup;
}

