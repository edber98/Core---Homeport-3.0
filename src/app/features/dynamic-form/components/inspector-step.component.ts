import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';

@Component({
  selector: 'inspector-step',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NzFormModule, NzInputModule],
  template: `
    <div [formGroup]="group">
      <nz-form-item>
        <nz-form-label>Titre</nz-form-label>
        <nz-form-control><input nz-input formControlName="title"/></nz-form-control>
      </nz-form-item>
      <nz-form-item>
        <nz-form-label>visibleIf (JSON)</nz-form-label>
        <nz-form-control><textarea nz-input rows="3" formControlName="visibleIf"></textarea></nz-form-control>
      </nz-form-item>
    </div>
  `
})
export class InspectorStepComponent {
  @Input({ required: true }) group!: FormGroup;
}
