import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { HeatmapChartComponent } from '../../components/charts/heatmap-chart.component';
import { DashboardService, DashboardData, TopFlow, ProductionFlow, RecentRun, RecentNotification, RunsTrendPoint, TopNodeTemplate } from '../../dashboard.service';
import { AccessControlService } from '../../../../services/access-control.service';
import { NotificationsBackendService } from '../../../../services/notifications-backend.service';
import { AiService } from '../../../ai/ai.service';
import { AiAudioService } from '../../../ai/ai-audio.service';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, FormsModule, NzIconModule, NzButtonModule, NzToolTipModule, NzTagModule, NzInputModule, NzSpinModule, NzEmptyModule, NzBadgeModule, HeatmapChartComponent],
  templateUrl: './dashboard-home.html',
  styleUrl: './dashboard-home.scss'
})
export class DashboardHome implements OnInit {
  data: DashboardData | null = null;
  loading = false;
  aiInput = '';

  // Cached computed values (avoid new array refs on every change detection)
  successRate = '0';
  tagColors = ['blue', 'green', 'orange', 'purple', 'cyan', 'magenta', 'volcano', 'gold', 'lime', 'geekblue'];

  constructor(
    private ds: DashboardService,
    private acl: AccessControlService,
    private notifApi: NotificationsBackendService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    public ai: AiService,
    public audioService: AiAudioService,
  ) {}

  ngOnInit() {
    this.refresh();
  }

  refresh() {
    const wsId = this.acl.currentWorkspaceId();
    if (!wsId) return;
    this.loading = true;
    this.ds.loadDashboard(wsId).subscribe({
      next: (res: any) => {
        this.data = res?.data || res;
        this.computeDerived();
        this.loading = false;
        try { this.cdr.detectChanges(); } catch {}
      },
      error: () => {
        this.loading = false;
        try { this.cdr.detectChanges(); } catch {}
      },
    });
  }

  private computeDerived() {
    if (!this.data) return;
    // Success rate
    const total = this.data.kpis?.totalRuns || 0;
    this.successRate = total ? ((this.data.kpis.successRuns / total) * 100).toFixed(1) : '—';
  }

  goFlow(flowId: string) {
    this.router.navigate(['/flow-builder', 'editor'], { queryParams: { flow: flowId } });
  }

  goRun(run: RecentRun) {
    this.router.navigate(['/flow-builder', 'executions'], { queryParams: { flow: run.flowId, run: run.runId } });
  }

  goNotif(n: RecentNotification) {
    if (n.link) this.router.navigateByUrl(n.link);
  }

  async sendAiMessage() {
    const text = (this.aiInput || '').trim();
    if (!text) return;
    this.aiInput = '';
    this.ai.openDrawer();
    await this.ai.quickSend(text);
  }

  async toggleMic() {
    if (this.audioService.recording()) {
      try {
        const blob = await this.audioService.stopAndGetBlob();
        this.audioService.transcribe(blob).subscribe({
          next: (text) => {
            if (text?.trim()) {
              this.aiInput = text.trim();
              try { this.cdr.detectChanges(); } catch {}
            }
          },
          error: () => {},
        });
      } catch {}
    } else {
      try {
        await this.audioService.startRecording();
      } catch {}
    }
  }

  relativeTime(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'à l\'instant';
    if (diffMin < 60) return `il y a ${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `il y a ${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    return `il y a ${diffD}j`;
  }

  statusColor(status: string): string {
    switch (status) {
      case 'success': return 'green';
      case 'error': return 'red';
      case 'running': return 'processing';
      case 'queued': return 'blue';
      default: return 'default';
    }
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'success': return 'Succès';
      case 'error': return 'Erreur';
      case 'running': return 'En cours';
      case 'queued': return 'En attente';
      case 'cancelled': return 'Annulé';
      case 'timed_out': return 'Timeout';
      default: return status;
    }
  }

  severityColor(sev: string): string {
    switch (sev) {
      case 'info': return 'blue';
      case 'warning': return 'orange';
      case 'error': return 'red';
      case 'critical': return 'red';
      default: return 'default';
    }
  }

  triggerLabel(t: string | null): string {
    switch (t) {
      case 'webhook': return 'Webhook';
      case 'subscription': return 'Événement';
      case 'polling': return 'Polling';
      default: return 'Manuel';
    }
  }

  formatDuration(ms: number | null): string {
    if (!ms && ms !== 0) return '—';
    if (ms === 0) return '0ms';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}min`;
  }

  formatTokens(n: number | null | undefined): string {
    if (!n) return '0';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
    return String(n);
  }

  ackAllNotifications() {
    const wsId = this.acl.currentWorkspaceId();
    if (!wsId) return;
    this.notifApi.ackAll(wsId).subscribe({
      next: () => this.refresh(),
      error: () => {},
    });
  }
}
