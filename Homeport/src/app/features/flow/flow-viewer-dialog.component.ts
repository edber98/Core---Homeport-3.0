import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FlowViewerComponent } from './flow-viewer.component';

@Component({
  selector: 'flow-viewer-dialog',
  standalone: true,
  imports: [CommonModule, FlowViewerComponent],
  template: `
    <div class="fv-overlay" (click)="close()"></div>
    <div class="fv-dialog" (click)="$event.stopPropagation()">
      <div class="fv-head">
        <div class="title">Visualiseur</div>
        <div class="sp"></div>
        <button class="icon" title="Menu" (click)="toggleMenu($event)">⋯</button>
        <button class="icon" title="Fermer" (click)="close()">✕</button>
        <div class="menu" *ngIf="menuOpen" (click)="$event.stopPropagation()">
          <button class="mi" (click)="centerFlow()">Centrer le flow</button>
          <button class="mi" (click)="snapshot()">Exporter image</button>
        </div>
      </div>
      <div class="fv-body">
        <flow-viewer class="viewer"
          [nodes]="nodes" [edges]="edges"
          [move]="false" [allowDrag]="false" [allowZoom]="true"
          [showBottomBar]="true" [showCenterFlow]="true" [showRun]="false" [showSave]="false">
        </flow-viewer>
      </div>
    </div>
  `,
  styles: [`
    .fv-overlay { position: fixed; inset:0; background: rgba(17,17,17,0.28); z-index: 8000; }
    .fv-dialog { position: fixed; inset: 0; z-index: 8001; display:flex; flex-direction: column; align-items: stretch; justify-content: center; padding: 16px; }
    .fv-head { display:flex; align-items:center; gap:8px; background:#fff; border:1px solid #e5e7eb; border-radius: 12px 12px 0 0; padding: 8px 10px; box-shadow: 0 6px 16px rgba(0,0,0,.08); max-width: 1200px; margin: 0 auto; width: 100%; }
    .fv-head .title { font-weight:600; }
    .fv-head .sp { flex:1 1 auto; }
    .fv-head .icon { border:1px solid #e5e7eb; background:#fff; border-radius:8px; padding:4px 8px; cursor:pointer; }
    .fv-head { position: relative; }
    .fv-head .menu { position:absolute; top: 40px; right: 48px; background:#fff; border:1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 8px 20px rgba(0,0,0,.12); display:flex; flex-direction:column; }
    .fv-head .menu .mi { border:0; background:#fff; padding: 8px 10px; cursor:pointer; text-align:left; }
    .fv-head .menu .mi:hover { background:#f5f5f6; }
    .fv-body { background:#fff; border:1px solid #e5e7eb; border-top:0; border-radius: 0 0 12px 12px; max-width: 1200px; margin: 0 auto; width: 100%; height: min(92vh, 860px); box-shadow: 0 12px 24px rgba(0,0,0,.10); overflow: hidden; }
    .viewer { display:block; height: 100%; }
  `]
})
export class FlowViewerDialogComponent {
  @Input() nodes: any[] = [];
  @Input() edges: any[] = [];
  menuOpen = false;

  toggleMenu(ev: MouseEvent) {
    ev.stopPropagation();
    this.menuOpen = !this.menuOpen;
  }
  centerFlow() { /* placeholder: centering handled by inner bottom bar */ this.menuOpen = false; }
  snapshot() { this.menuOpen = false; }
  close() { history.back(); }
}

