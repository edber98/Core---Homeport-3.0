import { Injectable } from '@angular/core';

export interface FlowState {
  nodes: any[];
  edges: any[];
}

@Injectable({ providedIn: 'root' })
export class FlowHistoryService {
  private past: FlowState[] = [];
  private future: FlowState[] = [];

  reset(initial: FlowState) {
    this.past = [this.clone(initial)];
    this.future = [];
    
  }

  push(state: FlowState) {
    const next = this.clone(state);
    const last = this.past[this.past.length - 1];
    try {
      const same = JSON.stringify(last) === JSON.stringify(next);
      if (same) return;
    } catch {}
    this.past.push(next);
    this.future = [];
    
  }

  canUndo(): boolean { return this.past.length > 1; }
  canRedo(): boolean { return this.future.length > 0; }

  undo(current: FlowState): FlowState | null {
    if (!this.canUndo()) return null;
    const last = this.past.pop()!; // current snapshot
    this.future.push(this.clone(current));
    const prev = this.past[this.past.length - 1];
    return this.clone(prev);
  }

  redo(current: FlowState): FlowState | null {
    if (!this.canRedo()) return null;
    const next = this.future.pop()!;
    this.past.push(this.clone(current));
    
    return this.clone(next);
  }

  private clone(s: FlowState): FlowState {
    return { nodes: JSON.parse(JSON.stringify(s.nodes || [])), edges: JSON.parse(JSON.stringify(s.edges || [])) };
  }
}
