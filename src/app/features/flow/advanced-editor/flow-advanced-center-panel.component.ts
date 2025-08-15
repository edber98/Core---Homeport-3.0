import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DynamicForm } from '../../../modules/dynamic-form/dynamic-form';

@Component({
  selector: 'flow-advanced-center-panel',
  standalone: true,
  imports: [CommonModule, DynamicForm],
  template: `
    <div class="card">
      <div class="toolbar">
        <button class="icon" (click)="undoForm()" [disabled]="!canUndoForm" title="Annuler"><i class="fa-solid fa-rotate-left"></i></button>
        <button class="icon" (click)="redoForm()" [disabled]="!canRedoForm" title="Rétablir"><i class="fa-solid fa-rotate-right"></i></button>
      </div>
      <div class="body">
        <app-dynamic-form *ngIf="schema as s"
          [schema]="s"
          [value]="model?.context || {}"
          (valueChange)="onValue($event)"
          (validChange)="onValid($event)"
          (submitted)="onSubmitted($event)">
        </app-dynamic-form>
        <div *ngIf="!schema" class="placeholder">Aucun schéma d’arguments (template.args absent).</div>
      </div>
    </div>
  `,
  styles: [`
    :host { display:block; }
    .card { position:relative; background:#fff; border:1px solid #ececec; border-radius:14px; box-shadow:0 20px 40px rgba(0,0,0,.12); width: var(--dialog-w, 960px); max-width: 100vw; padding: 0 0 16px; height:var(--dialog-h, 68vh); max-height:90vh; display:flex; flex-direction:column; }
    .toolbar { position:absolute; top:8px; right:12px; display:flex; gap:6px; z-index:2; }
    .toolbar .icon { background:#fff; color:#111; border:1px solid #e5e7eb; border-radius:8px; padding:6px 8px; cursor:pointer; }
    .toolbar .icon[disabled] { color:#bbb; border-color:#eee; background:#fafafa; cursor:not-allowed; }
    .body { padding: 12px 16px; flex:1 1 auto; overflow:auto; }
    .placeholder { color:#8c8c8c; font-size:12px; padding:8px; }
  `]
})
export class FlowAdvancedCenterPanelComponent {
  @Input() model: any = {};
  @Output() modelChange = new EventEmitter<any>();
  @Output() submitted = new EventEmitter<any>();
  // Derived schema from template
  get schema() { return this.model?.templateObj?.args || null; }
  private formPast: any[] = [];
  private formFuture: any[] = [];
  private applying = false;
  private lastJson = '';

  ngOnChanges() {
    // reset local form history when model changes (new node or import)
    try {
      const init = this.model?.context || {};
      this.formPast = [JSON.parse(JSON.stringify(init))];
      this.formFuture = [];
      this.lastJson = JSON.stringify(init);
    } catch { this.formPast = [{}]; this.formFuture = []; this.lastJson = '{}'; }
  }

  onValue(v: Record<string, any>) {
    const json = JSON.stringify(v || {});
    if (json === this.lastJson) return;
    if (!this.applying) {
      this.formPast.push(JSON.parse(json));
      this.formFuture = [];
    }
    this.lastJson = json;
    const m = { ...this.model, context: v };
    this.model = m;
    this.modelChange.emit(m);
  }
  onValid(valid: boolean) {
    const m = { ...this.model, invalid: !valid };
    this.model = m;
    this.modelChange.emit(m);
  }
  get canUndoForm() { return this.formPast.length > 1; }
  get canRedoForm() { return this.formFuture.length > 0; }
  undoForm() {
    if (!this.canUndoForm) return;
    const current = this.formPast.pop();
    if (!current) return;
    const prev = this.formPast[this.formPast.length - 1];
    this.formFuture.push(current);
    this.applyForm(prev);
  }
  redoForm() {
    if (!this.canRedoForm) return;
    const next = this.formFuture.pop();
    if (!next) return;
    this.formPast.push(JSON.parse(JSON.stringify(next)));
    this.applyForm(next);
  }
  private applyForm(v: any) {
    this.applying = true;
    try {
      const m = { ...this.model, context: JSON.parse(JSON.stringify(v || {})) };
      this.model = m;
      this.lastJson = JSON.stringify(m.context || {});
      this.modelChange.emit(m);
    } finally {
      setTimeout(() => (this.applying = false));
    }
  }

  onSubmitted(v: any) {
    const json = JSON.stringify(v || {});
    if (json !== this.lastJson) {
      this.lastJson = json;
      const m = { ...this.model, context: v };
      this.model = m;
      this.modelChange.emit(m);
    }
    this.submitted.emit(this.model);
  }
}
