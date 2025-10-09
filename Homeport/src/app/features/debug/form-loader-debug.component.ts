import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'form-loader-debug',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="page">
    <h1>Debug — Form Loader</h1>
    <p>Tester le chargement d'un schéma JSON dans le Form Builder (route) avec des exemples.</p>
    <div class="grid">
      <div class="col">
        <div class="label">Schéma (JSON)</div>
        <textarea [(ngModel)]="json" rows="14"></textarea>
        <div class="row">
          <button (click)="loadSample('flat')">Exemple: Simple</button>
          <button (click)="loadSample('steps')">Exemple: Étapes</button>
          <button (click)="loadSample('sections')">Exemple: Sections</button>
        </div>
      </div>
      <div class="col">
        <div class="label">Locks (JSON)</div>
        <textarea [(ngModel)]="locks" rows="14"></textarea>
        <div class="row">
          <button (click)="openBuilder()">Ouvrir dans Form Builder (route)</button>
        </div>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .page { padding: 16px; max-width: 1080px; margin: 0 auto; }
    .grid { display:grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .col { display:flex; flex-direction:column; gap:8px; }
    .label { font-size:12px; color:#6b7280; }
    textarea { width:100%; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 12px; border:1px solid #e5e7eb; border-radius:8px; padding:8px; }
    .row { display:flex; gap:8px; }
    button { appearance:none; background:#111; color:#fff; border:1px solid #111; border-radius:8px; padding:6px 10px; cursor:pointer; }
  `]
})
export class FormLoaderDebugComponent {
  json = JSON.stringify({ title: 'Arguments', fields: [{ type: 'text', key: 'name', label: 'Nom' }] }, null, 2);
  locks = JSON.stringify({ title: { disabled: false } }, null, 2);
  constructor(private router: Router) {}
  loadSample(kind: 'flat'|'steps'|'sections') {
    const samples: any = {
      flat: { title: 'Simple', fields: [{ type: 'text', key: 'email', label: 'Email' }, { type: 'checkbox', key: 'ok', label: 'OK' }] },
      steps: { title: 'Avec étapes', steps: [ { title: 'Infos', fields: [{ type: 'text', key: 'first', label: 'Prénom' }] }, { title: 'Coordonnées', fields: [{ type: 'text', key: 'phone', label: 'Téléphone' }] } ] },
      sections: { title: 'Avec sections', fields: [ { type: 'section', title: 'Bloc', fields: [{ type:'text', key:'subject', label:'Sujet' }] } ] },
    };
    this.json = JSON.stringify(samples[kind], null, 2);
  }
  openBuilder() {
    const session = 'dbg_' + Date.now().toString(36);
    const returnTo = this.router.createUrlTree(['/debug/form-loader']).toString();
    this.router.navigate(['/dynamic-form'], { queryParams: { session, return: returnTo, schema: this.json, locks: this.locks } });
  }
}
