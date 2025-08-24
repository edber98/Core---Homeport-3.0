import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { CatalogService } from '../../services/catalog.service';
import { AccessControlService } from '../../services/access-control.service';
import { Company, CompanyService, LicensePlan } from '../../services/company.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzSelectModule],
  template: `
  <div class="list-page">
    <div class="container">
      <div class="page-header">
        <div>
          <h1>Paramètres</h1>
          <p>Gérer les données locales (catalogues, gabarits, apps) et réinitialiser aux valeurs par défaut.</p>
        </div>
        <div class="actions">
          <button nz-button nzType="primary" class="primary" (click)="resetAll()"><i class="fa-solid fa-rotate"></i> Réinitialiser les données</button>
        </div>
      </div>
      <div class="cards">
        <div class="card">
          <div class="title">Company</div>
          <div class="row"><label>Nom</label><input [(ngModel)]="company.name" /></div>
          <div class="row">
            <label>Plan</label>
            <nz-select [(ngModel)]="company.license.plan" (ngModelChange)="onPlanChange($event)" style="width: 160px;">
              <nz-option nzValue="free" nzLabel="Free"></nz-option>
              <nz-option nzValue="pro" nzLabel="Pro"></nz-option>
              <nz-option nzValue="enterprise" nzLabel="Enterprise"></nz-option>
            </nz-select>
          </div>
          <div class="kv">
            <div><span class="k">Max users</span><span class="v">{{ company.license.maxUsers }}</span></div>
            <div><span class="k">Max workspaces</span><span class="v">{{ company.license.maxWorkspaces }}</span></div>
          </div>
          <div class="actions">
            <button nz-button nzType="default" (click)="saveCompany()">Enregistrer</button>
          </div>
        </div>
        <div class="card">
          <div class="title">Réinitialiser</div>
          <p>Efface les données locales (flows, formulaires, templates, apps, credentials) et recharge les valeurs par défaut.</p>
          <div class="actions">
            <button nz-button nzType="default" (click)="resetAll()">Reset tout</button>
          </div>
        </div>
        <div class="card">
          <div class="title">Exporter</div>
          <p>Télécharge toutes les données locales (flows, formulaires, templates, apps, credentials) en JSON.</p>
          <div class="actions">
            <button nz-button nzType="default" (click)="exportAll()">Exporter (JSON)</button>
          </div>
        </div>
        <div class="card">
          <div class="title">Importer</div>
          <p>Importer un fichier JSON exporté précédemment. Remplace les données locales.</p>
          <div class="actions">
            <label class="import-btn">
              <input type="file" accept="application/json,.json" (change)="onImportFile($event)"/>
              <span>Sélectionner un fichier…</span>
            </label>
          </div>
        </div>
      </div>
      <div class="result" *ngIf="msg">{{ msg }}</div>
    </div>
  </div>
  `,
  styles: [`
    .list-page { padding: 20px; }
    .container { max-width: 960px; margin: 0 auto; }
    .page-header { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom: 16px; }
    .page-header h1 { margin: 0; font-size: 22px; font-weight: 650; letter-spacing: -0.02em; }
    .page-header p { margin: 4px 0 0; color:#6b7280; }
    .page-header .actions .primary { background:#111; border-color:#111; }
    .cards { display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
    .card { border:1px solid #ececec; border-radius:12px; padding:12px; background:#fff; box-shadow: 0 8px 24px rgba(0,0,0,.04); }
    .card .title { font-weight:600; margin-bottom: 6px; }
    .card .row { display:flex; align-items:center; gap:8px; margin:6px 0; }
    .card .row label { width: 120px; color:#6b7280; }
    .card .row input { flex:1 1 auto; border:1px solid #e5e7eb; border-radius:8px; padding:6px 8px; }
    .kv { display:flex; flex-direction:column; gap:6px; margin-top: 8px; }
    .kv .k { width: 160px; color:#6b7280; display:inline-block; }
    .kv .v { color:#111; }
    .card .actions { margin-top: 8px; display:flex; gap:8px; align-items:center; }
    .card .actions .import-btn { display:inline-flex; align-items:center; gap:8px; background:#fff; color:#111; border:1px solid #e5e7eb; border-radius:8px; padding:6px 10px; cursor:pointer; }
    .card .actions .import-btn input[type=file] { display:none; }
    .result { margin-top: 12px; color:#0f172a; }
  `]
})
export class AppSettingsComponent {
  msg = '';
  company: Company = { id: 'acme', name: 'Demo Company', adminUserId: 'admin', license: { plan: 'pro', maxUsers: 50, maxWorkspaces: 10 } } as any;
  constructor(private catalog: CatalogService, private acl: AccessControlService, private companySvc: CompanyService) {
    this.companySvc.getCompany().subscribe(c => this.company = c);
  }
  resetAll() {
    this.catalog.resetAll().subscribe(ok1 => {
      this.acl.resetAll().subscribe(ok2 => {
        this.msg = (ok1 && ok2) ? 'Données réinitialisées (catalogue + ACL).' : 'Échec de la réinitialisation.';
        setTimeout(() => this.msg = '', 2500);
      });
    });
  }

  exportAll() {
    // Combine catalog + ACL into one export payload
    this.catalog.exportData().subscribe({
      next: (catalogJson) => {
        let catalog: any = null;
        try { catalog = JSON.parse(catalogJson); } catch { catalog = { kind: 'homeport-catalog' }; }
        this.acl.exportData().subscribe(acl => {
          try {
            const payload = {
              kind: 'homeport-export',
              version: 1,
              exportedAt: new Date().toISOString(),
              catalog,
              acl,
            } as const;
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const ts = new Date().toISOString().replace(/[:.]/g, '-');
            a.href = url;
            a.download = `homeport-export-${ts}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            this.msg = 'Export: terminé (catalogue + ACL).';
            setTimeout(() => this.msg = '', 2500);
          } catch {
            this.msg = 'Export: échec.'; setTimeout(() => this.msg = '', 2500);
          }
        });
      },
      error: () => { this.msg = 'Export: échec.'; setTimeout(() => this.msg = '', 2500); }
    });
  }

  onImportFile(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = (input && input.files && input.files[0]) || null;
    if (!file) return;
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const text = String(fr.result || '');
        const payload = JSON.parse(text);
        // Support legacy catalog-only payloads
        if (payload && payload.kind === 'homeport-export') {
          const doCatalog = () => this.catalog.importData(payload.catalog, 'replace');
          const doAcl = () => this.acl.importData(payload.acl, 'replace');
          doCatalog().subscribe({
            next: () => doAcl().subscribe({
              next: () => { this.msg = 'Import: terminé (catalogue + ACL).'; setTimeout(() => this.msg = '', 2500); },
              error: () => { this.msg = 'Import ACL: échec.'; setTimeout(() => this.msg = '', 2500); }
            }),
            error: () => { this.msg = 'Import catalogue: échec.'; setTimeout(() => this.msg = '', 2500); }
          });
        } else if (payload && payload.kind === 'homeport-catalog') {
          this.catalog.importData(payload, 'replace').subscribe({
            next: () => { this.msg = 'Import: terminé (catalogue).'; setTimeout(() => this.msg = '', 2500); },
            error: () => { this.msg = 'Import: échec.'; setTimeout(() => this.msg = '', 2500); }
          });
        } else if (payload && payload.kind === 'homeport-acl') {
          this.acl.importData(payload, 'replace').subscribe({
            next: () => { this.msg = 'Import: terminé (ACL).'; setTimeout(() => this.msg = '', 2500); },
            error: () => { this.msg = 'Import ACL: échec.'; setTimeout(() => this.msg = '', 2500); }
          });
        } else {
          // Try to pass raw to catalog as fallback
          this.catalog.importData(payload, 'replace').subscribe({
            next: () => { this.msg = 'Import: terminé.'; setTimeout(() => this.msg = '', 2500); },
            error: () => { this.msg = 'Import: échec.'; setTimeout(() => this.msg = '', 2500); }
          });
        }
      } catch { this.msg = 'Import: échec.'; setTimeout(() => this.msg = '', 2500); }
    };
    fr.onerror = () => { this.msg = 'Import: échec.'; setTimeout(() => this.msg = '', 2500); };
    try { fr.readAsText(file); } catch {}
    // reset input value to allow re-select same file
    try { (input as any).value = ''; } catch {}
  }

  onPlanChange(plan: LicensePlan) {
    this.companySvc.setPlan(plan).subscribe(c => this.company = c);
  }
  saveCompany() {
    this.companySvc.updateCompany(this.company).subscribe(c => {
      this.company = c; this.msg = 'Company mise à jour.'; setTimeout(() => this.msg = '', 2500);
    });
  }
}
