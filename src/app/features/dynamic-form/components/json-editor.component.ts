import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { CodemirrorModule } from '@ks89/ngx-codemirror6';

@Component({
  selector: 'json-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzToolTipModule, CodemirrorModule],
  template: `
    <div class="json-ed">
      <ngx-codemirror [(ngModel)]="value" (ngModelChange)="onChange($event)" class="cm"></ngx-codemirror>
      <div class="bar">
        <span *ngIf="error" class="err" [nz-tooltip]="error">JSON invalide</span>
        <span *ngIf="!error" class="ok">JSON valide</span>
        <span class="spacer"></span>
        <button nz-button nzSize="small" (click)="format()">Formater</button>
        <button nz-button nzSize="small" (click)="minify()">Minifier</button>
      </div>
    </div>
  `,
  styles: [`
    .json-ed { display:flex; flex-direction:column; gap:6px; }
    .cm { height: var(--json-ed-height, 220px); border:1px solid #e5e7eb; border-radius:6px; overflow:hidden; }
    .bar { display:flex; align-items:center; gap:8px; }
    .spacer { flex:1; }
    .err { color:#b91c1c; font-size:12px; }
    .ok { color:#16a34a; font-size:12px; }
  `]
})
export class JsonEditorComponent {
  @Input() value = '';
  @Output() valueChange = new EventEmitter<string>();

  error: string | null = null;

  // Using default extensions of ngx-codemirror6 (no explicit options to avoid template binding errors)

  onChange(v: string) {
    this.value = v;
    // validate
    try { if (v && v.trim().length) JSON.parse(v); this.error = null; } catch (e: any) { this.error = e?.message || 'Invalid JSON'; }
    this.valueChange.emit(v);
  }

  format() {
    try { const obj = this.value ? JSON.parse(this.value) : null; this.value = obj == null ? '' : JSON.stringify(obj, null, 2); this.error = null; this.valueChange.emit(this.value); } catch {}
  }
  minify() {
    try { const obj = this.value ? JSON.parse(this.value) : null; this.value = obj == null ? '' : JSON.stringify(obj); this.error = null; this.valueChange.emit(this.value); } catch {}
  }
}
