import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { SpacingEditorComponent } from './spacing-editor.component';
import { MonacoJsonEditorComponent } from './monaco-json-editor.component';
import { NzIconModule } from 'ng-zorro-antd/icon';

@Component({
  selector: 'inspector-section',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NzFormModule, NzInputModule, NzDividerModule, NzInputNumberModule, NzSelectModule, NzIconModule, SpacingEditorComponent, MonacoJsonEditorComponent],
  template: `
    <div [formGroup]="group">
      <nz-form-item>
        <nz-form-label nzFor="sec_title" nzTooltipTitle="Titre affiché au-dessus de la section">
          <span>Titre de la section</span>
        </nz-form-label>
        <nz-form-control><input nz-input id="sec_title" formControlName="title"/></nz-form-control>
      </nz-form-item>
      <nz-form-item>
        <nz-form-label nzFor="sec_desc" nzTooltipTitle="Texte d’introduction ou d’aide pour la section">
          <span>Description</span>
        </nz-form-label>
        <nz-form-control><textarea nz-input rows="3" id="sec_desc" formControlName="description"></textarea></nz-form-control>
      </nz-form-item>
      <div class="ins-section-header">
        <div class="card-title">
          <span class="t">Mode & Liste</span>
          <span class="s">Normal ou liste d’items (array)</span>
        </div>
      </div>
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; align-items:center;">
        <nz-form-item>
          <nz-form-label nzFor="sec_mode" nzTooltipTitle="Choisir entre section simple ou liste (array)">
            <span>Mode</span>
          </nz-form-label>
          <nz-form-control>
            <nz-select id="sec_mode" formControlName="sec_mode">
              <nz-option nzValue="normal" nzLabel="Normal"></nz-option>
              <nz-option nzValue="array" nzLabel="Array (liste d'items)"></nz-option>
            </nz-select>
          </nz-form-control>
        </nz-form-item>
        <nz-form-item *ngIf="group.get('sec_mode')?.value === 'array'">
          <nz-form-label nzFor="sec_key" nzTooltipTitle="Clé du FormArray pour cette liste">
            <span>Clé (liste)</span>
          </nz-form-label>
          <nz-form-control><input nz-input id="sec_key" formControlName="sec_key" placeholder="ex: items"/></nz-form-control>
        </nz-form-item>
      </div>
      <div *ngIf="group.get('sec_mode')?.value === 'array'" style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; align-items:center;">
        <nz-form-item>
          <nz-form-label nzFor="arr_initial" nzTooltipTitle="Nombre d’éléments au départ">
            <span>Items initiaux</span>
          </nz-form-label>
          <nz-form-control><nz-input-number style="width:100%" formControlName="arr_initial" [nzMin]="0"></nz-input-number></nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label nzFor="arr_min" nzTooltipTitle="Nombre minimum d’éléments requis">
            <span>Min items</span>
          </nz-form-label>
          <nz-form-control><nz-input-number style="width:100%" formControlName="arr_min" [nzMin]="0"></nz-input-number></nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label nzFor="arr_max" nzTooltipTitle="Nombre maximum d’éléments autorisés">
            <span>Max items</span>
          </nz-form-label>
          <nz-form-control><nz-input-number style="width:100%" formControlName="arr_max" [nzMin]="1"></nz-input-number></nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label nzFor="arr_addText" nzTooltipTitle="Libellé du bouton d’ajout">
            <span>Ajouter (texte)</span>
          </nz-form-label>
          <nz-form-control><input nz-input formControlName="arr_addText"/></nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label nzFor="arr_removeText" nzTooltipTitle="Libellé du bouton de suppression">
            <span>Supprimer (texte)</span>
          </nz-form-label>
          <nz-form-control><input nz-input formControlName="arr_removeText"/></nz-form-control>
        </nz-form-item>
      </div>
      <div class="ins-section-header">
        <div class="card-title">
          <span class="t">Mise en forme interne</span>
          <span class="s">Héritage & Overrides</span>
        </div>
      </div>
      <div class="ins-grid cols-2">
        <nz-form-item>
          <nz-form-label nzTooltipTitle="Disposition interne de la section (si défini)">
            <span>Layout</span>
          </nz-form-label>
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
          <nz-form-label nzTooltipTitle="Alignement des libellés dans cette section">
            <span>Align label</span>
          </nz-form-label>
          <nz-form-control>
            <nz-select formControlName="sec_ui_labelAlign" style="min-width:140px;">
              <nz-option nzValue="" nzLabel="Inherit"></nz-option>
              <nz-option nzValue="left" nzLabel="Left"></nz-option>
              <nz-option nzValue="right" nzLabel="Right"></nz-option>
            </nz-select>
          </nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label nzTooltipTitle="Placer les libellés au-dessus (override)">
            <span>Labels on top</span>
          </nz-form-label>
          <nz-form-control>
            <nz-select formControlName="sec_ui_labelsOnTop" style="min-width:140px;">
              <nz-option [nzValue]="null" nzLabel="Inherit"></nz-option>
              <nz-option [nzValue]="true" nzLabel="Oui"></nz-option>
              <nz-option [nzValue]="false" nzLabel="Non"></nz-option>
            </nz-select>
          </nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label nzTooltipTitle="Colonnes pour le libellé (override)">
            <span>Label span</span>
          </nz-form-label>
          <nz-form-control><nz-input-number formControlName="sec_ui_labelColSpan" [nzMin]="1" [nzMax]="24"></nz-input-number></nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label nzTooltipTitle="Colonnes pour le champ (override)">
            <span>Control span</span>
          </nz-form-label>
          <nz-form-control><nz-input-number style="width:100%" formControlName="sec_ui_controlColSpan" [nzMin]="1" [nzMax]="24"></nz-input-number></nz-form-control>
        </nz-form-item>
      </div>
      <div class="ins-section-header">
        <div class="card-title">
          <span class="t">Titre & Description</span>
          <span class="s">Couleurs, tailles & marges</span>
        </div>
      </div>
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
        <nz-form-item>
          <nz-form-label nzTooltipTitle="Couleur du titre de section">
            <span>Titre couleur</span>
          </nz-form-label>
          <nz-form-control><input nz-input formControlName="sec_titleColor" placeholder="#000 or red"/></nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label nzTooltipTitle="Taille de police du titre (px)">
            <span>Titre fontSize</span>
          </nz-form-label>
          <nz-form-control><nz-input-number formControlName="sec_titleFontSize" [nzMin]="8"></nz-input-number></nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label nzTooltipTitle="Marge haute/basse du titre">
            <span>Titre MT/MB</span>
          </nz-form-label>
          <nz-form-control>
            <div style="display:flex; gap:6px;">
              <nz-input-number formControlName="sec_titleMT" [nzMin]="0" placeholder="MT"></nz-input-number>
              <nz-input-number formControlName="sec_titleMB" [nzMin]="0" placeholder="MB"></nz-input-number>
            </div>
          </nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label nzTooltipTitle="Couleur de la description">
            <span>Desc couleur</span>
          </nz-form-label>
          <nz-form-control><input nz-input formControlName="sec_descColor" placeholder="#666"/></nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label nzTooltipTitle="Taille de police de la description (px)">
            <span>Desc fontSize</span>
          </nz-form-label>
          <nz-form-control><nz-input-number style="width:100%" formControlName="sec_descFontSize" [nzMin]="8"></nz-input-number></nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label nzTooltipTitle="Marge haute/basse de la description">
            <span>Desc MT/MB</span>
          </nz-form-label>
          <nz-form-control>
            <div style="display:flex; gap:6px;">
              <nz-input-number formControlName="sec_descMT" [nzMin]="0" placeholder="MT"></nz-input-number>
              <nz-input-number formControlName="sec_descMB" [nzMin]="0" placeholder="MB"></nz-input-number>
            </div>
          </nz-form-control>
        </nz-form-item>
      </div>
      <nz-form-item>
        <nz-form-label nzTooltipTitle="Espace entre colonnes (gutter)">
          <span>Grid gutter</span>
        </nz-form-label>
        <nz-form-control><nz-input-number style="width:100%" formControlName="gridGutter" [nzMin]="0"></nz-input-number></nz-form-control>
      </nz-form-item>
      <div class="ins-section-header">
        <div class="card-title">
          <span class="t">Conditions</span>
          <span class="s">Visibilité de la section</span>
        </div>
      </div>
      <div class="editor-block">
        <div class="editor-toolbar" nz-tooltip nzTooltipTitle="Condition de visibilité (JSON logique)">
          <div class="title">visibleIf (JSON)</div>
          <button nz-button nzSize="small" class="apple-btn" (click)="openCondition.emit(); $event.preventDefault(); $event.stopPropagation()">
            <i nz-icon nzType="build"></i>
            <span style="margin-left:6px">Builder</span>
          </button>
        </div>
        <monaco-json-editor [value]="$any(group.controls['visibleIf'].value)" (valueChange)="group.get('visibleIf')?.setValue($event)" [height]="160"></monaco-json-editor>
      </div>
      <div class="ins-section-header">
        <div class="card-title">
          <span class="t">Colonnes</span>
          <span class="s">Répartition sur la grille</span>
        </div>
      </div>
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

      <div class="ins-section-header">
        <div class="card-title">
          <span class="t">Espacement</span>
          <span class="s">Margins / Padding</span>
        </div>
      </div>
      <app-spacing-editor [group]="group"></app-spacing-editor>
      <div class="btn-row" style="margin-top:8px;">
        <button nz-button nzSize="small" class="apple-btn" (click)="openTitleStyle.emit()">
          <i nz-icon nzType="highlight"></i>
          <span class="label">Configurer style Titre…</span>
        </button>
        <button nz-button nzSize="small" class="apple-btn" (click)="openDescStyle.emit()">
          <i nz-icon nzType="bg-colors"></i>
          <span class="label">Configurer style Description…</span>
        </button>
      </div>
    </div>
  `
  ,
  styleUrls: ['./inspector-section.component.scss']
})
export class InspectorSectionComponent {
  @Input({ required: true }) group!: FormGroup;
  @Output() openTitleStyle = new EventEmitter<void>();
  @Output() openDescStyle = new EventEmitter<void>();
  @Output() openCondition = new EventEmitter<void>();
}
