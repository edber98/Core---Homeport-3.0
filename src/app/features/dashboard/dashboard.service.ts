import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface DashboardKpis {
  executions: number[]; // per period
  errors: number[];     // per period
  avgLatencyMs: number[]; // per period
  activeNodes: number;    // current count
}

export interface ChannelStat { label: string; value: number; }
export interface ActivityItem { icon: string; title: string; time: string; }
export interface FunctionStat { name: string; success: number; error: number; avgMs: number; }

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private kpis$ = new BehaviorSubject<DashboardKpis>({ executions: [], errors: [], avgLatencyMs: [], activeNodes: 0 });
  private channels$ = new BehaviorSubject<ChannelStat[]>([]);
  private activity$ = new BehaviorSubject<ActivityItem[]>([]);
  private functions$ = new BehaviorSubject<FunctionStat[]>([]);

  getKpis(): Observable<DashboardKpis> { return this.kpis$.asObservable(); }
  getChannels(): Observable<ChannelStat[]> { return this.channels$.asObservable(); }
  getActivity(): Observable<ActivityItem[]> { return this.activity$.asObservable(); }
  getFunctionStats(): Observable<FunctionStat[]> { return this.functions$.asObservable(); }

  // Update API to be called by other features (flows, dynamic-form, etc.)
  updateKpis(next: Partial<DashboardKpis>) {
    const cur = this.kpis$.value;
    this.kpis$.next({
      executions: next.executions ?? cur.executions,
      errors: next.errors ?? cur.errors,
      avgLatencyMs: next.avgLatencyMs ?? cur.avgLatencyMs,
      activeNodes: next.activeNodes ?? cur.activeNodes,
    });
  }
  updateChannels(next: ChannelStat[]) { this.channels$.next(next || []); }
  addActivity(item: ActivityItem) { this.activity$.next([item, ...this.activity$.value].slice(0, 20)); }
  setActivity(items: ActivityItem[]) { this.activity$.next(items || []); }
  updateFunctionStats(items: FunctionStat[]) { this.functions$.next(items || []); }
}
