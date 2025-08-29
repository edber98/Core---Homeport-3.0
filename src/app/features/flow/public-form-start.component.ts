import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DynamicForm } from '../../modules/dynamic-form/dynamic-form';
import { CatalogService } from '../../services/catalog.service';
import { RunsBackendService } from '../../services/runs-backend.service';
import { ApiClientService } from '../../services/api-client.service';
import { AuthTokenService } from '../../services/auth-token.service';

@Component({
  standalone: true,
  selector: 'public-form-start',
  imports: [CommonModule, FormsModule, DynamicForm],
  template: `
    <div class="pf-shell">
      <div class="pf-card" *ngIf="loaded; else loading">
        <h2 class="pf-title">{{ flowName || 'Formulaire' }}</h2>
        <p class="pf-sub" *ngIf="nodeTitle">{{ nodeTitle }}</p>
        <div *ngIf="!schema"><em>Formulaire non configuré.</em></div>
        <app-dynamic-form *ngIf="schema" [schema]="schema" [value]="model" (valueChange)="onValue($event)" (submitted)="onSubmit($event)"></app-dynamic-form>
        <div class="pf-result" *ngIf="submitted && runId">
          <span>Exécution lancée (run: {{ runId }}).</span>
        </div>
        <div class="pf-error" *ngIf="error">{{ error }}</div>
      </div>
      <ng-template #loading>
        <div class="pf-card"><span>Chargement…</span></div>
      </ng-template>
    </div>
  `,
  styles: [`
    .pf-shell { min-height: 100vh; display:flex; align-items:center; justify-content:center; background:#f5f6f8; padding: 16px; }
    .pf-card { width: 100%; max-width: 800px; background:#fff; border:1px solid #ececec; border-radius: 12px; box-shadow: 0 10px 24px rgba(0,0,0,0.08); padding: 16px; }
    .pf-title { margin: 0 0 6px; font-weight: 700; font-size: 18px; }
    .pf-sub { margin: 0 0 12px; color:#6b7280; font-size: 13px; }
    .pf-result { margin-top: 10px; color:#16a34a; }
    .pf-error { margin-top: 10px; color:#ef4444; }
  `]
})
export class PublicFormStartComponent {
  flowId: string = '';
  nodeId: string = '';
  flowName: string | null = null;
  nodeTitle: string | null = null;
  schema: any = null;
  model: any = {};
  loaded = false;
  submitted = false;
  runId: string | null = null;
  error: string | null = null;

  constructor(private route: ActivatedRoute, private router: Router, private catalog: CatalogService, private runs: RunsBackendService, private auth: AuthTokenService, private api: ApiClientService) {
    this.flowId = this.route.snapshot.paramMap.get('flowId') || '';
    this.nodeId = this.route.snapshot.paramMap.get('nodeId') || '';
  }

  ngOnInit() {
    if (!this.flowId || !this.nodeId) { this.error = 'Lien invalide'; return; }
    const hasToken = !!this.auth.token;
    const loadPublic = () => this.api.get<any>(`/api/public/flows/${encodeURIComponent(this.flowId)}/public-form`).subscribe({
      next: (d) => {
        this.flowName = d?.name || null;
        this.nodeTitle = d?.nodeTitle || null;
        this.schema = d?.schema || null;
        this.loaded = true;
      },
      error: (e) => { this.error = e?.message || 'Formulaire inaccessible'; this.loaded = true; }
    });
    const loadPrivate = () => this.catalog.getFlow(this.flowId).subscribe({
      next: (doc) => {
        const node = (doc?.nodes || []).find(n => String(n?.id) === String(this.nodeId));
        if (!node) { this.error = 'Nœud introuvable'; this.loaded = true; return; }
        this.flowName = doc?.name || null;
        this.nodeTitle = node?.data?.model?.templateObj?.title || node?.data?.model?.name || null;
        const m = node?.data?.model || {};
        const isStart = String(m?.templateObj?.type || '').toLowerCase() === 'start';
        if (!isStart) { this.error = 'Ce nœud n\'est pas un déclencheur'; this.loaded = true; return; }
        this.schema = m?.startFormSchema || null;
        this.loaded = true;
      },
      error: () => { this.error = 'Flow introuvable'; this.loaded = true; }
    });
    if (hasToken) loadPrivate(); else loadPublic();
  }

  onValue(v: any) { this.model = v; }
  onSubmit(v: any) {
    this.submitted = true;
    this.error = null;
    const payload = v != null ? v : this.model || {};
    const hasToken = !!this.auth.token;
    const startPublic = () => this.api.post<any>(`/api/public/flows/${encodeURIComponent(this.flowId)}/runs`, { payload }).subscribe({ next: (d) => { this.runId = d?.id ? String(d.id) : null; }, error: () => { this.error = 'Échec du lancement'; } });
    const startPrivate = () => this.runs.start(this.flowId, payload).subscribe({
      next: (resp) => {
        this.runId = (resp && (resp.id || resp.runId || resp._id)) ? String(resp.id || resp.runId || resp._id) : null;
      },
      error: () => { this.error = 'Échec du lancement'; }
    });
    if (hasToken) startPrivate(); else startPublic();
  }
}
