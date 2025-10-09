import { Injectable } from '@angular/core';

export interface FlowState {
  nodes: any[];
  edges: any[];
}

export interface FlowHistoryMeta { ts: number; reason: string }

@Injectable({ providedIn: 'root' })
export class FlowHistoryService {
  private past: FlowState[] = [];
  private future: FlowState[] = [];
  private pastMeta: FlowHistoryMeta[] = [];
  private futureMeta: FlowHistoryMeta[] = [];

  reset(initial: FlowState) {
    this.past = [this.clone(initial)];
    this.future = [];
    this.pastMeta = [{ ts: Date.now(), reason: 'init' }];
    this.futureMeta = [];
  }

  push(state: FlowState, reason: string = '', force = false) {
    const next = this.clone(state);
    const last = this.past[this.past.length - 1];
    try {
      const same = JSON.stringify(last) === JSON.stringify(next);
      if (same && !force) return;
    } catch {}
    this.past.push(next);
    this.future = [];
    this.pastMeta.push({ ts: Date.now(), reason });
    this.futureMeta = [];
  }

  canUndo(): boolean { return this.past.length > 1; }
  canRedo(): boolean { return this.future.length > 0; }

  undo(current: FlowState): FlowState | null {
    if (!this.canUndo()) return null;
    const last = this.past.pop()!; // current snapshot
    const lastMeta = this.pastMeta.pop()!;
    this.future.push(this.clone(current));
    this.futureMeta.push({ ts: Date.now(), reason: lastMeta?.reason || 'undo' });
    const prev = this.past[this.past.length - 1];
    return this.clone(prev);
  }

  redo(current: FlowState): FlowState | null {
    if (!this.canRedo()) return null;
    const next = this.future.pop()!;
    const nextMeta = this.futureMeta.pop()!;
    this.past.push(this.clone(current));
    this.pastMeta.push({ ts: Date.now(), reason: nextMeta?.reason || 'redo' });
    return this.clone(next);
  }

  private clone(s: FlowState): FlowState {
    return { nodes: JSON.parse(JSON.stringify(s.nodes || [])), edges: JSON.parse(JSON.stringify(s.edges || [])) };
  }

  // Expose counts and snapshots for timeline/preview (read-only clones)
  pastCount(): number { return this.past.length; }
  futureCount(): number { return this.future.length; }
  getPastMeta(): FlowHistoryMeta[] { return this.pastMeta.slice(); }
  getFutureMeta(): FlowHistoryMeta[] { return this.futureMeta.slice(); }
  getPastAt(index: number): FlowState | null {
    if (index < 0 || index >= this.past.length) return null;
    return this.clone(this.past[index]);
  }
  getFutureAt(index: number): FlowState | null {
    if (index < 0 || index >= this.future.length) return null;
    return this.clone(this.future[this.future.length - 1 - index]); // index 0 = next redo
  }

  // Serialize/deserialize full history for persistence (localStorage)
  exportAll(): { past: FlowState[]; future: FlowState[]; pastMeta: FlowHistoryMeta[]; futureMeta: FlowHistoryMeta[] } {
    return {
      past: this.past.map(s => this.clone(s)),
      future: this.future.map(s => this.clone(s)),
      pastMeta: this.pastMeta.slice(),
      futureMeta: this.futureMeta.slice(),
    };
  }
  hydrate(dump: { past?: FlowState[]; future?: FlowState[]; pastMeta?: FlowHistoryMeta[]; futureMeta?: FlowHistoryMeta[] }) {
    const toStates = (arr?: FlowState[]) => (arr || []).map(s => this.clone(s));
    this.past = toStates(dump.past);
    this.future = toStates(dump.future);
    this.pastMeta = (dump.pastMeta || []).slice();
    this.futureMeta = (dump.futureMeta || []).slice();
  }
}
