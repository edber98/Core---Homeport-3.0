import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { MonacoJsonEditorComponent } from './monaco-json-editor.component';

@Component({
  selector: 'inspector-step',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NzFormModule, NzInputModule, MonacoJsonEditorComponent],
  template: `
    <div [formGroup]="group">
      <nz-form-item>
        <nz-form-label nzFor="step_title" nzTooltipTitle="Titre affiché pour l'étape">
          <span>Titre de l’étape</span>
        </nz-form-label>
        <nz-form-control><input nz-input id="step_title" formControlName="title"/></nz-form-control>
      </nz-form-item>
      <div class="ins-section-header">
        <div class="card-title">
          <span class="t">Conditions</span>
          <span class="s">Visibilité de l’étape</span>
        </div>
      </div>
      <nz-form-item>
        <nz-form-label nzTooltipTitle="Règle JSON pour l’affichage (visibleIf)">
          <span>visibleIf (JSON)</span>
        </nz-form-label>
        <nz-form-control><monaco-json-editor [value]="$any(group.controls['visibleIf'].value)" (valueChange)="group.get('visibleIf')?.setValue($event)"></monaco-json-editor></nz-form-control>
      </nz-form-item>
    </div>
  `
  ,
  styleUrls: ['./inspector-step.component.scss']
})
export class InspectorStepComponent {
  @Input({ required: true }) group!: FormGroup;
}
