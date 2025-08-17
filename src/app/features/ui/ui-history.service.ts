import { Injectable } from '@angular/core';
import { UiNode } from './ui-model.service';

type Snapshot = { root: UiNode; selectedId: string };

@Injectable({ providedIn: 'root' })
export class UiHistoryService {
  private past: Snapshot[] = [];
  private future: Snapshot[] = [];

  reset(s: Snapshot) { this.past = [this.clone(s)]; this.future = []; }
  push(s: Snapshot) { this.past.push(this.clone(s)); this.future = []; }
  canUndo(): boolean { return this.past.length > 1; }
  canRedo(): boolean { return this.future.length > 0; }
  undo(): Snapshot | null {
    if (!this.canUndo()) return null;
    const cur = this.past.pop()!;
    this.future.unshift(this.clone(cur));
    return this.clone(this.past[this.past.length - 1]);
  }
  redo(): Snapshot | null {
    if (!this.canRedo()) return null;
    const next = this.future.shift()!;
    this.past.push(this.clone(next));
    return this.clone(next);
  }

  private clone(s: Snapshot): Snapshot { return { root: JSON.parse(JSON.stringify(s.root)), selectedId: s.selectedId }; }
}

