import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzMessageService } from 'ng-zorro-antd/message';
import { AiService } from '../ai.service';

@Component({
  selector: 'ai-user-preferences',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    NzButtonModule, NzIconModule, NzSelectModule, NzCheckboxModule,
    NzInputNumberModule, NzDividerModule, NzSpinModule,
  ],
  template: `
    <div class="prefs-wrap" *ngIf="!loading; else spin">
      <form [formGroup]="form" (ngSubmit)="save()">
        <!-- Général -->
        <div class="group">
          <div class="group-title">Général</div>
          <div class="field">
            <label>Niveau d'autonomie par défaut</label>
            <nz-select formControlName="defaultAutonomyLevel" style="width:100%">
              <nz-option nzValue="prudent" nzLabel="Prudent (confirmer chaque action)"></nz-option>
              <nz-option nzValue="balanced" nzLabel="Équilibré (confirmer les actions sensibles)"></nz-option>
              <nz-option nzValue="autonomous" nzLabel="Autonome (agir sans confirmation)"></nz-option>
            </nz-select>
          </div>
          <div class="field">
            <label>Agent par défaut</label>
            <nz-select formControlName="defaultAgentId" nzAllowClear style="width:100%">
              <nz-option nzValue="general" nzLabel="Assistant général"></nz-option>
              <nz-option *ngFor="let a of ai.availableAgents()" [nzValue]="a.id" [nzLabel]="a.name"></nz-option>
            </nz-select>
          </div>
        </div>

        <nz-divider></nz-divider>

        <!-- Cache -->
        <div class="group" formGroupName="cacheBehavior">
          <div class="group-title">Cache</div>
          <label nz-checkbox formControlName="autoSyncOnIdle">Synchroniser automatiquement en période inactive</label>
          <div class="field">
            <label>Délai d'inactivité (heures)</label>
            <nz-input-number formControlName="idleTtlHours" [nzMin]="1" [nzMax]="168" style="width:120px"></nz-input-number>
          </div>
          <label nz-checkbox formControlName="askBeforeSync">Demander avant de synchroniser</label>
          <label nz-checkbox formControlName="askBeforeCleanup">Demander avant de nettoyer</label>
          <label nz-checkbox formControlName="keepCacheAfterClose">Conserver le cache à la fermeture</label>
        </div>

        <nz-divider></nz-divider>

        <!-- Permissions -->
        <div class="group" formGroupName="permissionDefaults">
          <div class="group-title">Permissions</div>
          <label nz-checkbox formControlName="alwaysAllowSafe">Autoriser toujours les actions sans risque</label>
          <label nz-checkbox formControlName="autoAllowWriteInProjectScope">Autoriser les écritures dans le scope projet</label>
          <label nz-checkbox formControlName="codeExecutionAllowed">Autoriser l'exécution de code</label>
        </div>

        <nz-divider></nz-divider>

        <!-- Canvas -->
        <div class="group" formGroupName="canvasBehavior">
          <div class="group-title">Canvas</div>
          <label nz-checkbox formControlName="autoOpenOnDocument">Ouvrir sur création de document</label>
          <label nz-checkbox formControlName="autoOpenOnResearch">Ouvrir sur recherche web</label>
          <label nz-checkbox formControlName="autoOpenOnProjectMode">Ouvrir en mode projet</label>
          <div class="field">
            <label>Onglet par défaut</label>
            <nz-select formControlName="defaultTab" style="width:100%">
              <nz-option nzValue="document" nzLabel="Document"></nz-option>
              <nz-option nzValue="research" nzLabel="Recherche"></nz-option>
              <nz-option nzValue="tasks" nzLabel="Tâches"></nz-option>
              <nz-option nzValue="files" nzLabel="Fichiers"></nz-option>
            </nz-select>
          </div>
        </div>

        <nz-divider></nz-divider>

        <!-- Search -->
        <div class="group">
          <div class="group-title">Recherche web</div>
          <div class="field">
            <label>Fournisseur</label>
            <nz-select formControlName="webSearchProvider" nzAllowClear style="width:100%">
              <nz-option nzValue="tavily" nzLabel="Tavily"></nz-option>
              <nz-option nzValue="brave" nzLabel="Brave"></nz-option>
              <nz-option nzValue="google" nzLabel="Google"></nz-option>
              <nz-option nzValue="duckduckgo" nzLabel="DuckDuckGo"></nz-option>
            </nz-select>
          </div>
        </div>

        <div class="actions">
          <button nz-button nzType="primary" type="submit" [disabled]="saving">
            <span nz-icon *ngIf="saving" nzType="loading" nzTheme="outline"></span>
            Enregistrer
          </button>
        </div>
      </form>
    </div>
    <ng-template #spin><nz-spin nzSimple></nz-spin></ng-template>
  `,
  styles: [`
    .prefs-wrap { padding: 8px 12px; }
    .group { margin-bottom: 12px; }
    .group-title { font-size: 12px; font-weight: 600; color: #555; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
    .field { margin: 8px 0; }
    .field label { display: block; font-size: 12px; color: #666; margin-bottom: 4px; }
    label[nz-checkbox] { display: block; margin: 6px 0; }
    .actions { display: flex; justify-content: flex-end; margin-top: 12px; }
  `],
})
export class AiUserPreferencesComponent implements OnInit {
  public ai = inject(AiService);
  private fb = inject(FormBuilder);
  private nzMsg = inject(NzMessageService);

  form!: FormGroup;
  loading = true;
  saving = false;

  ngOnInit() {
    this.form = this.fb.group({
      defaultAutonomyLevel: ['autonomous'],
      defaultAgentId: ['general'],
      cacheBehavior: this.fb.group({
        autoSyncOnIdle: [true],
        idleTtlHours: [24],
        askBeforeSync: [true],
        askBeforeCleanup: [true],
        keepCacheAfterClose: [false],
      }),
      permissionDefaults: this.fb.group({
        alwaysAllowSafe: [true],
        autoAllowWriteInProjectScope: [false],
        codeExecutionAllowed: [false],
      }),
      canvasBehavior: this.fb.group({
        autoOpenOnDocument: [true],
        autoOpenOnResearch: [true],
        autoOpenOnProjectMode: [true],
        defaultTab: ['document'],
      }),
      webSearchProvider: [null],
    });
    this.load();
  }

  async load() {
    this.loading = true;
    const p = await this.ai.loadPreferences();
    if (p) this.form.patchValue(p);
    this.loading = false;
  }

  async save() {
    if (this.saving) return;
    this.saving = true;
    try {
      await this.ai.updateUserPreferences(this.form.value);
      this.nzMsg.success('Préférences enregistrées');
    } catch (e: any) {
      this.nzMsg.error(e?.message || 'Erreur');
    } finally {
      this.saving = false;
    }
  }
}
