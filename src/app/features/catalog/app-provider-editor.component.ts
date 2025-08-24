import { CommonModule } from '@angular/common';
import { Component, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzColorPickerModule } from 'ng-zorro-antd/color-picker';
import { CatalogService, AppProvider } from '../../services/catalog.service';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { MonacoJsonEditorComponent } from '../dynamic-form/components/monaco-json-editor.component';
import { DynamicForm } from '../../modules/dynamic-form/dynamic-form';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';

@Component({
  selector: 'app-provider-editor',
  standalone: true,
  imports: [CommonModule, NzInputModule, ReactiveFormsModule, NzFormModule, NzInputModule, NzButtonModule, NzIconModule, NzColorPickerModule, NzSwitchModule, NzCheckboxModule, NzToolTipModule, MonacoJsonEditorComponent, DynamicForm],
  template: `
  <div class="editor">
    <div class="header">
      <div class="card-title left"><span class="t">App / Provider</span><span class="s">Créer / Éditer</span></div>
      <div class="actions">
        <button nz-button class="apple-btn" (click)="back()"><i nz-icon nzType="arrow-left"></i><span class="label">Retour</span></button>
        <button nz-button class="apple-btn" nzType="primary" [disabled]="form.invalid || saving" (click)="save()"><i nz-icon nzType="save"></i><span class="label">Enregistrer</span></button>
      </div>
    </div>
    <form [formGroup]="form" class="form" nz-form nzLayout="vertical">
      <div class="grid cols-2">
        <nz-form-item>
          <nz-form-label>Nom</nz-form-label>
          <nz-form-control><input nz-input formControlName="name" placeholder="Ex: Gmail" (blur)="ensureId()"/></nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label>ID</nz-form-label>
          <nz-form-control><input nz-input formControlName="id" placeholder="Ex: gmail"/></nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label>Titre</nz-form-label>
          <nz-form-control><input nz-input formControlName="title" placeholder="Affichage alternatif (optionnel)"/></nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label>Couleur</nz-form-label>
          <nz-form-control>
            <nz-color-picker formControlName="color" [nzFormat]="'hex'" [nzShowText]="true" [nzAllowClear]="false"></nz-color-picker>
          </nz-form-control>
        </nz-form-item>
        <nz-form-item class="span-2">
          <nz-form-label>Icône (classe FA)</nz-form-label>
          <nz-form-control><input nz-input formControlName="iconClass" placeholder="fa-brands fa-google"/></nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label>Icône (URL)</nz-form-label>
          <nz-form-control><input nz-input formControlName="iconUrl" placeholder="https://.../logo.svg"/></nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label>Aperçu</nz-form-label>
          <nz-form-control>
            <div class="icon" [style.background]="form.value.color || '#f3f4f6'">
              <i *ngIf="form.value.iconClass" [class]="form.value.iconClass" [style.color]="fgColor"></i>
              <img *ngIf="!form.value.iconClass && form.value.iconUrl" [src]="form.value.iconUrl" alt="icon"/>
              <img *ngIf="!form.value.iconClass && !form.value.iconUrl && form.value.id" [src]="simpleIconUrl(form.value.id, fgColor)" alt="icon"/>
            </div>
          </nz-form-control>
        </nz-form-item>
        <nz-form-item class="span-2">
          <nz-form-label>Tags</nz-form-label>
          <nz-form-control><input nz-input formControlName="tags" placeholder="email, google"/></nz-form-control>
        </nz-form-item>
      </div>
      <div class="grid cols-2" style="margin-top:12px;">
        <nz-form-item>
          <nz-form-label>Identifiants requis</nz-form-label>
          <nz-form-control>
            <nz-switch formControlName="hasCredentials"></nz-switch>
          </nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label>Autoriser sans credentials</nz-form-label>
          <nz-form-control>
            <nz-switch formControlName="allowWithoutCredentials" [nzDisabled]="!form.value.hasCredentials"></nz-switch>
          </nz-form-control>
        </nz-form-item>
      </div>

      <div *ngIf="form.value.hasCredentials" class="span-2 creds-block" style="margin-top:10px;">
        <div class="card-title" style="margin-bottom:6px;"><span class="t">Credentials</span><span class="s">Schéma (JSON) + aperçu + Form Builder</span></div>
        <div class="args-controls">
          <label nz-checkbox formControlName="fb_preset_tpl" nz-tooltip="Vertical + colonnes 24 + expressions activées par défaut">Appliquer preset (Form Builder)</label>
          <label nz-checkbox formControlName="show_creds_json" nz-tooltip="Afficher/masquer l’éditeur JSON">Afficher JSON (Monaco)</label>
          <span class="spacer"></span>
          <button nz-button type="button" class="apple-btn" (click)="openFormBuilderRoute(); $event.preventDefault(); $event.stopPropagation();"><i nz-icon nzType="form"></i><span class="label">Form Builder…</span></button>
        </div>
        <div class="args-row" [class.json-visible]="form.get('show_creds_json')?.value === true">
          <div class="preview-col">
            <div class="dialog-preview">
              <div class="dialog-box">
                <ng-container *ngIf="credsReady; else loadingTpl">
                  <ng-container *ngIf="isFormSchema(credsObj); else invalidSchema">
                    <app-dynamic-form [schema]="credsObj" [value]="{}" [forceBp]="'xs'" [hideActions]="true" [disableExpressions]="true"></app-dynamic-form>
                  </ng-container>
                  <ng-template #invalidSchema>
                    <div class="schema-hint">Le JSON ne ressemble pas à un schéma de formulaire (fields/steps). Corrigez ou utilisez le Form Builder.</div>
                  </ng-template>
                </ng-container>
                <ng-template #loadingTpl>
                  <div class="schema-loading">Chargement…</div>
                </ng-template>
              </div>
            </div>
          </div>
          <div class="json-col" *ngIf="form.get('show_creds_json')?.value">
            <monaco-json-editor class="json" [value]="credsJson" (valueChange)="onCredsChange($event)" [height]="220"></monaco-json-editor>
          </div>
        </div>
      </div>
      
    </form>
  </div>
  `,
  styles: [`
    .editor { padding: 12px; max-width: 920px; margin: 0 auto; }
    .header { display:flex; align-items:center; justify-content:space-between; margin-bottom: 10px; }
    .header .actions { display:flex; gap:8px; }
    .card-title { display:flex; flex-direction:column; }
    .card-title .t { font-weight:600; font-size:14px; }
    .card-title .s { font-size:12px; color:#64748b; }
    .grid { display:grid; gap:8px; }
    .grid.cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .grid .span-2 { grid-column: span 2; }
    .preview { margin-top: 10px; }
    .icon { width: 48px; height: 48px; border-radius: 10px; display:inline-flex; align-items:center; justify-content:center; overflow:hidden; }
    .icon img { width: 28px; height: 28px; object-fit: contain; display:block; }
    .args-controls { display:flex; align-items:center; gap:10px; margin: 6px 0; }
    .args-controls .spacer { flex: 1; }
    .args-row { display:grid; grid-template-columns: 1fr; gap:8px; }
    .args-row.json-visible { grid-template-columns: 1fr 1fr; }
    .dialog-preview { padding: 6px; }
    .dialog-box { border:1px dashed #e5e7eb; background: #fafafa; padding: 8px; border-radius: 10px; min-height: 80px; }
    .json { width: 100%; }
  `]
})
export class AppProviderEditorComponent implements OnInit {
  form!: FormGroup;
  saving = false;
  // Credentials JSON & preview state
  credsJson = '';
  credsReady = false;
  private _parsedSig = '';
  private _parsedCache: any = null;
  private preferCredsFromSession = false;
  constructor(private fb: FormBuilder, private catalog: CatalogService, private route: ActivatedRoute, private router: Router, private zone: NgZone, private cdr: ChangeDetectorRef) {}
  ngOnInit(): void {
    this.form = this.fb.group({
      id: new FormControl<string | null>(null, { validators: [Validators.required] }),
      name: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] }),
      title: new FormControl<string>(''),
      iconClass: new FormControl<string>(''),
      iconUrl: new FormControl<string>(''),
      color: new FormControl<string>('#1677ff'),
      tags: new FormControl<string>(''),
      hasCredentials: new FormControl<boolean>(false, { nonNullable: true }),
      allowWithoutCredentials: new FormControl<boolean>(false, { nonNullable: true }),
      fb_preset_tpl: new FormControl<boolean>(true, { nonNullable: true }),
      show_creds_json: new FormControl<boolean>(false, { nonNullable: true })
    });
    const id = this.route.snapshot.queryParamMap.get('id');
    // Handle return from /dynamic-form builder
    let lastSession: string | null = null;
    const tryLoad = (sess: string | null) => {
      if (!sess || sess === lastSession) return;
      lastSession = sess;
      try {
        const raw = localStorage.getItem('formbuilder.session.' + sess);
        if (raw) {
          this.credsJson = JSON.stringify(JSON.parse(raw), null, 2);
          this.credsReady = true;
          // Ensure the credentials section is visible upon return
          try { this.form.patchValue({ hasCredentials: true }, { emitEvent: false }); } catch {}
          this.preferCredsFromSession = true;
          localStorage.removeItem('formbuilder.session.' + sess);
          try { this.cdr.detectChanges(); } catch {}
        }
      } catch {}
    };
    tryLoad(this.route.snapshot.queryParamMap.get('fbSession'));
    try { this.route.queryParamMap.subscribe(map => tryLoad(map.get('fbSession'))); } catch {}
    const dup = this.route.snapshot.queryParamMap.get('duplicateFrom');
    // If user navigated back (without fbSession), try last session marker for this app
    const initialId = id || 'new';
    try {
      const lastSess = localStorage.getItem('formbuilder.session.last.app.' + initialId);
      if (lastSess) tryLoad(lastSess);
    } catch {}
    if (dup) {
      this.catalog.getApp(dup).subscribe(a => {
        if (a) {
          this.patch(a);
          // Clear id and tweak name/title for duplication
          this.form.patchValue({ id: null, name: (a.name || '') + ' (copie)' });
        }
      });
    } else if (id) {
      this.catalog.getApp(id).subscribe(a => a && this.patch(a));
    }
  }
  simpleIconUrl(id: string, color?: string) {
    const hex = (color || '#111').replace('#','');
    return `https://cdn.simpleicons.org/${encodeURIComponent(id)}/${hex}`;
  }
  get fgColor(): string {
    const bg = String(this.form?.value?.color || '#f3f4f6');
    try {
      const { r, g, b } = this.hexToRgb(bg);
      const yiq = (r * 299 + g * 587 + b * 114) / 1000;
      return yiq >= 140 ? '#111' : '#fff';
    } catch { return '#111'; }
  }
  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    let s = hex.trim();
    if (s.startsWith('#')) s = s.slice(1);
    if (s.length === 3) s = s.split('').map(c => c + c).join('');
    const num = parseInt(s, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return { r, g, b };
  }
  ensureId() {
    const id = this.form.value.id; const name = this.form.value.name || '';
    if (!id && name) this.form.patchValue({ id: this.slug(name) });
  }
  private slug(s: string) { return (s || '').trim().toLowerCase().normalize('NFD').replace(/[^\p{Letter}\p{Number}\s-]/gu, '').replace(/\s+/g, '-').replace(/-+/g, '-'); }
  private patch(a: AppProvider) {
    // Always patch base fields
    const base: any = {
      id: a.id,
      name: a.name || '',
      title: a.title || '',
      iconClass: a.iconClass || '',
      iconUrl: a.iconUrl || '',
      color: a.color || '#1677ff',
      tags: (a.tags || []).join(', '),
    };
    // When returning from Form Builder, do NOT override credentials toggles from storage
    if (!this.preferCredsFromSession) {
      base.hasCredentials = !!a.hasCredentials;
      base.allowWithoutCredentials = !!a.allowWithoutCredentials;
    }
    this.form.patchValue(base);
    // Initialize credentials JSON for preview/editor
    if (!this.preferCredsFromSession || !this.credsJson || this.credsJson.trim().length === 0) {
      this.credsJson = JSON.stringify(a.credentialsForm || { title: 'Credentials', ui: { layout: 'vertical' }, fields: [] }, null, 2);
      this.credsReady = true;
    }
    // reset prefer flag after first patch
    this.preferCredsFromSession = false;
  }
  back() { history.back(); }
  onCredsChange(v: string) { this.credsJson = v || ''; }
  get credsObj(): any {
    try {
      const sig = (this.credsJson || '').trim();
      if (this._parsedSig === sig && this._parsedCache) return this._parsedCache;
      if (!sig) { this._parsedSig = sig; this._parsedCache = { title: 'Credentials', fields: [] }; return this._parsedCache; }
      const parsed = JSON.parse(sig);
      this._parsedSig = sig; this._parsedCache = (parsed && typeof parsed === 'object') ? parsed : { title: 'Credentials', fields: [] };
      return this._parsedCache;
    } catch {
      this._parsedSig = this.credsJson || '';
      this._parsedCache = { title: 'Credentials', fields: [] };
      return this._parsedCache;
    }
  }
  isFormSchema(obj: any): boolean {
    try { if (!obj || typeof obj !== 'object') return false; return Array.isArray((obj as any).fields) || Array.isArray((obj as any).steps) || !!(obj as any).title; } catch { return false; }
  }
  openFormBuilderRoute() {
    try {
      const id = this.form.get('id')?.value;
      const name = this.form.get('name')?.value || 'Credentials';
      const session = 's_' + Date.now().toString(36);
      const schema = this.credsJson && this.credsJson.trim().length ? this.credsJson : JSON.stringify({ title: 'Credentials', fields: [] });
      const returnTo = this.router.createUrlTree(['/apps/editor'], { queryParams: { id, fbSession: session } }).toString();
      const tplPreset = this.form.get('fb_preset_tpl')?.value ? '1' : undefined;
      // Mark last session for this app so back navigation without fbSession can recover
      try { localStorage.setItem('formbuilder.session.last.app.' + (id || 'new'), session); } catch {}
      this.router.navigate(['/dynamic-form'], { queryParams: { session, return: returnTo, schema, lockTitle: name, tplPreset } });
    } catch { this.router.navigate(['/dynamic-form']); }
  }
  save() {
    if (this.form.invalid) return;
    this.saving = true;
    const v = this.form.value as any;
    let credsObj: any = {};
    try { credsObj = this.credsJson && this.credsJson.trim().length ? JSON.parse(this.credsJson) : {}; } catch { credsObj = {}; }
    const hasCredsFinal = (v.hasCredentials === true) || (credsObj && Object.keys(credsObj || {}).length > 0);
    const app: AppProvider = {
      id: v.id,
      name: v.name,
      title: v.title || undefined,
      iconClass: v.iconClass || undefined,
      iconUrl: v.iconUrl || undefined,
      color: v.color || undefined,
      tags: (v.tags || '').split(',').map((x:string)=>x.trim()).filter((x:string)=>!!x),
      hasCredentials: hasCredsFinal,
      allowWithoutCredentials: !!v.allowWithoutCredentials,
      credentialsForm: hasCredsFinal ? credsObj : undefined
    };
    this.catalog.saveApp(app).subscribe({ next: () => { this.saving = false; this.router.navigate(['/apps']); }, error: () => this.saving = false });
  }
}
