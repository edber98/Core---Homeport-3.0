import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { AppProvider } from '../services/catalog.service';

@Component({
  selector: 'node-card-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="node-header">
      <div class="leading">
        <div class="app-icon" *ngIf="app || appId" [style.background]="(app?.color || '#f3f4f6')">
          <!-- Priority: explicit node/template iconUrl > explicit iconClass > provider iconUrl > provider iconClass > SimpleIcons fallback -->
          <img *ngIf="iconUrl" [src]="iconUrl" alt="icon"/>
          <i *ngIf="!iconUrl && iconClass" [class]="iconClass" [style.color]="fgColor(app?.color)"></i>
          <img *ngIf="!iconUrl && !iconClass && app?.iconUrl" [src]="app?.iconUrl" alt="icon"/>
          <i *ngIf="!iconUrl && !iconClass && !app?.iconUrl && app?.iconClass" [class]="app?.iconClass" [style.color]="fgColor(app?.color)"></i>
          <img *ngIf="!iconUrl && !iconClass && !app?.iconUrl && !app?.iconClass && appId" [src]="simpleIconUrlWithColor(appId || '', fgColor(app?.color))" alt="icon"/>
        </div>
      </div>
      <div class="meta">
        <div class="title">{{ title }}</div>
        <div class="subtitle">
          <ng-container *ngIf="subtitle">{{ subtitle }}</ng-container>
          <i class="type-badge" *ngIf="typeIcon" [class]="typeIcon" title="Type"></i>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .node-header { display:flex; align-items:center; gap:10px; }
    .leading { flex: 0 0 auto; display:flex; align-items:center; }
    .meta { min-width:0; flex: 1 1 auto; }
    .title { font-weight: 600; letter-spacing: -0.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .subtitle { color:#8c8c8c; font-size:12px; display:flex; align-items:center; gap:6px; }
    .type-badge { font-size:12px; color:#6b7280; }
    .app-icon { width:28px; height:28px; border-radius:8px; display:inline-flex; align-items:center; justify-content:center; overflow:hidden; }
    .app-icon i { font-size: 16px; line-height:1; }
    .app-icon img { width: 18px; height:18px; object-fit: contain; display:block; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NodeCardHeaderComponent {
  @Input() title: string = '';
  @Input() subtitle: string = '';
  @Input() typeIcon: string = '';
  @Input() app?: AppProvider | null;
  @Input() appId?: string | null;
  // Optional node/template specific icon override
  @Input() iconClass?: string | null;
  @Input() iconUrl?: string | null;
  

  fgColor(bg?: string|null): string {
    const b = String(bg || '#1677ff');
    try {
      const { r, g, b: bb } = this.hexToRgb(b);
      const yiq = (r * 299 + g * 587 + bb * 114) / 1000;
      return yiq >= 140 ? '#111' : '#fff';
    } catch { return '#111'; }
  }
  simpleIconUrlWithColor(id: string, color?: string) {
    const hex = (color || '#111').replace('#','');
    return `https://cdn.simpleicons.org/${encodeURIComponent(id)}/${hex}`;
  }
  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    let s = hex.trim();
    if (s.startsWith('#')) s = s.slice(1);
    if (s.length === 3) s = s.split('').map(c => c + c).join('');
    const num = parseInt(s, 16);
    return { r: (num>>16)&255, g: (num>>8)&255, b: num&255 };
  }
}
