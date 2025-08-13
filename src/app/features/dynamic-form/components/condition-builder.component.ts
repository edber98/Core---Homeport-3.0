import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDividerModule } from 'ng-zorro-antd/divider';

@Component({
  selector: 'condition-builder',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, NzFormModule, NzSelectModule, NzInputModule, NzButtonModule, NzDividerModule],
  templateUrl: './condition-builder.component.html'
})
export class ConditionBuilderComponent {
  @Input({ required: true }) group!: FormGroup; // conditionForm { logic, items[] }
  @Input() inputFieldKeys: string[] = [];

  @Output() addConditionRow = new EventEmitter<void>();
  @Output() removeConditionRow = new EventEmitter<number>();
  @Output() changeCondKind = new EventEmitter<{ index: number; kind: 'rule'|'group' }>();
  @Output() addSubRule = new EventEmitter<number>();
  @Output() addSubGroup = new EventEmitter<number>();
  @Output() removeSubAt = new EventEmitter<{ index: number; subIndex: number }>();

  get items(): FormArray { return this.group.get('items') as FormArray; }
  subItemsAt(i: number): FormArray { return (this.items.at(i).get('items') as FormArray); }
  subItemsAtNested(i: number, j: number): FormArray { return ((this.items.at(i).get('items') as FormArray).at(j).get('items') as FormArray); }

  onChangeKind(i: number, v: any) {
    const kind = (v as 'rule'|'group');
    this.changeCondKind.emit({ index: i, kind });
  }
}
