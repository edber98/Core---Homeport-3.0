import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { TriggersBackendService, TriggerStatus } from '../../services/triggers-backend.service';

@Component({
  selector: 'flow-workbench',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './flow-workbench.component.html',
  styleUrl: './flow-workbench.component.scss'
})
export class FlowWorkbenchComponent implements OnInit, OnDestroy {
  triggerStatus: TriggerStatus | null = null;
  flowId: string | null = null;
  private qpSub?: Subscription;
  private changeSub?: Subscription;
  private pollTimer?: ReturnType<typeof setInterval>;

  constructor(
    private route: ActivatedRoute,
    private triggersApi: TriggersBackendService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    // Listen to query params to get the current flow id
    this.qpSub = this.route.queryParams.subscribe(params => {
      const fid = params['flow'] || null;
      if (fid !== this.flowId) {
        this.flowId = fid;
        this.triggerStatus = null;
        this.loadTriggerStatus();
      }
    });
    // Instant refresh when deploy/undeploy happens in child components
    this.changeSub = this.triggersApi.statusChanged$.subscribe(flowId => {
      if (flowId === this.flowId) this.loadTriggerStatus();
    });
    // Poll trigger status every 30s for live event count
    this.pollTimer = setInterval(() => this.loadTriggerStatus(), 30000);
  }

  ngOnDestroy() {
    this.qpSub?.unsubscribe();
    this.changeSub?.unsubscribe();
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

  get isProduction(): boolean {
    return !!this.triggerStatus?.active;
  }

  loadTriggerStatus() {
    if (!this.flowId) { this.triggerStatus = null; return; }
    this.triggersApi.getStatus(this.flowId).subscribe({
      next: (st) => { this.triggerStatus = st; try { this.cdr.detectChanges(); } catch {} },
      error: () => { this.triggerStatus = null; }
    });
  }
}
