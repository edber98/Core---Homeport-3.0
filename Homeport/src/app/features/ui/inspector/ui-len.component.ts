import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';

@Component({
  selector: 'ui-len',
  standalone: true,
  imports: [CommonModule, FormsModule, NzInputModule, NzSelectModule],
  template: `
    <div class="len">
      <input nz-input type="text" [ngModel]="numText" (ngModelChange)="onNum($event)" [placeholder]="placeholder || ''"/>
      <nz-select [ngModel]="unit" (ngModelChange)="onUnit($event)" nzAllowClear>
        <nz-option [nzValue]="''" nzLabel="—"></nz-option>
        <nz-option *ngFor="let u of units" [nzValue]="u" [nzLabel]="u"></nz-option>
      </nz-select>
      <button *ngIf="value" type="button" class="mini" (click)="clear()">×</button>
    </div>
  `,
  styles: [`
    .len { display:flex; gap:6px; align-items:center; }
    .len input { flex:1; ; }
    .len nz-select { width:58px; }
    .mini {  padding:4px 8px; border:1px solid #e5e7eb; background:#fff; border-radius:10px; cursor:pointer; }
  `]
})
export class UiLenComponent {
  @Input() value: string | undefined;
  @Input() defaultUnit: string | undefined;
  @Input() placeholder: string | undefined;
  @Output() valueChange = new EventEmitter<string | undefined>();

  units = ['px','%','em','rem','vw','vh','ch'];
  unit: string = '';
  numText = '';

  ngOnChanges() {
    const { num, unit } = this.parse(this.value);
    this.unit = (unit ?? '') as string;
    this.numText = num ?? '';
  }
  onNum(v: string) {
    this.numText = v;
    this.emit();
  }
  onUnit(u: string) { this.unit = u; this.emit(); }
  clear() { this.valueChange.emit(undefined); }
  private emit() {
    const val = this.format(this.numText, this.unit);
    this.valueChange.emit(val);
  }
  private parse(v?: string): { num: string | undefined; unit: string | undefined } {
    if (!v) return { num: undefined, unit: undefined };
    const m = String(v).trim().match(/^(-?\d*\.?\d+)([a-z%]*)$/i);
    if (!m) return { num: v, unit: this.defaultUnit || 'px' };
    return { num: m[1], unit: m[2] || this.defaultUnit || 'px' };
  }
  private format(n: string, u: string): string | undefined {
    const t = (n || '').trim(); if (!t) return undefined;
    // If user provided any unit or function, keep as-is
    if (/[a-z%)]/i.test(t)) return t;
    // No unit requested -> return raw number
    if (!u) return t;
    return `${t}${u}`;
  }
}
