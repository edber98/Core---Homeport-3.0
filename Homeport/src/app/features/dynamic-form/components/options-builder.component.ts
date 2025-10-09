import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';

@Component({
  selector: 'options-builder',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NzFormModule, NzInputModule, NzButtonModule],
  template: `
    <form [formGroup]="group">
      <div formArrayName="items">
        <div *ngFor="let grp of items.controls; let i=index" [formGroupName]="i" style="display:flex; gap:6px; margin-bottom:6px;">
          <input nz-input placeholder="Label" formControlName="label" />
          <input nz-input placeholder="Value" formControlName="value" />
          <button nz-button nzType="text" nzDanger (click)="remove.emit(i); $event.preventDefault(); $event.stopPropagation()">Supprimer</button>
        </div>
      </div>
      <button nz-button nzType="dashed" (click)="add.emit(); $event.preventDefault(); $event.stopPropagation()">+ Ajouter une option</button>
    </form>
  `
})
export class OptionsBuilderComponent {
  @Input({ required: true }) group!: FormGroup; // { items: FormArray<{label,value}> }
  @Output() add = new EventEmitter<void>();
  @Output() remove = new EventEmitter<number>();

  get items(): FormArray { return this.group.get('items') as FormArray; }
}

