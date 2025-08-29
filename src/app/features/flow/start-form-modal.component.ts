import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DynamicForm } from '../../modules/dynamic-form/dynamic-form';

@Component({
  standalone: true,
  selector: 'start-form-modal',
  imports: [CommonModule, DynamicForm],
  template: `
    <div style="padding:8px;">
      <app-dynamic-form [schema]="schema || { title: 'Formulaire', fields: [] }" [value]="value || {}"
        (valueChange)="value = $event" (submitted)="submit($event)"></app-dynamic-form>
    </div>
  `
})
export class StartFormModalComponent {
  @Input() schema: any;
  @Input() value: any;
  @Input() title: string | null = 'Formulaire';
  @Output() submitted = new EventEmitter<any>();
  submit(v: any) { this.submitted.emit(v != null ? v : this.value || {}); }
}
