import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { NgIf } from '@angular/common';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { LoadingService } from '../services/loading.service';

@Component({
  selector: 'app-global-loading',
  standalone: true,
  imports: [NgIf, NzSpinModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div *ngIf="loading()" style="position: fixed; inset: 0; pointer-events: none; z-index: 1000;">
    <div style="position:absolute; right: 16px; bottom: 16px; background: rgba(255,255,255,0.9); border-radius: 8px; padding: 10px 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.15)">
      <nz-spin nzSize="small"></nz-spin>
      <span style="margin-left:8px; font-size: 12px; color: #444;">Chargement…</span>
    </div>
  </div>`,
})
export class GlobalLoadingComponent {
  loading = computed(() => this.loader.isLoading());
  constructor(private loader: LoadingService) {}
}

