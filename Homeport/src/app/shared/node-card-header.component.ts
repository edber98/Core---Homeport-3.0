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
        <div class="app-icon" *ngIf="app || appId || iconUrl || iconClass" [style.background]="(app?.color || '#f3f4f6')">
          <!-- Priority: provider iconUrl > provider iconClass > SimpleIcons fallback > node/template iconUrl > node/template iconClass -->
          <img *ngIf="app?.iconUrl" [src]="app?.iconUrl" alt="icon"/>
          <i *ngIf="!app?.iconUrl && app?.iconClass" [class]="app?.iconClass" [style.color]="fgColor(app?.color)"></i>
          <img *ngIf="!app?.iconUrl && !app?.iconClass && appId" [src]="simpleIconUrlWithColor(appId || '', fgColor(app?.color))" alt="icon"/>
          <img *ngIf="!app?.iconUrl && !app?.iconClass && !appId && iconUrl" [src]="iconUrl" alt="icon"/>
          <i *ngIf="!app?.iconUrl && !app?.iconClass && !appId && !iconUrl && iconClass" [class]="iconClass" [style.color]="fgColor(app?.color)"></i>
        </div>
      </div>
      <div class="meta">
        <div class="title">{{ title }}</div>
        <div class="subtitle">
          <ng-container *ngIf="subtitle">{{ subtitle }}</ng-container>
          <img class="group-badge-img" *ngIf="groupIconUrl" [src]="groupIconUrl" alt="icon" />
          <i class="type-badge" *ngIf="!groupIconUrl && groupIconClass" [ngClass]="groupIconClass" title="Groupe"></i>
          <i class="type-badge" *ngIf="!groupIconUrl && !groupIconClass && typeIcon" [class]="typeIcon" title="Type"></i>
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
    .group-badge-img { width:12px; height:12px; object-fit:contain; display:inline-block; }
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

  get groupIconUrl(): string {
    const url = String(this.iconUrl || '').trim();
    if (url) return url;
    const ic = String(this.iconClass || '').trim();
    if (ic && /^https?:\/\//i.test(ic)) return ic;
    return '';
  }
  get groupIconClass(): string {
    const ic = String(this.iconClass || '').trim();
    if (!ic) return '';
    if (/^https?:\/\//i.test(ic)) return '';
    return ic;
  }
  

  fgColor(bg?: string|null): string {
    const b = String(bg || '#1677ff');
    try {
      const { r, g, b: bb } = this.hexToRgb(b);
      const yiq = (r * 299 + g * 587 + bb * 114) / 1000;
      // 6-char hex (cdn.simpleicons.org refuse les 3-char shorthand → 404).
      return yiq >= 140 ? '#111111' : '#ffffff';
    } catch { return '#111111'; }
  }
  // Providers internes Kinn (pas d'icône sur simpleicons.org) → skip pour
  // éviter le spam 404 dans la console.
  private static readonly INTERNAL_PROVIDERS = new Set([
    'events', 'logic', 'http', 'kinn', 'core', 'cron',
  ]);
  simpleIconUrlWithColor(id: string, color?: string) {
    if (!id || NodeCardHeaderComponent.INTERNAL_PROVIDERS.has(id.toLowerCase())) return '';
    // Normalise la couleur : strip '#', expand 3-char → 6-char.
    let hex = (color || '#111111').replace('#','');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
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
