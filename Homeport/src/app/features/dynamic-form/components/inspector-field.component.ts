import { Component, EventEmitter, HostListener, Input, Output, OnChanges, OnDestroy, DoCheck, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzColorPickerModule } from 'ng-zorro-antd/color-picker';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { SpacingEditorComponent } from './spacing-editor.component';
import { MonacoJsonEditorComponent } from './monaco-json-editor.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'inspector-field',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NzFormModule, NzInputModule, NzSelectModule, NzInputNumberModule, NzDividerModule, NzSwitchModule, NzCheckboxModule, NzColorPickerModule, NzToolTipModule, NzIconModule, SpacingEditorComponent, MonacoJsonEditorComponent],
  template: `
    <form nz-form [formGroup]="group" class="inspector-form" nzLayout="vertical">
      <nav class="inspector-tabs" role="tablist" aria-label="Onglets de l’inspecteur">
        <button type="button" class="tab-btn" [class.active]="activeTab==='general'" (click)="setTab('general')" role="tab" [attr.aria-selected]="activeTab==='general'">Général</button>
        <button type="button" class="tab-btn" [class.active]="activeTab==='logic'" (click)="setTab('logic')" role="tab" [attr.aria-selected]="activeTab==='logic'">Logique</button>
        <button type="button" class="tab-btn" [class.active]="activeTab==='json'" (click)="setTab('json')" role="tab" [attr.aria-selected]="activeTab==='json'">Paramètres</button>
      </nav>

      <ng-container *ngIf="activeTab==='general'">
        <div class="inspector-accordion" [class.has-open]="hasOpenSections()">
          <div class="inspector-panel__inner">
            <div class="inline-2">
              <nz-form-item [class.span-2]="group.get('type')?.value==='textblock'">
                <nz-form-label nzFor="fld_type" nzTooltipTitle="Type de champ (texte, nombre, date…)"><span>Type de champ</span></nz-form-label>
                <nz-form-control>
                  <ng-container *ngIf="!isMobileOrTablet; else nativeFieldType">
                    <nz-select id="fld_type" formControlName="type">
                      <nz-option nzValue="text" nzLabel="text"></nz-option>
                      <nz-option nzValue="textarea" nzLabel="textarea"></nz-option>
                      <nz-option nzValue="number" nzLabel="number"></nz-option>
                      <nz-option nzValue="date" nzLabel="date"></nz-option>
                      <nz-option nzValue="cron" nzLabel="cron"></nz-option>
                      <nz-option nzValue="select" nzLabel="select"></nz-option>
                      <nz-option nzValue="radio" nzLabel="radio"></nz-option>
                      <nz-option nzValue="checkbox" nzLabel="checkbox"></nz-option>
                      <nz-option nzValue="file" nzLabel="file"></nz-option>
                      <nz-option nzValue="email" nzLabel="email"></nz-option>
                      <nz-option nzValue="tel" nzLabel="tel"></nz-option>
                      <nz-option nzValue="color" nzLabel="color"></nz-option>
                      <nz-option nzValue="rate" nzLabel="rate"></nz-option>
                      <nz-option nzValue="tags" nzLabel="tags"></nz-option>
                      <nz-option nzValue="schema_builder" nzLabel="schema_builder"></nz-option>
                      <nz-option nzValue="textblock" nzLabel="textblock"></nz-option>
                    </nz-select>
                  </ng-container>
                  <ng-template #nativeFieldType>
                    <select id="fld_type" class="native-select" formControlName="type">
                      <option value="text">text</option>
                      <option value="textarea">textarea</option>
                      <option value="number">number</option>
                      <option value="date">date</option>
                      <option value="cron">cron</option>
                      <option value="select">select</option>
                      <option value="radio">radio</option>
                      <option value="checkbox">checkbox</option>
                      <option value="file">file</option>
                      <option value="email">email</option>
                      <option value="tel">tel</option>
                      <option value="color">color</option>
                      <option value="rate">rate</option>
                      <option value="tags">tags</option>
                      <option value="schema_builder">schema_builder</option>
                      <option value="textblock">textblock</option>
                    </select>
                  </ng-template>
                </nz-form-control>
              </nz-form-item>
              <ng-container *ngIf="group.get('type')?.value !== 'textblock'">
                <nz-form-item>
                  <nz-form-label nzTooltipTitle="Champ requis pour valider le formulaire"><span>Obligatoire</span></nz-form-label>
                  <nz-form-control>
                    <nz-switch [(ngModel)]="v_required" [ngModelOptions]="{standalone:true}" (ngModelChange)="onValidatorsChanged()"></nz-switch>
                  </nz-form-control>
                </nz-form-item>
              </ng-container>
            </div>

            <ng-container *ngIf="group.get('type')?.value !== 'textblock'">
              <nz-form-item>
                <nz-form-label nzFor="fld_key" nzTooltipTitle="Clé unique pour référencer la valeur"><span>Clé</span></nz-form-label>
                <nz-form-control [nzValidateStatus]="keyDuplicateMessage ? 'error' : ''">
                  <input nz-input id="fld_key" formControlName="key"/>
                  <div class="key-error" *ngIf="keyDuplicateMessage">{{ keyDuplicateMessage }}</div>
                </nz-form-control>
              </nz-form-item>
              <nz-form-item>
                <nz-form-label nzFor="fld_label" nzTooltipTitle="Libellé affiché à l’utilisateur"><span>Libellé</span></nz-form-label>
                <nz-form-control><input nz-input id="fld_label" formControlName="label"/></nz-form-control>
              </nz-form-item>
              <nz-form-item>
                <nz-form-label nzFor="fld_placeholder" nzTooltipTitle="Texte indicatif dans le champ"><span>Texte indicatif</span></nz-form-label>
                <nz-form-control><input nz-input id="fld_placeholder" formControlName="placeholder"/></nz-form-control>
              </nz-form-item>
              <nz-form-item>
                <nz-form-label nzFor="fld_desc" nzTooltipTitle="Aide sous le champ"><span>Description</span></nz-form-label>
                <nz-form-control><textarea nz-input rows="2" id="fld_desc" formControlName="description"></textarea></nz-form-control>
              </nz-form-item>
              <ng-container *ngIf="group.get('type')?.value==='cron'">
                <nz-form-item>
                  <nz-form-control>
                    <div style="display:grid; grid-template-columns: 1fr 1fr; align-items:center; column-gap:16px;">
                      <div style="display:flex; align-items:center; gap:6px;">
                        <span nz-tooltip [nzTooltipTitle]="'Activer l’affichage des secondes dans l’expression'">Avec secondes</span>
                        <label nz-checkbox formControlName="cron_showSeconds"></label>
                      </div>
                      <div style="display:flex; align-items:center; gap:6px;">
                        <span nz-tooltip [nzTooltipTitle]="'Afficher l’accordéon des règles cron'">Accordéon</span>
                        <label nz-checkbox formControlName="cron_showAccordion"></label>
                      </div>
                    </div>
                  </nz-form-control>
                </nz-form-item>
                
              </ng-container>
              <ng-container *ngIf="group.get('type')?.value==='date'">
                <div class="ins-section-header" style="margin-top:8px;">
                  <div class="card-title"><span class="t">Date — Configuration</span><span class="s">Format et comportement</span></div>
                </div>
                <nz-form-item>
                  <nz-form-label nzTooltipTitle="Format d'affichage de la date (ex: dd/MM/yyyy, yyyy-MM-dd)"><span>Format</span></nz-form-label>
                  <nz-form-control>
                    <ng-container *ngIf="!isMobileOrTablet; else nativeDateFormat">
                      <nz-select formControlName="date_format">
                        <nz-option nzValue="dd/MM/yyyy" nzLabel="dd/MM/yyyy (31/12/2024)"></nz-option>
                        <nz-option nzValue="yyyy-MM-dd" nzLabel="yyyy-MM-dd (2024-12-31)"></nz-option>
                        <nz-option nzValue="dd/MM/yyyy HH:mm" nzLabel="dd/MM/yyyy HH:mm (31/12/2024 14:30)"></nz-option>
                        <nz-option nzValue="yyyy-MM-dd HH:mm" nzLabel="yyyy-MM-dd HH:mm (2024-12-31 14:30)"></nz-option>
                      </nz-select>
                    </ng-container>
                    <ng-template #nativeDateFormat>
                      <select class="native-select" formControlName="date_format">
                        <option value="dd/MM/yyyy">dd/MM/yyyy (31/12/2024)</option>
                        <option value="yyyy-MM-dd">yyyy-MM-dd (2024-12-31)</option>
                        <option value="dd/MM/yyyy HH:mm">dd/MM/yyyy HH:mm (31/12/2024 14:30)</option>
                        <option value="yyyy-MM-dd HH:mm">yyyy-MM-dd HH:mm (2024-12-31 14:30)</option>
                      </select>
                    </ng-template>
                  </nz-form-control>
                </nz-form-item>
                <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:8px;">
                  <nz-form-item class="switch-left">
                    <nz-form-label nzTooltipTitle="Inclure un sélecteur d'heure"><span>Avec heure</span></nz-form-label>
                    <nz-form-control><nz-switch formControlName="date_showTime"></nz-switch></nz-form-control>
                  </nz-form-item>
                  <nz-form-item class="switch-left">
                    <nz-form-label nzTooltipTitle="Afficher le bouton Aujourd'hui"><span>Aujourd'hui</span></nz-form-label>
                    <nz-form-control><nz-switch formControlName="date_showToday"></nz-switch></nz-form-control>
                  </nz-form-item>
                  <nz-form-item class="switch-left">
                    <nz-form-label nzTooltipTitle="Autoriser la suppression de la date"><span>Effaçable</span></nz-form-label>
                    <nz-form-control><nz-switch formControlName="date_allowClear"></nz-switch></nz-form-control>
                  </nz-form-item>
                </div>
              </ng-container>
              <ng-container *ngIf="group.get('type')?.value==='file'">
                <div class="ins-section-header" style="margin-top:8px;">
                  <div class="card-title"><span class="t">Fichier — Configuration</span><span class="s">Types, taille et comportement</span></div>
                </div>
                <nz-form-item>
                  <nz-form-label nzTooltipTitle="Types MIME ou extensions acceptés (ex: .pdf,.docx,image/*)"><span>Types acceptés</span></nz-form-label>
                  <nz-form-control><input nz-input formControlName="file_accept" placeholder=".pdf,.docx,image/*" /></nz-form-control>
                </nz-form-item>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
                  <nz-form-item>
                    <nz-form-label nzTooltipTitle="Taille maximale en octets (ex: 10485760 = 10 MB, 0 = illimité)"><span>Taille max (octets)</span></nz-form-label>
                    <nz-form-control><nz-input-number style="width:100%" formControlName="file_maxSize" [nzMin]="0" [nzStep]="1048576"></nz-input-number></nz-form-control>
                  </nz-form-item>
                  <nz-form-item>
                    <nz-form-label nzTooltipTitle="Nombre maximal de fichiers (si multiple)"><span>Nombre max</span></nz-form-label>
                    <nz-form-control><nz-input-number style="width:100%" formControlName="file_maxCount" [nzMin]="1" [nzMax]="100"></nz-input-number></nz-form-control>
                  </nz-form-item>
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
                  <nz-form-item class="switch-left">
                    <nz-form-label nzTooltipTitle="Autoriser plusieurs fichiers"><span>Multiple</span></nz-form-label>
                    <nz-form-control><nz-switch formControlName="file_multiple"></nz-switch></nz-form-control>
                  </nz-form-item>
                  <nz-form-item class="switch-left">
                    <nz-form-label nzTooltipTitle="Afficher un aperçu des images"><span>Aperçu</span></nz-form-label>
                    <nz-form-control><nz-switch formControlName="file_preview"></nz-switch></nz-form-control>
                  </nz-form-item>
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
                  <nz-form-item>
                    <nz-form-label nzTooltipTitle="Cycle de vie du fichier"><span>Cycle de vie</span></nz-form-label>
                    <nz-form-control>
                      <ng-container *ngIf="!isMobileOrTablet; else nativeFileLifecycle">
                        <nz-select formControlName="file_lifecycle">
                          <nz-option nzValue="temp" nzLabel="Temporaire"></nz-option>
                          <nz-option nzValue="execution" nzLabel="Exécution"></nz-option>
                          <nz-option nzValue="permanent" nzLabel="Permanent"></nz-option>
                        </nz-select>
                      </ng-container>
                      <ng-template #nativeFileLifecycle>
                        <select class="native-select" formControlName="file_lifecycle">
                          <option value="temp">Temporaire</option>
                          <option value="execution">Exécution</option>
                          <option value="permanent">Permanent</option>
                        </select>
                      </ng-template>
                    </nz-form-control>
                  </nz-form-item>
                  <nz-form-item>
                    <nz-form-label nzTooltipTitle="Style d'affichage de la liste"><span>Style liste</span></nz-form-label>
                    <nz-form-control>
                      <ng-container *ngIf="!isMobileOrTablet; else nativeFileListType">
                        <nz-select formControlName="file_listType">
                          <nz-option nzValue="text" nzLabel="Texte"></nz-option>
                          <nz-option nzValue="picture" nzLabel="Image"></nz-option>
                          <nz-option nzValue="picture-card" nzLabel="Carte image"></nz-option>
                        </nz-select>
                      </ng-container>
                      <ng-template #nativeFileListType>
                        <select class="native-select" formControlName="file_listType">
                          <option value="text">Texte</option>
                          <option value="picture">Image</option>
                          <option value="picture-card">Carte image</option>
                        </select>
                      </ng-template>
                    </nz-form-control>
                  </nz-form-item>
                </div>
                <nz-form-item>
                  <nz-form-label nzTooltipTitle="Texte personnalisé du bouton d'upload"><span>Texte du bouton</span></nz-form-label>
                  <nz-form-control><input nz-input formControlName="file_buttonText" placeholder="Choisir un fichier" /></nz-form-control>
                </nz-form-item>
                <nz-form-item>
                  <nz-form-label nzTooltipTitle="Texte d'aide affiché sous le champ"><span>Texte d'aide</span></nz-form-label>
                  <nz-form-control><input nz-input formControlName="file_hint" placeholder="PDF uniquement, max 10 MB" /></nz-form-control>
                </nz-form-item>
              </ng-container>
              <ng-container *ngIf="group.get('type')?.value==='color'">
                <div class="ins-section-header" style="margin-top:8px;">
                  <div class="card-title"><span class="t">Couleur — Configuration</span><span class="s">Format et affichage</span></div>
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
                  <nz-form-item class="switch-left">
                    <nz-form-label nzTooltipTitle="Afficher le code hexadécimal"><span>Afficher le texte</span></nz-form-label>
                    <nz-form-control><nz-switch formControlName="color_showText"></nz-switch></nz-form-control>
                  </nz-form-item>
                  <nz-form-item class="switch-left">
                    <nz-form-label nzTooltipTitle="Autoriser la suppression"><span>Effaçable</span></nz-form-label>
                    <nz-form-control><nz-switch formControlName="color_allowClear"></nz-switch></nz-form-control>
                  </nz-form-item>
                </div>
              </ng-container>
              <ng-container *ngIf="group.get('type')?.value==='rate'">
                <div class="ins-section-header" style="margin-top:8px;">
                  <div class="card-title"><span class="t">Note — Configuration</span><span class="s">0 à 5 étoiles</span></div>
                </div>
                <nz-form-item class="switch-left">
                  <nz-form-label nzTooltipTitle="Autoriser la saisie par demi-étoiles"><span>Demi-étoiles</span></nz-form-label>
                  <nz-form-control><nz-switch formControlName="rate_allowHalf"></nz-switch></nz-form-control>
                </nz-form-item>
              </ng-container>
              <nz-form-item *ngIf="group.get('type')?.value==='select' || group.get('type')?.value==='radio'">
                <nz-form-label>
                  <span class="inline-label-with-btn">
                    <span>Options</span>
                    <span nz-tooltip nzTooltipTitle="Configurer les options" class="label-tip">
                      <i nz-icon nzType="question-circle"></i>
                    </span>
                    <button type="button" nz-button nzSize="small" class="apple-btn cond-builder-btn" (click)="openOptions.emit(); $event.preventDefault(); $event.stopPropagation()">Configurer</button>
                  </span>
                </nz-form-label>
                <nz-form-control></nz-form-control>
              </nz-form-item>
            </ng-container>

            <ng-container *ngIf="group.get('type')?.value==='textblock'">
              <nz-form-item>
                <nz-form-label>HTML</nz-form-label>
                <nz-form-control><textarea nz-input rows="6" formControlName="textHtml"></textarea></nz-form-control>
              </nz-form-item>
            </ng-container>
          </div>

          <section class="inspector-panel" [class.open]="sectionsOpen.ui">
            <button type="button" class="inspector-panel__header" (click)="toggleSection('ui')" [attr.aria-expanded]="sectionsOpen.ui">
              <span>Styles</span>
              <i class="fa-solid fa-chevron-down inspector-panel__icon"></i>
            </button>
            <div class="inspector-panel__content">
              <div class="inspector-panel__inner">
                <ng-container *ngIf="group.get('type')?.value !== 'textblock'">
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
                  <nz-form-item class="toggle-row">
                    <nz-form-label nzTooltipTitle="Autoriser les expressions (ex: calculs)"><span>Expressions</span></nz-form-label>
                    <nz-form-control>
                      <nz-switch formControlName="expression_allow"></nz-switch>
                    </nz-form-control>
                  </nz-form-item>
                  <ng-container *ngIf="group.get('type')?.value==='cron'">
                    <div class="ins-section-header">
                      <div class="card-title"><span class="t">Cron — Style</span><span class="s">Taille & bordure</span></div>
                    </div>
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
                      <nz-form-item>
                        <nz-form-label nzTooltipTitle="Taille du composant cron"><span>Taille du cron</span></nz-form-label>
                        <nz-form-control>
                          <ng-container *ngIf="!isMobileOrTablet; else nativeCronSize">
                            <nz-select formControlName="cron_size">
                              <nz-option nzValue="default" nzLabel="default"></nz-option>
                              <nz-option nzValue="small" nzLabel="small"></nz-option>
                              <nz-option nzValue="large" nzLabel="large"></nz-option>
                            </nz-select>
                          </ng-container>
                          <ng-template #nativeCronSize>
                            <select class="native-select" formControlName="cron_size">
                              <option value="default">default</option>
                              <option value="small">small</option>
                              <option value="large">large</option>
                            </select>
                          </ng-template>
                        </nz-form-control>
                      </nz-form-item>
                      <nz-form-item class="switch-left">
                        <nz-form-label nzTooltipTitle="Masquer la bordure du composant cron"><span>Bordure du cron</span></nz-form-label>
                        <nz-form-control><nz-switch formControlName="cron_borderless"></nz-switch></nz-form-control>
                      </nz-form-item>
                    </div>
                  </ng-container>
                  <ng-container *ngIf="group.get('expression_allow')?.value === true">
                    <div class="ins-section-header"><div class="card-title"><span class="t">Expressions — Options</span><span class="s">Comportement de l’éditeur</span></div></div>
                    <div class="ins-grid cols-2">
                      <nz-form-item>
                        <nz-form-label nzTooltipTitle="Mode par défaut à l’ouverture"><span>Mode par défaut</span></nz-form-label>
                        <nz-form-control>
                          <ng-container *ngIf="!isMobileOrTablet; else nativeExpressionDefaultMode">
                            <nz-select formControlName="expression_defaultMode">
                              <nz-option nzValue="val" nzLabel="Valeur"></nz-option>
                              <nz-option nzValue="expr" nzLabel="Expression"></nz-option>
                            </nz-select>
                          </ng-container>
                          <ng-template #nativeExpressionDefaultMode>
                            <select class="native-select" formControlName="expression_defaultMode">
                              <option value="val">Valeur</option>
                              <option value="expr">Expression</option>
                            </select>
                          </ng-template>
                        </nz-form-control>
                      </nz-form-item>
                      <nz-form-item class="switch-left">
                        <nz-form-label nzTooltipTitle="Agrandir la zone d’édition"><span>Grand</span></nz-form-label>
                        <nz-form-control><nz-switch formControlName="expression_large"></nz-switch></nz-form-control>
                      </nz-form-item>
                      <nz-form-item class="switch-left">
                        <nz-form-label nzTooltipTitle="Afficher un bouton pour ouvrir un dialogue"><span>Action dialogue</span></nz-form-label>
                        <nz-form-control><nz-switch formControlName="expression_showDialogAction"></nz-switch></nz-form-control>
                      </nz-form-item>
                      <nz-form-item *ngIf="group.get('expression_showDialogAction')?.value === true">
                        <nz-form-label nzTooltipTitle="Titre du dialogue"><span>Titre dialogue</span></nz-form-label>
                        <nz-form-control><input nz-input formControlName="expression_dialogTitle" /></nz-form-control>
                      </nz-form-item>
                      <nz-form-item *ngIf="group.get('expression_showDialogAction')?.value === true">
                        <nz-form-label nzTooltipTitle="Mode du dialogue"><span>Mode dialogue</span></nz-form-label>
                        <nz-form-control>
                          <ng-container *ngIf="!isMobileOrTablet; else nativeExpressionDialogMode">
                            <nz-select formControlName="expression_dialogMode">
                              <nz-option nzValue="textarea" nzLabel="Textarea"></nz-option>
                              <nz-option nzValue="editor" nzLabel="Éditeur avancé"></nz-option>
                            </nz-select>
                          </ng-container>
                          <ng-template #nativeExpressionDialogMode>
                            <select class="native-select" formControlName="expression_dialogMode">
                              <option value="textarea">Textarea</option>
                              <option value="editor">Éditeur avancé</option>
                            </select>
                          </ng-template>
                        </nz-form-control>
                      </nz-form-item>
                      <nz-form-item class="switch-left">
                        <nz-form-label nzTooltipTitle="Ajuster automatiquement la hauteur"><span>Auto-height</span></nz-form-label>
                        <nz-form-control><nz-switch formControlName="expression_autoHeight"></nz-switch></nz-form-control>
                      </nz-form-item>
                      <nz-form-item class="switch-left">
                        <nz-form-label nzTooltipTitle="Groupe de bouton avant (formule)"><span>Bouton gauche</span></nz-form-label>
                        <nz-form-control><nz-switch formControlName="expression_groupBefore"></nz-switch></nz-form-control>
                      </nz-form-item>
                      <nz-form-item class="switch-left">
                        <nz-form-label nzTooltipTitle="Afficher l’action formule"><span>Action formule</span></nz-form-label>
                        <nz-form-control><nz-switch formControlName="expression_showFormulaAction"></nz-switch></nz-form-control>
                      </nz-form-item>
                      <nz-form-item>
                        <nz-form-label nzTooltipTitle="Position des suggestions"><span>Suggestions</span></nz-form-label>
                        <nz-form-control>
                          <ng-container *ngIf="!isMobileOrTablet; else nativeExpressionSuggestionPlacement">
                            <nz-select formControlName="expression_suggestionPlacement">
                              <nz-option nzValue="auto" nzLabel="Auto"></nz-option>
                              <nz-option nzValue="top" nzLabel="Haut"></nz-option>
                              <nz-option nzValue="bottom" nzLabel="Bas"></nz-option>
                            </nz-select>
                          </ng-container>
                          <ng-template #nativeExpressionSuggestionPlacement>
                            <select class="native-select" formControlName="expression_suggestionPlacement">
                              <option value="auto">Auto</option>
                              <option value="top">Haut</option>
                              <option value="bottom">Bas</option>
                            </select>
                          </ng-template>
                        </nz-form-control>
                      </nz-form-item>
                      <nz-form-item class="switch-left">
                        <nz-form-label nzTooltipTitle="Colorer selon validité"><span>Mode erreurs</span></nz-form-label>
                        <nz-form-control><nz-switch formControlName="expression_errorMode"></nz-switch></nz-form-control>
                      </nz-form-item>
                      <nz-form-item class="switch-left">
                        <nz-form-label nzTooltipTitle="Montrer l’aperçu du résultat"><span>Aperçu</span></nz-form-label>
                        <nz-form-control><nz-switch formControlName="expression_showPreview"></nz-switch></nz-form-control>
                      </nz-form-item>
                      <nz-form-item class="switch-left">
                        <nz-form-label nzTooltipTitle="Afficher inline"><span>Inline</span></nz-form-label>
                        <nz-form-control><nz-switch formControlName="expression_inline"></nz-switch></nz-form-control>
                      </nz-form-item>
                      <nz-form-item class="switch-left">
                        <nz-form-label nzTooltipTitle="Cacher les erreurs d’expression en prévisualisation"><span>Masquer erreurs (preview)</span></nz-form-label>
                        <nz-form-control>
                          <nz-switch formControlName="expression_hideErrors"></nz-switch>
                        </nz-form-control>
                      </nz-form-item>
                    </div>
                  </ng-container>
                </ng-container>

                <ng-container *ngIf="group.get('type')?.value==='textblock'">
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
                </ng-container>

                <ng-container *ngIf="group.get('type')?.value !== 'textblock'">
                  <div class="ins-section-header"><div class="card-title"><span class="t">Espacement</span><span class="s">Marges & padding</span></div></div>
                  <app-spacing-editor [group]="group"></app-spacing-editor>
                </ng-container>

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
                <ng-container *ngIf="group.get('type')?.value !== 'textblock'; else noFieldParams">
                  <nz-form-item>
                    <nz-form-label nzFor="fld_default" nzTooltipTitle="Valeur par défaut"><span>Valeur par défaut</span></nz-form-label>
                    <nz-form-control>
                      <ng-container *ngIf="group.get('type')?.value==='rate'; else genericDefaultInput">
                        <nz-input-number
                          style="width: 100%"
                          id="fld_default"
                          formControlName="default"
                          [nzMin]="0"
                          [nzMax]="5"
                          [nzStep]="group.get('rate_allowHalf')?.value === true ? 0.5 : 1">
                        </nz-input-number>
                      </ng-container>
                      <ng-template #genericDefaultInput>
                        <input nz-input id="fld_default" formControlName="default"/>
                      </ng-template>
                    </nz-form-control>
                  </nz-form-item>
                  <nz-form-item class="toggle-row" *ngIf="group.get('type')?.value==='text' || group.get('type')?.value==='textarea' || group.get('type')?.value==='email' || group.get('type')?.value==='tel'">
                    <nz-form-label nzTooltipTitle="Masquer la saisie et l'affichage (secret)"><span>Secret</span></nz-form-label>
                    <nz-form-control>
                      <nz-switch formControlName="secret"></nz-switch>
                    </nz-form-control>
                  </nz-form-item>
                  <div class="ins-section-header"><div class="card-title"><span class="t">Validateurs</span><span class="s">Contraintes et règles</span></div></div>
                  <div class="ins-grid">
                    <ng-container *ngIf="group.get('type')?.value==='text' || group.get('type')?.value==='textarea' || group.get('type')?.value==='email' || group.get('type')?.value==='tel'">
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
                          <input nz-input [(ngModel)]="v_pattern" [ngModelOptions]="{standalone:true}" (ngModelChange)="onValidatorsChanged()" placeholder="^\\d+$" />
                        </nz-form-control>
                      </nz-form-item>
                    </ng-container>

                    <ng-container *ngIf="group.get('type')?.value==='number' || group.get('type')?.value==='rate'">
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
                      <nz-form-item class="span-2 toggle-row" *ngIf="group.get('type')?.value==='number'">
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
                </ng-container>

                <ng-template #noFieldParams>
                  <div class="inspector-empty">Aucun réglage avancé pour ce type.</div>
                </ng-template>
              </div>
            </div>
          </section>
        </div>
      </ng-container>

      <ng-container *ngIf="activeTab==='logic'">
        <div class="inspector-tab logic-tab">
          <ng-container *ngIf="group.get('type')?.value !== 'textblock'; else noLogic">
            <div class="ins-section-header"><div class="card-title"><span class="t">Conditions</span><span class="s">Affichage & validation</span></div></div>
            <div class="ins-grid span-2">
              <div class="editor-block span-2">
                <div class="editor-toolbar" nz-tooltip nzTooltipTitle="Condition de visibilité">
                  <div class="title">
                    Condition de visibilite
                    <span *ngIf="hasCondition('visibleIf')" class="cond-pill">Active</span>
                  </div>
                  <button type="button" nz-button nzSize="small" class="apple-btn cond-builder-btn" aria-label="Ouvrir le constructeur" (click)="openCondition.emit('visibleIf'); $event.preventDefault(); $event.stopPropagation()">
                    <i nz-icon nzType="build"></i>
                  </button>
                </div>
              </div>
              <div class="editor-block span-2">
                <div class="editor-toolbar" nz-tooltip nzTooltipTitle="Condition rendant le champ obligatoire">
                  <div class="title">
                    Condition d'obligation
                    <span *ngIf="hasCondition('requiredIf')" class="cond-pill">Active</span>
                  </div>
                  <button type="button" nz-button nzSize="small" class="apple-btn cond-builder-btn" aria-label="Ouvrir le constructeur" (click)="openCondition.emit('requiredIf'); $event.preventDefault(); $event.stopPropagation()">
                    <i nz-icon nzType="build"></i>
                  </button>
                </div>
              </div>
              <div class="editor-block span-2">
                <div class="editor-toolbar" nz-tooltip nzTooltipTitle="Condition de désactivation du champ">
                  <div class="title">
                    Condition de desactivation
                    <span *ngIf="hasCondition('disabledIf')" class="cond-pill">Active</span>
                  </div>
                  <button type="button" nz-button nzSize="small" class="apple-btn cond-builder-btn" aria-label="Ouvrir le constructeur" (click)="openCondition.emit('disabledIf'); $event.preventDefault(); $event.stopPropagation()">
                    <i nz-icon nzType="build"></i>
                  </button>
                </div>
              </div>
            </div>
          </ng-container>
          <ng-template #noLogic>
            <div class="inspector-empty">Aucune condition pour ce type.</div>
          </ng-template>
        </div>
      </ng-container>

      <ng-container *ngIf="activeTab==='json'">
        <div class="inspector-tab json-tab">
          <pre class="json">{{ group.value | json }}</pre>
        </div>
      </ng-container>
    </form>
  `,
  styleUrls: ['./inspector-field.component.scss']
})
export class InspectorFieldComponent implements OnChanges, OnDestroy, DoCheck {
  @Input({ required: true }) group!: FormGroup;
  @Input() keyDuplicateMessage: string | null = null;
  @Input() showLogicEditors: boolean = true;
  @Output() openOptions = new EventEmitter<void>();
  @Output() openCondition = new EventEmitter<'visibleIf'|'requiredIf'|'disabledIf'>();

  activeTab: 'general'|'logic'|'json' = 'general';
  sectionsOpen = {
    ui: false,
    advanced: false,
  };
  isMobileOrTablet = false;

  setTab(tab: 'general'|'logic'|'json') { this.activeTab = tab; }

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

  private validatorsSub?: Subscription;
  private lastValidatorsRaw: any = undefined;

  toggleSection(key: keyof InspectorFieldComponent['sectionsOpen']) {
    this.sectionsOpen[key] = !this.sectionsOpen[key];
  }

  hasOpenSections(): boolean {
    return Object.values(this.sectionsOpen).some(Boolean);
  }

  @HostListener('window:resize')
  onWindowResize() {
    this.isMobileOrTablet = false;
  }

  ngOnChanges(_c: SimpleChanges) {
    // Initialize UI from current validators JSON when field/type changes
    try {
      const raw = this.group?.get('validators')?.value as string;
      const arr = this.safeParseArray(raw);
      this.applyValidatorArray(arr);
    } catch {}
    this.bindValidators();
  }

  ngDoCheck(): void {
    const ctrl = this.group?.get('validators');
    if (!ctrl) return;
    const raw = ctrl.value;
    if (raw === this.lastValidatorsRaw) return;
    this.lastValidatorsRaw = raw;
    const arr = this.safeParseArray(raw);
    this.applyValidatorArray(arr);
  }

  ngOnDestroy(): void {
    try { this.validatorsSub?.unsubscribe(); } catch {}
  }

  onValidatorsChanged() {
    const out: any[] = [];
    // Required
    if (this.v_required) out.push({ type: 'required' });
    const type = this.group?.get('type')?.value;
    if (type === 'text' || type === 'textarea' || type === 'email' || type === 'tel') {
      if (typeof this.v_minLength === 'number') out.push({ type: 'minLength', value: this.v_minLength });
      if (typeof this.v_maxLength === 'number') out.push({ type: 'maxLength', value: this.v_maxLength });
      if (this.v_pattern && this.v_pattern.trim()) out.push({ type: 'pattern', value: this.v_pattern });
    } else if (type === 'number' || type === 'rate') {
      if (typeof this.v_min === 'number') out.push({ type: 'min', value: this.v_min });
      if (typeof this.v_max === 'number') out.push({ type: 'max', value: this.v_max });
      if (type === 'number' && this.v_integer) out.push({ type: 'integer' });
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

  private bindValidators() {
    try { this.validatorsSub?.unsubscribe(); } catch {}
    const ctrl = this.group?.get('validators');
    if (!ctrl) return;
    this.validatorsSub = ctrl.valueChanges.subscribe((raw) => {
      const arr = this.safeParseArray(raw);
      this.applyValidatorArray(arr);
    });
  }

  hasCondition(prop: 'visibleIf' | 'requiredIf' | 'disabledIf'): boolean {
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
