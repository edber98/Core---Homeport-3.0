import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';

@Component({
  selector: 'inspector-step',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NzFormModule, NzInputModule, NzButtonModule, NzIconModule],
  template: `
    <form nz-form [formGroup]="group" class="inspector-form" nzLayout="vertical">
      <nav class="inspector-tabs" role="tablist" aria-label="Onglets de l’inspecteur">
        <button type="button" class="tab-btn" [class.active]="activeTab==='general'" (click)="setTab('general')" role="tab" [attr.aria-selected]="activeTab==='general'">Général</button>
        <button type="button" class="tab-btn" [class.active]="activeTab==='logic'" (click)="setTab('logic')" role="tab" [attr.aria-selected]="activeTab==='logic'">Logique</button>
        <button type="button" class="tab-btn" [class.active]="activeTab==='json'" (click)="setTab('json')" role="tab" [attr.aria-selected]="activeTab==='json'">Paramètres</button>
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
              <span class="s">Affichage & validation</span>
            </div>
          </div>
          <div class="ins-grid span-2">
            <div class="editor-block span-2">
              <div class="editor-toolbar" nz-tooltip nzTooltipTitle="Condition de visibilité">
                <div class="title">
                  Condition de visibilite
                  <span *ngIf="hasCondition('visibleIf')" class="cond-pill">Active</span>
                </div>
                <button type="button" nz-button nzSize="small" class="apple-btn cond-builder-btn" (click)="openCondition.emit('visibleIf'); $event.preventDefault(); $event.stopPropagation()">
                  <i nz-icon nzType="build"></i>
                  <span style="margin-left:6px">Constructeur</span>
                </button>
              </div>
            </div>
          </div>
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
  @Output() openCondition = new EventEmitter<'visibleIf'>();

  activeTab: 'general'|'logic'|'json' = 'general';

  setTab(tab: 'general'|'logic'|'json') { this.activeTab = tab; }

  hasCondition(prop: 'visibleIf'): boolean {
    const v = this.group?.get(prop)?.value;
    if (v == null) return false;
    if (typeof v === 'string') {
      const raw = v.trim();
      if (!raw) return false;
      try { return this.isMeaningfulCondition(JSON.parse(raw)); } catch { return false; }
    }
    if (typeof v === 'object') return this.isMeaningfulCondition(v);
    return false;
  }

  private isMeaningfulCondition(rule: any): boolean {
    if (!rule || typeof rule !== 'object') return false;
    if (Array.isArray(rule.any)) return rule.any.some((r: any) => this.isMeaningfulCondition(r));
    if (Array.isArray(rule.all)) return rule.all.some((r: any) => this.isMeaningfulCondition(r));
    const op = Object.keys(rule)[0];
    const args = (rule as any)[op];
    if (!op || !Array.isArray(args) || args.length < 2) return false;
    const left = args[0];
    const field = left && typeof left === 'object' ? String(left.var || '') : '';
    return field.trim().length > 0;
  }
}
