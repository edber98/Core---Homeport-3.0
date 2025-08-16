import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { JsonSchemaViewerComponent } from '../modules/json-schema-viewer/json-schema-viewer';

@Component({
  selector: 'app-json-viewer-playground',
  standalone: true,
  imports: [CommonModule, FormsModule, JsonSchemaViewerComponent],
  template: `
    <div class="play">
      <div class="left">
        <h3>JSON Viewer (drag pills)</h3>
        <app-json-schema-viewer [data]="data" [editable]="false" [editMode]="false" [initialMode]="'Schema'" [title]="'Contexte'" [subtitle]="'Drag depuis les pills'" [rootAlias]="'ctx'"></app-json-schema-viewer>
        <div class="row">
          <button class="btn" (click)="openDialog('single')">Ouvrir Dialog (panel single)</button>
          <button class="btn" (click)="openDialog('wings')">Ouvrir Dialog (avec wings)</button>
          <button class="btn" (click)="openDialog('carousel')">Ouvrir Dialog (carousel)</button>
        </div>
      </div>
      <div class="right">
        <h3>Dropzone</h3>
        <div class="drop" (dragover)="onOver($event)" (drop)="onDrop($event)">
          <div *ngIf="!lastDrop">Glisser une pill ici…</div>
          <div *ngIf="lastDrop">
            <div><strong>MIME:</strong> {{ lastDrop.mime }}</div>
            <div><strong>Texte:</strong> {{ lastDrop.text }}</div>
            <div><strong>Tag:</strong> {{ lastDrop.tag }}</div>
          </div>
        </div>
        <div class="log" *ngIf="logs.length">
          <h4>Logs</h4>
          <pre>{{ logs.join('\n') }}</pre>
        </div>
      </div>
    </div>

    <!-- Fullscreen dialog for iPhone/Responsive tests -->
    <div class="dlg-overlay" *ngIf="showDlg" (click)="closeDialog()"></div>
    <div class="dlg" *ngIf="showDlg">
      <button class="dlg-close" (click)="closeDialog()">✕</button>
      <!-- Single panel (responsive-safe) -->
      <div *ngIf="dlgLayout==='single'" class="dlg-panel">
        <div class="dlg-head">Dialog – Panel Single</div>
        <div class="dlg-body">
          <app-json-schema-viewer [data]="data" [editable]="false" [editMode]="false" [initialMode]="'Schema'" [title]="'Context (panel)'"></app-json-schema-viewer>
          <div class="drop in-dlg" (dragover)="onOver($event)" (drop)="onDrop($event)">
            <div *ngIf="!lastDrop">Drop ici (panel)…</div>
            <div *ngIf="lastDrop">
              <div><strong>MIME:</strong> {{ lastDrop.mime }}</div>
              <div><strong>Texte:</strong> {{ lastDrop.text }}</div>
            </div>
          </div>
        </div>
      </div>
      <!-- Wings layout (desktop-like), to compare behavior -->
      <div *ngIf="dlgLayout==='wings'" class="dlg-wings">
        <div class="wing left">
          <app-json-schema-viewer [data]="data" [editable]="false" [editMode]="false" [initialMode]="'Schema'" [title]="'Input (wing)'"></app-json-schema-viewer>
        </div>
        <div class="center">
          <div class="dlg-head">Dialog – Wings</div>
          <div class="dlg-body">
            <div class="info">Zone centrale (contenu de test)</div>
            <div class="drop in-dlg" (dragover)="onOver($event)" (drop)="onDrop($event)">
              <div *ngIf="!lastDrop">Drop ici (center)…</div>
              <div *ngIf="lastDrop">
                <div><strong>MIME:</strong> {{ lastDrop.mime }}</div>
                <div><strong>Texte:</strong> {{ lastDrop.text }}</div>
              </div>
            </div>
          </div>
        </div>
        <div class="wing right">
          <app-json-schema-viewer [data]="data" [editable]="false" [editMode]="false" [initialMode]="'Schema'" [title]="'Output (wing)'"></app-json-schema-viewer>
        </div>
      </div>
      <!-- Carousel (mobile-like) to reproduce potential iOS issue -->
      <div *ngIf="dlgLayout==='carousel'" class="dlg-carousel">
        <div class="cv" [style.transform]="'translateX(-' + (active*33.3333) + '%)'">
          <div class="cv-slide">
            <div class="panel-card">
              <app-json-schema-viewer [data]="data" [editable]="false" [editMode]="false" [initialMode]="'Schema'" [title]="'Input (carousel)'"></app-json-schema-viewer>
            </div>
          </div>
          <div class="cv-slide">
            <div class="panel-card">
              <div class="info">Centre (carousel)</div>
              <div class="drop in-dlg" (dragover)="onOver($event)" (drop)="onDrop($event)">
                <div *ngIf="!lastDrop">Drop ici (center)…</div>
                <div *ngIf="lastDrop">
                  <div><strong>MIME:</strong> {{ lastDrop.mime }}</div>
                  <div><strong>Texte:</strong> {{ lastDrop.text }}</div>
                </div>
              </div>
            </div>
          </div>
          <div class="cv-slide">
            <div class="panel-card">
              <app-json-schema-viewer [data]="data" [editable]="false" [editMode]="false" [initialMode]="'Schema'" [title]="'Output (carousel)'"></app-json-schema-viewer>
            </div>
          </div>
        </div>
        <div class="cv-nav">
          <button class="nav-btn" (click)="prevCv()">‹</button>
          <div class="dots">
            <span class="dot" [class.active]="active===0" (click)="active=0"></span>
            <span class="dot" [class.active]="active===1" (click)="active=1"></span>
            <span class="dot" [class.active]="active===2" (click)="active=2"></span>
          </div>
          <button class="nav-btn" (click)="nextCv()">›</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .play { display:flex; gap:16px; padding:12px; }
    .left, .right { flex: 1 1 0; min-width: 0; }
    .drop { height: 220px; border:2px dashed #cbd5e1; border-radius: 12px; display:flex; align-items:center; justify-content:center; color:#64748b; background:#f8fafc; }
    h3 { margin: 8px 0; }
    .log { margin-top: 10px; }
    .log pre { margin:0; padding:8px; border:1px solid #e5e7eb; border-radius:8px; background:#fff; color:#111; max-height: 220px; overflow:auto; }
    .row { display:flex; gap:8px; margin-top: 10px; }
    .btn { border:1px solid #e5e7eb; background:#fff; border-radius:8px; padding:6px 10px; cursor:pointer; }
    /* Dialog overlay + shells */
    .dlg-overlay { position: fixed; inset:0; background: rgba(17,17,17,0.28); z-index: 9000; }
    .dlg { position: fixed; inset: 0; z-index: 9001; display:flex; align-items:center; justify-content:center; }
    .dlg-close { position: fixed; top: 12px; right: 12px; background: transparent; border: 0; font-size: 20px; cursor: pointer; z-index: 9002; }
    /* Single panel (responsive-safe): no transforms; single scroll container */
    .dlg-panel { width: min(96vw, 1100px); height: min(92vh, 800px); background:#fff; border:1px solid #e5e7eb; border-radius: 14px; box-shadow: 0 12px 28px rgba(0,0,0,.16); display:flex; flex-direction: column; overflow: hidden; }
    .dlg-panel .dlg-head { padding: 8px 12px; border-bottom:1px solid #f0f0f0; font-weight: 600; }
    .dlg-panel .dlg-body { flex:1 1 auto; min-height: 0; overflow:auto; -webkit-overflow-scrolling: touch; padding: 10px; }
    .drop.in-dlg { height: 140px; }
    /* Wings layout (desktop-like) */
    .dlg-wings { width: min(96vw, 1300px); height: min(92vh, 800px); display:flex; align-items: stretch; gap:12px; }
    .dlg-wings .wing { flex: 0 0 360px; background:#fff; border:1px solid #e5e7eb; border-radius: 12px; box-shadow: 0 12px 28px rgba(0,0,0,.10); overflow:auto; -webkit-overflow-scrolling: touch; padding: 8px; }
    .dlg-wings .wing.left { border-radius: 14px 0 0 14px; }
    .dlg-wings .wing.right { border-radius: 0 14px 14px 0; }
    .dlg-wings .center { flex: 1 1 auto; min-width: 0; background:#fff; border:1px solid #e5e7eb; border-radius: 12px; box-shadow: 0 12px 28px rgba(0,0,0,.10); display:flex; flex-direction: column; overflow: hidden; }
    .dlg-wings .center .dlg-head { padding: 8px 12px; border-bottom:1px solid #f0f0f0; font-weight: 600; }
    .dlg-wings .center .dlg-body { flex:1 1 auto; min-height:0; overflow:auto; -webkit-overflow-scrolling: touch; padding: 10px; }
    /* Carousel (mobile-like) */
    .dlg-carousel { position: relative; width: min(96vw, 1100px); height: min(92vh, 800px); background:#fff; border:1px solid #e5e7eb; border-radius: 14px; box-shadow: 0 12px 28px rgba(0,0,0,.16); overflow: hidden; }
    .dlg-carousel .cv { width: 300%; height: 100%; display:flex; transition: transform .24s ease; }
    .dlg-carousel .cv-slide { width: 33.3333%; height: 100%; overflow:auto; -webkit-overflow-scrolling: touch; padding: 10px; }
    .dlg-carousel .cv-nav { position:absolute; bottom:8px; left:50%; transform: translateX(-50%); display:flex; align-items:center; gap:10px; background:#fff; border:1px solid #e5e7eb; border-radius: 12px; padding: 4px 8px; box-shadow: 0 6px 16px rgba(0,0,0,.10); z-index: 2; }
    .dlg-carousel .nav-btn { background:#fff; border:1px solid #e5e7eb; border-radius: 8px; width: 28px; height: 28px; cursor:pointer; }
    .dlg-carousel .dots { display:flex; gap:6px; }
    .dlg-carousel .dot { width: 6px; height: 6px; border-radius: 50%; background:#cbd5e1; cursor:pointer; }
    .dlg-carousel .dot.active { background:#111; }
  `]
})
export class JsonViewerPlaygroundComponent {
  data: any = {
    user: {
      id: 'u_123',
      name: 'Alice',
      email: 'alice@example.com',
      roles: ['admin','editor'],
      profile: { city: 'Paris', locale: 'fr_FR' }
    },
    items: [
      { id: 'it_1', name: 'Item A', qty: 2 },
      { id: 'it_2', name: 'Item B', qty: 1 }
    ],
    flags: { beta: true, archived: false },
    total: 123.45
  };

  logs: string[] = [];
  lastDrop: { mime: string; text: string; tag?: string } | null = null;
  showDlg = false;
  dlgLayout: 'single'|'wings'|'carousel' = 'single';
  active = 1;

  onOver(ev: DragEvent) {
    ev.preventDefault();
  }
  async onDrop(ev: DragEvent) {
    ev.preventDefault();
    const dt = ev.dataTransfer;
    if (!dt) return;
    let text = '';
    let tag = '';
    try { text = await dt.getData('text/plain'); } catch {}
    try { tag = await dt.getData('application/x-expression-tag'); } catch {}
    const mime = (dt.types && dt.types.length) ? dt.types.join(',') : 'unknown';
    this.lastDrop = { mime, text, tag };
    this.logs.unshift(`[drop] types=${mime} text=${text} tag=${tag}`);
    if (this.logs.length > 50) this.logs.pop();
  }

  openDialog(layout: 'single'|'wings'|'carousel') {
    this.dlgLayout = layout;
    this.showDlg = true;
  }
  closeDialog() { this.showDlg = false; }
  prevCv() { this.active = Math.max(0, this.active - 1); }
  nextCv() { this.active = Math.min(2, this.active + 1); }
}
