import { Injectable } from '@angular/core';
import type { FormSchema } from '../../../modules/dynamic-form/dynamic-form.service';

@Injectable({ providedIn: 'root' })
export class BuilderHistoryService {
  private past: string[] = [];
  private future: string[] = [];

  reset(schema: FormSchema) {
    this.past = [this.serialize(schema)];
    this.future = [];
  }
  canUndo(): boolean { return this.past.length > 1; }
  canRedo(): boolean { return this.future.length > 0; }
  last(): string | null { return this.past.length ? this.past[this.past.length - 1] : null; }

  push(schema: FormSchema) {
    const json = this.serialize(schema);
    if (this.last() === json) return; // dedupe identical snapshot
    this.past.push(json);
    this.future = [];
  }

  undo(): FormSchema | null {
    if (!this.canUndo()) return null;
    const cur = this.past.pop();
    if (!cur) return null;
    const prev = this.past[this.past.length - 1];
    if (!prev) { this.past.push(cur); return null; }
    this.future.push(cur);
    return this.deserialize(prev);
  }

  redo(): FormSchema | null {
    if (!this.canRedo()) return null;
    const next = this.future.pop()!;
    this.past.push(next);
    return this.deserialize(next);
  }

  private serialize(s: FormSchema): string {
    try { return JSON.stringify(s); } catch { return '{}'; }
  }
  private deserialize(json: string): FormSchema {
    try { return JSON.parse(json); } catch { return {} as any; }
  }
}

