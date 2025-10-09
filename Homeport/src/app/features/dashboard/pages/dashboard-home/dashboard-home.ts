import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { MiniAreaChartComponent } from '../../components/charts/mini-area-chart.component';
import { MiniBarChartComponent } from '../../components/charts/mini-bar-chart.component';
import { DonutChartComponent } from '../../components/charts/donut-chart.component';
import { DashboardService, ChannelStat, FunctionStat } from '../../dashboard.service';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, NzIconModule, NzButtonModule, NzToolTipModule, MiniAreaChartComponent, MiniBarChartComponent, DonutChartComponent],
  templateUrl: './dashboard-home.html',
  styleUrl: './dashboard-home.scss'
})
export class DashboardHome {
  // Live data (defaults empty)
  executions: number[] = [];
  errors: number[] = [];
  avgLatencyMs: number[] = [];
  activeNodes = 0;

  channels: ChannelStat[] = [];
  activity: { icon: string; title: string; time: string }[] = [];
  functions: FunctionStat[] = [];

  constructor(private ds: DashboardService) {
    ds.getKpis().subscribe(v => {
      this.executions = v.executions || [];
      this.errors = v.errors || [];
      this.avgLatencyMs = v.avgLatencyMs || [];
      this.activeNodes = v.activeNodes || 0;
    });
    ds.getChannels().subscribe(v => this.channels = v || []);
    ds.getActivity().subscribe(v => this.activity = v || []);
    ds.getFunctionStats().subscribe(v => this.functions = v || []);
  }

  get latencyTotal(): number {
    const arr = Array.isArray(this.avgLatencyMs) ? this.avgLatencyMs : [];
    const window = arr.length > 10 ? arr.slice(arr.length - 10) : arr.slice();
    let mx = 1000;
    for (const v of window) {
      const n = typeof v === 'number' ? v : Number(v);
      if (!Number.isNaN(n) && n > mx) mx = n;
    }
    return mx;
  }

  // Demo helpers
  loadDemoData() {
    const executions = [8, 12, 10, 14, 11, 18, 22, 19, 24, 28, 26, 31];
    const errors = [0, 1, 0, 2, 1, 0, 3, 1, 2, 1, 0, 2];
    const avgLatencyMs = [220, 260, 180, 300, 250, 270, 210, 240, 230, 260, 280, 220];
    const activeNodes = 12;
    this.ds.updateKpis({ executions, errors, avgLatencyMs, activeNodes });
    this.ds.updateChannels([
      { label: 'HTTP Request', value: 124 },
      { label: 'Send Mail', value: 87 },
      { label: 'Condition', value: 65 },
      { label: 'Loop', value: 41 }
    ]);
    this.ds.setActivity([
      { icon: 'fa-solid fa-bolt', title: 'Flow exécuté', time: 'Il y a 2 min' },
      { icon: 'fa-solid fa-triangle-exclamation', title: 'Erreur gérée (catch)', time: 'Il y a 9 min' },
      { icon: 'fa-solid fa-envelope', title: 'Mail envoyé', time: 'Il y a 15 min' }
    ]);
    this.ds.updateFunctionStats([
      { name: 'HTTP Request', success: 92, error: 8, avgMs: 240 },
      { name: 'Send Mail', success: 76, error: 4, avgMs: 310 },
      { name: 'Condition', success: 130, error: 12, avgMs: 120 },
      { name: 'Loop', success: 54, error: 6, avgMs: 180 },
    ]);
  }

  clearData() {
    this.ds.updateKpis({ executions: [], errors: [], avgLatencyMs: [], activeNodes: 0 });
    this.ds.updateChannels([]);
    this.ds.setActivity([]);
    this.ds.updateFunctionStats([]);
  }

  // helpers
  errSuccRatio(fs: FunctionStat): string {
    const s = Math.max(1, fs.success);
    const r = fs.error / s;
    return r.toFixed(2);
  }
}
