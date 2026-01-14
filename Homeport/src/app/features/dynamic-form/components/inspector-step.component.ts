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
      <nav class="inspector-tabs" role="tablist" aria-label="Onglets de l’inspecteur">
        <button type="button" class="tab-btn" [class.active]="activeTab==='general'" (click)="setTab('general')" role="tab" [attr.aria-selected]="activeTab==='general'">Général</button>
        <button type="button" class="tab-btn" [class.active]="activeTab==='logic'" (click)="setTab('logic')" role="tab" [attr.aria-selected]="activeTab==='logic'">Logique</button>
        <button type="button" class="tab-btn" [class.active]="activeTab==='json'" (click)="setTab('json')" role="tab" [attr.aria-selected]="activeTab==='json'">JSON</button>
      </nav>

      <ng-container *ngIf="activeTab==='general'">
        <div class="inspector-accordion">
          <div class="inspector-panel__inner">
            <nz-form-item>
              <nz-form-label nzFor="step_title" nzTooltipTitle="Titre affiché pour l'étape">
                <span>Titre de l’étape</span>
              </nz-form-label>
              <nz-form-control><input nz-input id="step_title" formControlName="title"/></nz-form-control>
            </nz-form-item>
          </div>
        </div>
      </ng-container>

      <ng-container *ngIf="activeTab==='logic'">
        <div class="inspector-tab logic-tab">
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
      </ng-container>

      <ng-container *ngIf="activeTab==='json'">
        <div class="inspector-tab json-tab">
          <pre class="json">{{ group.value | json }}</pre>
        </div>
      </ng-container>
    </form>
  `
  ,
  styleUrls: ['./inspector-step.component.scss']
})
export class InspectorStepComponent {
  @Input({ required: true }) group!: FormGroup;

  activeTab: 'general'|'logic'|'json' = 'general';

  setTab(tab: 'general'|'logic'|'json') { this.activeTab = tab; }
}
