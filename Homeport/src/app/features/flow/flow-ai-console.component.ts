import { CommonModule } from '@angular/common';
import { Component, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { FlowViewerComponent } from './flow-viewer.component';
import { AiConsoleChatComponent } from './components/ai-console-chat.component';
import { CatalogService } from '../../services/catalog.service';
import { AiConsoleBackendService, AiChatThread, AiContext } from '../../services/ai-console-backend.service';
import { ConnectionSettings } from 'ngx-vflow';
import { backAwareCurve } from './edge-curves';

@Component({
  selector: 'flow-ai-console',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, NzButtonModule, NzInputModule, NzIconModule, NzSelectModule, FlowViewerComponent, AiConsoleChatComponent],
  template: `
  <div class="ai-console">
    <section class="viewer">
      <div class="loading-overlay" *ngIf="loadingFlowDoc">
        <div class="spinner"></div>
        <div class="text">Chargement du flow…</div>
      </div>
      <div class="empty" *ngIf="!flowId && !loadingFlowDoc">Sélectionnez un flow (paramètre ?flow=ID) pour afficher le viewer.</div>
      <flow-viewer *ngIf="flowId" [nodes]="nodes" [edges]="edges" [background]="flowBackground" [portOrientation]="portOrientation" [connectionSettings]="connectionSettings" [useStorage]="false" [showBottomBar]="true" [showRun]="false" [showSave]="false" [showCenterFlow]="true"></flow-viewer>
    </section>
    <aside class="chat">
      <ai-console-chat [flowId]="flowId" (openThread)="onOpenThread($event)"></ai-console-chat>
    </aside>
  </div>
  `,
  styles: [`
    .ai-console { position: relative; display:grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: 0; height:100%; min-height:0; }
    .viewer { position: relative; min-height:0; }
    .viewer .empty { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; color:#6b7280; font-size:13px; }
    .chat { background:#fff; display:flex; flex-direction:column; min-height:0; }
    .loading-overlay { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; background:rgba(255,255,255,0.6); z-index:2; }
    .loading-overlay .spinner { width:26px; height:26px; border-radius:50%; border:3px solid #eee; border-top-color:#1677ff; animation:spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
    @media (max-width: 1024px) {
      .ai-console { grid-template-columns: 1fr; }
      .chat { border-left:none; border-top: 1px solid #e5e7eb; }
    }
  `]
})
export class FlowAiConsoleComponent {
  flowId: string | null = null;
  loadingFlowDoc = false;
  nodes: any[] = [];
  edges: any[] = [];
  flowBackground = '#EEF0F4';
  portOrientation: 'vertical'|'horizontal' = 'horizontal';
  connectionSettings: ConnectionSettings = { type: 'template', curve: backAwareCurve } as any;

  constructor(private route: ActivatedRoute, private router: Router, private cdr: ChangeDetectorRef, private catalog: CatalogService, private ai: AiConsoleBackendService) {
    try {
      const qp = this.route.snapshot.queryParamMap;
      this.flowId = qp.get('flow');
      if (qp.get('port') === 'vertical') this.portOrientation = 'vertical';
    } catch {}
    this.loadFlow();
  }

  private loadFlow() {
    const id = this.flowId; if (!id) return;
    this.loadingFlowDoc = true;
    this.catalog.getFlow(id).subscribe({
      next: (doc) => {
        this.nodes = (doc?.nodes || []).map(n => ({ ...n }));
        this.edges = (doc?.edges || []).map(e => ({ ...e }));
        this.loadingFlowDoc = false; try { this.cdr.detectChanges(); } catch {}
      },
      error: () => { this.loadingFlowDoc = false; try { this.cdr.detectChanges(); } catch {} }
    });
  }

  onGraph(_g: any) { /* pourra charger dans l'éditeur si demandé */ }
  onOpenThread(_t: any) {}
}
