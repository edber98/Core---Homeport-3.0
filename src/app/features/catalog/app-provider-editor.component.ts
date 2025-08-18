import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzColorPickerModule } from 'ng-zorro-antd/color-picker';
import { CatalogService, AppProvider } from '../../services/catalog.service';

@Component({
  selector: 'app-provider-editor',
  standalone: true,
  imports: [CommonModule, NzInputModule, ReactiveFormsModule, NzFormModule, NzInputModule, NzButtonModule, NzIconModule, NzColorPickerModule],
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
        <nz-form-item class="span-2">
          <nz-form-label>Icône (URL)</nz-form-label>
          <nz-form-control><input nz-input formControlName="iconUrl" placeholder="https://.../logo.svg"/></nz-form-control>
        </nz-form-item>
        <nz-form-item class="span-2">
          <nz-form-label>Tags</nz-form-label>
          <nz-form-control><input nz-input formControlName="tags" placeholder="email, google"/></nz-form-control>
        </nz-form-item>
      </div>
      <div class="preview">
        <div class="icon" [style.background]="form.value.color || '#f3f4f6'">
          <i *ngIf="form.value.iconClass" [class]="form.value.iconClass" [style.color]="fgColor"></i>
          <img *ngIf="!form.value.iconClass && form.value.iconUrl" [src]="form.value.iconUrl" alt="icon"/>
          <img *ngIf="!form.value.iconClass && !form.value.iconUrl && form.value.id" [src]="simpleIconUrl(form.value.id, fgColor)" alt="icon"/>
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
  `]
})
export class AppProviderEditorComponent implements OnInit {
  form!: FormGroup;
  saving = false;
  constructor(private fb: FormBuilder, private catalog: CatalogService, private route: ActivatedRoute, private router: Router) {}
  ngOnInit(): void {
    this.form = this.fb.group({
      id: new FormControl<string | null>(null, { validators: [Validators.required] }),
      name: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] }),
      title: new FormControl<string>(''),
      iconClass: new FormControl<string>(''),
      iconUrl: new FormControl<string>(''),
      color: new FormControl<string>('#1677ff'),
      tags: new FormControl<string>('')
    });
    const id = this.route.snapshot.queryParamMap.get('id');
    const dup = this.route.snapshot.queryParamMap.get('duplicateFrom');
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
  private patch(a: AppProvider) { this.form.patchValue({ ...a, tags: (a.tags || []).join(', ') }); }
  back() { history.back(); }
  save() {
    if (this.form.invalid) return;
    this.saving = true;
    const v = this.form.value as any;
    const app: AppProvider = {
      id: v.id,
      name: v.name,
      title: v.title || undefined,
      iconClass: v.iconClass || undefined,
      iconUrl: v.iconUrl || undefined,
      color: v.color || undefined,
      tags: (v.tags || '').split(',').map((x:string)=>x.trim()).filter((x:string)=>!!x)
    };
    this.catalog.saveApp(app).subscribe({ next: () => { this.saving = false; this.router.navigate(['/apps']); }, error: () => this.saving = false });
  }
}
