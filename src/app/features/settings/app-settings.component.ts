import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { CatalogService } from '../../services/catalog.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, NzButtonModule],
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
          <div class="title">Réinitialiser</div>
          <p>Efface les données locales (flows, formulaires, templates, apps) et recharge les valeurs par défaut.</p>
          <div class="actions">
            <button nz-button nzType="default" (click)="resetAll()">Reset tout</button>
          </div>
        </div>
        <div class="card">
          <div class="title">Exporter</div>
          <p>Télécharge toutes les données locales (flows, formulaires, templates, apps) en JSON.</p>
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
    .card .actions { margin-top: 8px; display:flex; gap:8px; align-items:center; }
    .card .actions .import-btn { display:inline-flex; align-items:center; gap:8px; background:#fff; color:#111; border:1px solid #e5e7eb; border-radius:8px; padding:6px 10px; cursor:pointer; }
    .card .actions .import-btn input[type=file] { display:none; }
    .result { margin-top: 12px; color:#0f172a; }
  `]
})
export class AppSettingsComponent {
  msg = '';
  constructor(private catalog: CatalogService) {}
  resetAll() {
    this.catalog.resetAll().subscribe(ok => {
      this.msg = ok ? 'Données réinitialisées.' : 'Échec de la réinitialisation.';
      setTimeout(() => this.msg = '', 2500);
    });
  }

  exportAll() {
    this.catalog.exportData().subscribe({
      next: (json) => {
        try {
          const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          const ts = new Date().toISOString().replace(/[:.]/g, '-');
          a.href = url;
          a.download = `homeport-catalog-${ts}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          this.msg = 'Export: terminé.';
          setTimeout(() => this.msg = '', 2500);
        } catch {}
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
        this.catalog.importData(text, 'replace').subscribe({
          next: () => { this.msg = 'Import: terminé.'; setTimeout(() => this.msg = '', 2500); },
          error: () => { this.msg = 'Import: échec.'; setTimeout(() => this.msg = '', 2500); }
        });
      } catch { this.msg = 'Import: échec.'; setTimeout(() => this.msg = '', 2500); }
    };
    fr.onerror = () => { this.msg = 'Import: échec.'; setTimeout(() => this.msg = '', 2500); };
    try { fr.readAsText(file); } catch {}
    // reset input value to allow re-select same file
    try { (input as any).value = ''; } catch {}
  }
}
