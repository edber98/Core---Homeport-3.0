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
    <form nz-form [formGroup]="group" class="inspector-form" nzLayout="vertical">
      <div class="inspector-accordion">
        <section class="inspector-panel" [class.open]="sectionsOpen.general">
          <button type="button" class="inspector-panel__header" (click)="toggleSection('general')" [attr.aria-expanded]="sectionsOpen.general">
            <span>Général</span>
            <i class="fa-solid fa-chevron-down inspector-panel__icon"></i>
          </button>
          <div class="inspector-panel__content">
            <div class="inspector-panel__inner">
              <nz-form-item>
                <nz-form-label nzFor="step_title" nzTooltipTitle="Titre affiché pour l'étape">
                  <span>Titre de l’étape</span>
                </nz-form-label>
                <nz-form-control><input nz-input id="step_title" formControlName="title"/></nz-form-control>
              </nz-form-item>
            </div>
          </div>
        </section>



        <section class="inspector-panel" [class.open]="sectionsOpen.advanced">
          <button type="button" class="inspector-panel__header" (click)="toggleSection('advanced')" [attr.aria-expanded]="sectionsOpen.advanced">
            <span>Avancé</span>
            <i class="fa-solid fa-chevron-down inspector-panel__icon"></i>
          </button>
          <div class="inspector-panel__content">
            <div class="inspector-panel__inner">
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
          </div>
        </section>

        <section class="inspector-panel" [class.open]="sectionsOpen.params">
          <button type="button" class="inspector-panel__header" (click)="toggleSection('params')" [attr.aria-expanded]="sectionsOpen.params">
            <span>Paramètres</span>
            <i class="fa-solid fa-chevron-down inspector-panel__icon"></i>
          </button>
          <div class="inspector-panel__content">
            <div class="inspector-panel__inner">
              <pre class="json">{{ group.value | json }}</pre>
            </div>
          </div>
        </section>
      </div>
    </form>
  `
  ,
  styleUrls: ['./inspector-step.component.scss']
})
export class InspectorStepComponent {
  @Input({ required: true }) group!: FormGroup;

  sectionsOpen = {
    general: true,
    advanced: false,
    params: false,
  };

  toggleSection(key: keyof InspectorStepComponent['sectionsOpen']) {
    this.sectionsOpen[key] = !this.sectionsOpen[key];
  }
}
