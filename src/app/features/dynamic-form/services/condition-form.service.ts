import { Injectable } from '@angular/core';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';

@Injectable({ providedIn: 'root' })
export class ConditionFormService {
  constructor(private fb: FormBuilder) {}

  newRow(kind: 'rule'|'group' = 'rule'): FormGroup {
    return kind === 'rule'
      ? this.fb.group({ kind: ['rule'], field: [''], operator: ['=='], value: [''] })
      : this.fb.group({ kind: ['group'], logic: ['any'], items: this.fb.array([ this.newRow('rule') ]) });
  }

  fromNode(node: any): FormGroup {
    if (!node || typeof node !== 'object') return this.newRow('rule');
    if (node.any || node.all) {
      const logic = node.any ? 'any' : 'all';
      const arr = (node[logic] as any[]).map(n => this.fromNode(n));
      return this.fb.group({ kind: ['group'], logic: [logic], items: this.fb.array(arr) });
    }
    const op = Object.keys(node)[0];
    const args = (node as any)[op] || [];
    const field = args?.[0]?.var ?? '';
    const value = args?.[1] ?? '';
    return this.fb.group({ kind: ['rule'], field: [field], operator: [op], value: [value] });
  }

  changeKind(items: FormArray, i: number, kind: 'rule'|'group') {
    items.setControl(i, this.newRow(kind));
  }
  addSubRule(items: FormArray, i: number) {
    const grp = items.at(i) as FormGroup;
    const arr = grp.get('items') as FormArray | null;
    if (arr) arr.push(this.newRow('rule'));
  }
  addSubGroup(items: FormArray, i: number) {
    const grp = items.at(i) as FormGroup;
    const arr = grp.get('items') as FormArray | null;
    if (arr) arr.push(this.newRow('group'));
  }
  removeAt(items: FormArray, i: number) { items.removeAt(i); }
  removeSubAt(items: FormArray, i: number, j: number) {
    const arr = (items.at(i) as FormGroup).get('items') as FormArray | null;
    arr?.removeAt(j);
  }

  buildNodeFromForm(grp: FormGroup): any {
    const kind = grp.get('kind')?.value;
    if (kind === 'group') {
      const logic = grp.get('logic')?.value || 'any';
      const arr = ((grp.get('items') as FormArray)?.controls || []).map(c => this.buildNodeFromForm(c as FormGroup));
      return { [logic]: arr };
    }
    const field = grp.get('field')?.value;
    const op = grp.get('operator')?.value || '==';
    const val = grp.get('value')?.value;
    return { [op]: [ { var: field }, this.parseMaybeNumber(val) ] };
  }
  buildConditionObject(form: FormGroup): any {
    const logic = form.get('logic')?.value || 'single';
    const items = (form.get('items') as FormArray)?.controls || [];
    if (logic === 'single' && items.length === 1) return this.buildNodeFromForm(items[0] as FormGroup);
    return { [logic]: items.map(c => this.buildNodeFromForm(c as FormGroup)) };
  }
  private parseMaybeNumber(x: any) { const n = Number(x); return isNaN(n) ? x : n; }
}

