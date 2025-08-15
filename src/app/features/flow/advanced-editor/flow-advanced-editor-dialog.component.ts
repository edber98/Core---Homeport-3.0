import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, OnInit, AfterViewInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { FlowAdvancedInputPanelComponent } from './flow-advanced-input-panel.component';
import { FlowAdvancedOutputPanelComponent } from './flow-advanced-output-panel.component';
import { FlowAdvancedCenterPanelComponent } from './flow-advanced-center-panel.component';
import { JsonSchemaViewerComponent } from '../../../modules/json-schema-viewer/json-schema-viewer';

@Component({
  selector: 'flow-advanced-editor-dialog',
  standalone: true,
  imports: [CommonModule, FlowAdvancedInputPanelComponent, FlowAdvancedOutputPanelComponent, FlowAdvancedCenterPanelComponent, JsonSchemaViewerComponent],
  template: `
    <div class="overlay" (click)="onBackdrop($event)" [class.enter]="centerVisible"></div>
    <div class="bundle" [class.center-visible]="centerVisible" [class.wings-visible]="wingsVisible">
      <div class="wing left" aria-label="Input wing" *ngIf="hasInput(model)">
       <app-json-schema-viewer [data]="model?.context || {}" [editable]="true" [editMode]="true" [initialMode]="'Schema'" [title]="'Input'"></app-json-schema-viewer>
      </div>
      <div class="center">
        <flow-advanced-center-panel [model]="model" (modelChange)="emitModel($event)" (submitted)="onFormSubmitted($event)"></flow-advanced-center-panel>
        <button class="close" (click)="startExit()" title="Fermer">✕</button>
      </div>
      <div class="wing right" aria-label="Output wing" *ngIf="hasOutput(model)">
       <app-json-schema-viewer [data]="model?.context || {}" [editable]="true" [editMode]="true" [initialMode]="'Schema'" [title]="'Output'"></app-json-schema-viewer>
      </div>
    </div>
  `,
  styles: [`
    :host { position:fixed; inset:0; z-index: 1000; display:block; }
    .overlay { position:absolute; inset:0; background:rgba(17,17,17,0.28); backdrop-filter: blur(2px); opacity:0; transition: opacity .24s ease; }
    .overlay.enter { opacity:1; }
    .bundle { --dialog-h: 90vh; --dialog-w: 450px; --wing-h: calc(var(--dialog-h) - 200px); --wing-w: max(0px, min(var(--dialog-w), calc((100vw - 400px - var(--dialog-w)) / 2))); position:fixed; top:50%; left:50%; transform: translate(-50%, calc(-50% + 8px)); display:flex; align-items:center; gap:0; z-index:10; opacity:0; transition: opacity .22s ease, transform .26s ease; }
    .bundle.center-visible { opacity:1; transform: translate(-50%, -50%); }
    .center { position:relative; z-index:6; }
    .close { position:absolute; top:8px; right:12px; background:#fff; border:1px solid #e5e7eb; border-radius:18px; padding:4px 8px; cursor:pointer; box-shadow:0 2px 6px rgba(0,0,0,.12); }
    .wing { height:var(--wing-h); background:#f7f7f8; overflow:auto; opacity:0; }
    .wing.left { width:var(--wing-w); border:1px solid #e5e7eb; border-right:none; border-radius:12px 0 0 12px; box-shadow:0 12px 24px rgba(0,0,0,.08); transform: translateX(-8px) scaleX(0.92); transform-origin: right center; transition: transform .28s ease .12s, opacity .24s ease .12s; z-index:5; }
    .wing.right { width:var(--wing-w); border:1px solid #e5e7eb; border-left:none; border-radius:0 12px 12px 0; box-shadow:0 12px 24px rgba(0,0,0,.08); transform: translateX(8px) scaleX(0.92); transform-origin: left center; transition: transform .28s ease .12s, opacity .24s ease .12s; z-index:5; }
    .bundle.wings-visible .wing.left, .bundle.wings-visible .wing.right { transform: translateX(0) scaleX(1); opacity:1; }

    @media (max-width: 1280px) { .bundle { --dialog-w: 450px; } }
    @media (max-width: 1024px) { .bundle { --dialog-w: 450px; } }
    @media (max-width: 768px) {
      .wing.right { display:none; }
      .bundle { left:50%; --dialog-w: calc(100vw - 24px); }
    }
  `]
})
export class FlowAdvancedEditorDialogComponent implements OnInit, AfterViewInit {
  @Input() model: any;
  @Output() modelChange = new EventEmitter<any>();
  @Output() close = new EventEmitter<void>();
  centerVisible = false;
  wingsVisible = false;

  onBackdrop(_ev: MouseEvent) { this.startExit(); }
  emitModel(m: any) { this.modelChange.emit(m); }
  ngOnInit() {}
  constructor(private cdr: ChangeDetectorRef, private zone: NgZone) {}
  ngAfterViewInit() {
    this.zone.run(() => {
      setTimeout(() => {
        this.centerVisible = true;
        this.cdr.detectChanges();
        setTimeout(() => {
          this.wingsVisible = true;
          this.cdr.detectChanges();
        }, 160);
      });
    });
  }

  startExit() {
    // Reverse sequence: retract wings, then hide center/overlay, then emit close
    this.wingsVisible = false;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.centerVisible = false;
      this.cdr.detectChanges();
      setTimeout(() => this.close.emit(), 260);
    }, 320);
  }

  hasInput(model: any): boolean {
    try { return !!model && model.templateObj?.type !== 'start'; } catch { return false; }
  }
  hasOutput(model: any): boolean {
    try { return !!model && model.templateObj?.type !== 'end'; } catch { return false; }
  }
  onFormSubmitted(m: any) {
    try { this.emitModel(m || this.model); } catch {}
    this.startExit();
  }

}
