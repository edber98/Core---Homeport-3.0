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
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzColorPickerModule } from 'ng-zorro-antd/color-picker';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { SpacingEditorComponent } from './spacing-editor.component';
import { MonacoJsonEditorComponent } from './monaco-json-editor.component';

@Component({
  selector: 'inspector-field',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NzFormModule, NzInputModule, NzSelectModule, NzInputNumberModule, NzDividerModule, NzSwitchModule, NzColorPickerModule, NzToolTipModule, NzIconModule, SpacingEditorComponent, MonacoJsonEditorComponent],
  template: `
    <div [formGroup]="group">
      <nz-form-item>
        <nz-form-label nzFor="fld_type" nzTooltipTitle="Type de champ (texte, nombre, date…)"><span>Type de champ</span></nz-form-label>
        <nz-form-control>
          <nz-select id="fld_type" formControlName="type">
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
          <nz-form-label nzFor="fld_key" nzTooltipTitle="Clé unique pour référencer la valeur"><span>Clé</span></nz-form-label>
          <nz-form-control><input nz-input id="fld_key" formControlName="key"/></nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label nzFor="fld_label" nzTooltipTitle="Libellé affiché à l’utilisateur"><span>Libellé</span></nz-form-label>
          <nz-form-control><input nz-input id="fld_label" formControlName="label"/></nz-form-control>
        </nz-form-item>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
          <nz-form-item>
            <nz-form-label nzTooltipTitle="Couleur du libellé"><span>Couleur libellé</span></nz-form-label>
            <nz-form-control>
              <nz-color-picker formControlName="fld_labelColor"></nz-color-picker>
            </nz-form-control>
          </nz-form-item>
          <nz-form-item>
            <nz-form-label nzTooltipTitle="Taille du libellé (px)"><span>Taille libellé</span></nz-form-label>
            <nz-form-control><nz-input-number style="width: 100%" formControlName="fld_labelFontSize" [nzMin]="8"></nz-input-number></nz-form-control>
          </nz-form-item>
        </div>
        <nz-form-item>
          <nz-form-label nzTooltipTitle="Autoriser les expressions (ex: calculs)"><span>Expressions</span></nz-form-label>
          <nz-form-control>
            <nz-switch formControlName="expression_allow"></nz-switch>
          </nz-form-control>
        </nz-form-item>
        <nz-form-item *ngIf="group.get('expression_allow')?.value === true">
          <nz-form-label nzTooltipTitle="Cacher les erreurs d’expression en prévisualisation"><span>Masquer erreurs (preview)</span></nz-form-label>
          <nz-form-control>
            <nz-switch formControlName="expression_hideErrors"></nz-switch>
          </nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label nzFor="fld_placeholder" nzTooltipTitle="Texte indicatif dans le champ"><span>Placeholder</span></nz-form-label>
          <nz-form-control><input nz-input id="fld_placeholder" formControlName="placeholder"/></nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label nzFor="fld_desc" nzTooltipTitle="Aide sous le champ"><span>Description</span></nz-form-label>
          <nz-form-control><textarea nz-input rows="2" id="fld_desc" formControlName="description"></textarea></nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label nzFor="fld_default" nzTooltipTitle="Valeur par défaut"><span>Valeur par défaut</span></nz-form-label>
          <nz-form-control><input nz-input id="fld_default" formControlName="default"/></nz-form-control>
        </nz-form-item>
        <nz-form-item *ngIf="group.get('type')?.value==='select' || group.get('type')?.value==='radio'">
          <nz-form-label nzTooltipTitle="Liste des options (JSON)"><span>Options (JSON)</span></nz-form-label>
          <nz-form-control>
            <div style="display:flex; gap:6px; align-items:center;">
              <monaco-json-editor [value]="$any(group.controls['options'].value)" (valueChange)="group.get('options')?.setValue($event)" [height]="160" style="flex:1"></monaco-json-editor>
              <button nz-button nzSize="small" (click)="openOptions.emit(); $event.preventDefault(); $event.stopPropagation()">Builder…</button>
            </div>
          </nz-form-control>
        </nz-form-item>
        <div class="ins-section-header"><div class="card-title"><span class="t">Validateurs</span><span class="s">Contraintes et règles</span></div></div>
        <div class="ins-grid">
          <nz-form-item class="span-2">
            <nz-form-label nzTooltipTitle="Champ requis pour valider le formulaire"><span>Obligatoire</span></nz-form-label>
            <nz-form-control>
              <nz-switch [(ngModel)]="v_required" [ngModelOptions]="{standalone:true}" (ngModelChange)="onValidatorsChanged()"></nz-switch>
            </nz-form-control>
          </nz-form-item>

          <ng-container *ngIf="group.get('type')?.value==='text' || group.get('type')?.value==='textarea'">
            <nz-form-item>
              <nz-form-label nzTooltipTitle="Longueur minimale autorisée"><span>Longueur min</span></nz-form-label>
              <nz-form-control>
                <nz-input-number style="width: 100%" [(ngModel)]="v_minLength" [ngModelOptions]="{standalone:true}" (ngModelChange)="onValidatorsChanged()" [nzMin]="0"></nz-input-number>
              </nz-form-control>
            </nz-form-item>
            <nz-form-item>
              <nz-form-label nzTooltipTitle="Longueur maximale autorisée"><span>Longueur max</span></nz-form-label>
              <nz-form-control>
                <nz-input-number style="width: 100%" [(ngModel)]="v_maxLength" [ngModelOptions]="{standalone:true}" (ngModelChange)="onValidatorsChanged()" [nzMin]="0"></nz-input-number>
              </nz-form-control>
            </nz-form-item>
            <nz-form-item class="span-2">
              <nz-form-label nzTooltipTitle="Expression régulière (regex) à respecter"><span>Motif (regex)</span></nz-form-label>
              <nz-form-control>
                <input nz-input [(ngModel)]="v_pattern" [ngModelOptions]="{standalone:true}" (ngModelChange)="onValidatorsChanged()" placeholder="^\\\d+$" />
              </nz-form-control>
            </nz-form-item>
          </ng-container>

          <ng-container *ngIf="group.get('type')?.value==='number'">
            <nz-form-item>
              <nz-form-label nzTooltipTitle="Valeur minimale"><span>Min</span></nz-form-label>
              <nz-form-control>
                <nz-input-number style="width: 100%" [(ngModel)]="v_min" [ngModelOptions]="{standalone:true}" (ngModelChange)="onValidatorsChanged()" [nzMin]="-999999"></nz-input-number>
              </nz-form-control>
            </nz-form-item>
            <nz-form-item>
              <nz-form-label nzTooltipTitle="Valeur maximale"><span>Max</span></nz-form-label>
              <nz-form-control>
                <nz-input-number style="width: 100%" [(ngModel)]="v_max" [ngModelOptions]="{standalone:true}" (ngModelChange)="onValidatorsChanged()" [nzMin]="-999999"></nz-input-number>
              </nz-form-control>
            </nz-form-item>
            <nz-form-item class="span-2">
              <nz-form-label nzTooltipTitle="Limiter aux nombres entiers"><span>Entier</span></nz-form-label>
              <nz-form-control>
                <nz-switch [(ngModel)]="v_integer" [ngModelOptions]="{standalone:true}" (ngModelChange)="onValidatorsChanged()"></nz-switch>
              </nz-form-control>
            </nz-form-item>
          </ng-container>

          <ng-container *ngIf="group.get('type')?.value==='date'">
            <nz-form-item>
              <nz-form-label nzTooltipTitle="Date minimale (YYYY-MM-DD)"><span>Date min</span></nz-form-label>
              <nz-form-control>
                <input nz-input [(ngModel)]="v_dateMin" [ngModelOptions]="{standalone:true}" (ngModelChange)="onValidatorsChanged()" placeholder="YYYY-MM-DD" />
              </nz-form-control>
            </nz-form-item>
            <nz-form-item>
              <nz-form-label nzTooltipTitle="Date maximale (YYYY-MM-DD)"><span>Date max</span></nz-form-label>
              <nz-form-control>
                <input nz-input [(ngModel)]="v_dateMax" [ngModelOptions]="{standalone:true}" (ngModelChange)="onValidatorsChanged()" placeholder="YYYY-MM-DD" />
              </nz-form-control>
            </nz-form-item>
          </ng-container>
        </div>

        <nz-form-item style="margin-top:8px;">
          <nz-form-label nzTooltipTitle="Validation avancée via JSON"><span>Validators (JSON avancé)</span></nz-form-label>
          <nz-form-control>
            <monaco-json-editor [value]="$any(group.controls['validators'].value)" (valueChange)="group.get('validators')?.setValue($event)" [height]="160"></monaco-json-editor>
          </nz-form-control>
        </nz-form-item>

        <div class="ins-section-header"><div class="card-title"><span class="t">Conditions</span><span class="s">Affichage & validation</span></div></div>
        <div class="ins-grid span-2">
          <div class="editor-block span-2">
            <div class="editor-toolbar" nz-tooltip nzTooltipTitle="Condition de visibilité (JSON logique)">
              <div class="title">visibleIf (JSON)</div>
              <button nz-button nzSize="small" class="apple-btn" (click)="openCondition.emit('visibleIf'); $event.preventDefault(); $event.stopPropagation()">
                <i nz-icon nzType="build"></i>
                <span style="margin-left:6px">Builder</span>
              </button>
            </div>
            <monaco-json-editor [value]="$any(group.controls['visibleIf'].value)" (valueChange)="group.get('visibleIf')?.setValue($event)" [height]="160"></monaco-json-editor>
          </div>
          <div class="editor-block span-2">
            <div class="editor-toolbar" nz-tooltip nzTooltipTitle="Condition rendant le champ obligatoire (JSON)">
              <div class="title">requiredIf (JSON)</div>
              <button nz-button nzSize="small" class="apple-btn" (click)="openCondition.emit('requiredIf'); $event.preventDefault(); $event.stopPropagation()">
                <i nz-icon nzType="build"></i>
                <span style="margin-left:6px">Builder</span>
              </button>
            </div>
            <monaco-json-editor [value]="$any(group.controls['requiredIf'].value)" (valueChange)="group.get('requiredIf')?.setValue($event)" [height]="160"></monaco-json-editor>
          </div>
          <div class="editor-block span-2">
            <div class="editor-toolbar" nz-tooltip nzTooltipTitle="Condition de désactivation du champ (JSON)">
              <div class="title">disabledIf (JSON)</div>
              <button nz-button nzSize="small" class="apple-btn" (click)="openCondition.emit('disabledIf'); $event.preventDefault(); $event.stopPropagation()">
                <i nz-icon nzType="build"></i>
                <span style="margin-left:6px">Builder</span>
              </button>
            </div>
            <monaco-json-editor [value]="$any(group.controls['disabledIf'].value)" (valueChange)="group.get('disabledIf')?.setValue($event)" [height]="160"></monaco-json-editor>
          </div>
        </div>

        <div class="ins-section-header"><div class="card-title"><span class="t">Colonnes</span><span class="s">Tailles responsives</span></div></div>
        <div class="ins-grid cols-5">
          <nz-form-item>
            <nz-form-label nzTooltipTitle="Largeur XS (mobile) en colonnes"><span>XS</span></nz-form-label>
            <nz-form-control><nz-input-number formControlName="col_xs" [nzMin]="1" [nzMax]="24"></nz-input-number></nz-form-control>
          </nz-form-item>
          <nz-form-item>
            <nz-form-label nzTooltipTitle="Largeur SM (petites tablettes) en colonnes"><span>SM</span></nz-form-label>
            <nz-form-control><nz-input-number formControlName="col_sm" [nzMin]="1" [nzMax]="24"></nz-input-number></nz-form-control>
          </nz-form-item>
          <nz-form-item>
            <nz-form-label nzTooltipTitle="Largeur MD (tablettes) en colonnes"><span>MD</span></nz-form-label>
            <nz-form-control><nz-input-number formControlName="col_md" [nzMin]="1" [nzMax]="24"></nz-input-number></nz-form-control>
          </nz-form-item>
          <nz-form-item>
            <nz-form-label nzTooltipTitle="Largeur LG (desktop) en colonnes"><span>LG</span></nz-form-label>
            <nz-form-control><nz-input-number formControlName="col_lg" [nzMin]="1" [nzMax]="24"></nz-input-number></nz-form-control>
          </nz-form-item>
          <nz-form-item>
            <nz-form-label nzTooltipTitle="Largeur XL (grands écrans) en colonnes"><span>XL</span></nz-form-label>
            <nz-form-control><nz-input-number formControlName="col_xl" [nzMin]="1" [nzMax]="24"></nz-input-number></nz-form-control>
          </nz-form-item>
        </div>

        <div class="ins-section-header"><div class="card-title"><span class="t">Espacement</span><span class="s">Margins / Padding</span></div></div>
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
        <div class="ins-section-header"><div class="card-title"><span class="t">Colonnes</span><span class="s">Tailles responsives</span></div></div>
        <div class="ins-grid cols-5">
          <nz-form-item>
            <nz-form-label nzTooltipTitle="Largeur XS (mobile) en colonnes"><span>XS</span></nz-form-label>
            <nz-form-control><nz-input-number formControlName="col_xs" [nzMin]="1" [nzMax]="24"></nz-input-number></nz-form-control>
          </nz-form-item>
          <nz-form-item>
            <nz-form-label nzTooltipTitle="Largeur SM (petites tablettes) en colonnes"><span>SM</span></nz-form-label>
            <nz-form-control><nz-input-number formControlName="col_sm" [nzMin]="1" [nzMax]="24"></nz-input-number></nz-form-control>
          </nz-form-item>
          <nz-form-item>
            <nz-form-label nzTooltipTitle="Largeur MD (tablettes) en colonnes"><span>MD</span></nz-form-label>
            <nz-form-control><nz-input-number formControlName="col_md" [nzMin]="1" [nzMax]="24"></nz-input-number></nz-form-control>
          </nz-form-item>
          <nz-form-item>
            <nz-form-label nzTooltipTitle="Largeur LG (desktop) en colonnes"><span>LG</span></nz-form-label>
            <nz-form-control><nz-input-number formControlName="col_lg" [nzMin]="1" [nzMax]="24"></nz-input-number></nz-form-control>
          </nz-form-item>
          <nz-form-item>
            <nz-form-label nzTooltipTitle="Largeur XL (grands écrans) en colonnes"><span>XL</span></nz-form-label>
            <nz-form-control><nz-input-number formControlName="col_xl" [nzMin]="1" [nzMax]="24"></nz-input-number></nz-form-control>
          </nz-form-item>
        </div>
      </ng-container>
    </div>
  `,
  styleUrls: ['./inspector-field.component.scss']
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
