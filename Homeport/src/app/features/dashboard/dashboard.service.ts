import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ApiClientService } from '../../services/api-client.service';

export interface DashboardKpis {
  totalFlows: number;
  activeFlows: number;
  totalRuns: number;
  successRuns: number;
  errorRuns: number;
  runningRuns: number;
  avgDurationMs: number;
  minDurationMs: number;
  maxDurationMs: number;
  totalCredentials: number;
  aiTokensInput: number;
  aiTokensOutput: number;
  aiTokensTotal: number;
}

export interface RunsTrendPoint { date: string; total: number; success: number; error: number; }
export interface TopFlow { flowId: string; name: string; runCount: number; successCount: number; errorCount: number; avgDurationMs: number; }
export interface TopNodeTemplate { key: string; name: string; count: number; }
export interface ProductionFlow { flowId: string; name: string; triggerType: string | null; deployedAt: string; lastRunAt: string | null; lastRunStatus: string | null; }
export interface RecentRun { runId: string; flowId: string; flowName: string; status: string; startedAt: string; durationMs: number; }
export interface RecentNotification { id: string; code: string; message: string; severity: string; link?: string; createdAt: string; }

export interface DashboardData {
  kpis: DashboardKpis;
  runsTrend: RunsTrendPoint[];
  topFlows: TopFlow[];
  topNodeTemplates: TopNodeTemplate[];
  productionFlows: ProductionFlow[];
  recentRuns: RecentRun[];
  recentNotifications: RecentNotification[];
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private data$ = new BehaviorSubject<DashboardData | null>(null);
  loading$ = new BehaviorSubject<boolean>(false);

  constructor(private api: ApiClientService) {}

  getData(): Observable<DashboardData | null> { return this.data$.asObservable(); }

  get snapshot(): DashboardData | null { return this.data$.value; }

  loadDashboard(wsId: string): Observable<DashboardData> {
    this.loading$.next(true);
    const obs = this.api.get<DashboardData>(`/api/workspaces/${encodeURIComponent(wsId)}/dashboard`);
    obs.subscribe({
      next: (res: any) => {
        const data = res?.data || res;
        this.data$.next(data);
        this.loading$.next(false);
      },
      error: () => this.loading$.next(false),
    });
    return obs;
  }
}
