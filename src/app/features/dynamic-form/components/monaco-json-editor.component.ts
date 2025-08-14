import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';

declare global {
  interface Window {
    require: any;
    monaco: any;
  }
}

@Component({
  selector: 'monaco-json-editor',
  standalone: true,
  imports: [CommonModule, NzButtonModule, NzToolTipModule],
  template: `
    <div class="wrap">
      <div #host class="editor" [style.height.px]="height"></div>
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
    .wrap { display:flex; flex-direction:column; gap:6px; }
    .editor { border:1px solid #e5e7eb; border-radius:6px; }
    .bar { display:flex; align-items:center; gap:8px; }
    .spacer { flex:1; }
    .err { color:#b91c1c; font-size:12px; }
    .ok { color:#16a34a; font-size:12px; }
  `]
})
export class MonacoJsonEditorComponent implements AfterViewInit, OnDestroy, OnChanges {
  @Input() value = '';
  @Output() valueChange = new EventEmitter<string>();
  @Input() height = 220;

  @ViewChild('host', { static: true }) hostRef!: ElementRef<HTMLDivElement>;

  private editor: any;
  error: string | null = null;
  private disposing = false;
  private internalEdit = false;

  async ngAfterViewInit(): Promise<void> {
    await this.ensureMonaco();
    this.createEditor();
  }

  ngOnDestroy(): void {
    this.disposing = true;
    try { this.editor?.dispose?.(); } catch {}
  }

  private ensureMonaco(): Promise<void> {
    if (window.monaco && window.monaco.editor) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      const vsPath = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs';
      const load = () => {
        window.require.config({ paths: { 'vs': vsPath } });
        window.require(['vs/editor/editor.main'], () => resolve(), reject);
      };
      if (window.require) { load(); return; }
      const s = document.createElement('script');
      s.src = vsPath + '/loader.js';
      s.async = true;
      s.onload = load;
      s.onerror = () => reject(new Error('Failed to load monaco loader'));
      document.body.appendChild(s);
    });
  }

  private createEditor() {
    const monaco = window.monaco;
    this.editor = monaco.editor.create(this.hostRef.nativeElement, {
      value: this.value || '',
      language: 'json',
      automaticLayout: true,
      minimap: { enabled: false },
      formatOnPaste: true,
      formatOnType: true,
    });
    this.editor.onDidChangeModelContent(() => {
      if (this.disposing) return;
      this.internalEdit = true;
      const v: string = this.editor.getValue();
      this.value = v;
      // validate
      try { if (v && v.trim().length) JSON.parse(v); this.error = null; } catch (e: any) { this.error = e?.message || 'Invalid JSON'; }
      this.valueChange.emit(v);
      this.internalEdit = false;
    });
  }

  format() { try { this.editor.getAction('editor.action.formatDocument').run(); } catch {} }
  minify() {
    try { const obj = this.value ? JSON.parse(this.value) : null; const v = obj == null ? '' : JSON.stringify(obj); this.editor?.setValue?.(v); } catch {}
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.disposing) return;
    if ('value' in changes) {
      // External value change: update editor content if different
      const v = this.value || '';
      if (this.editor && !this.internalEdit) {
        try {
          const cur = this.editor.getValue() || '';
          if (cur !== v) this.editor.setValue(v);
        } catch {}
      }
    }
  }
}
