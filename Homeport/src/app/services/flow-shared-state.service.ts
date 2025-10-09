import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface FlowGraphSnapshot {
  nodes: any[];
  edges: any[];
  id?: string;
  name?: string;
  description?: string;
  serverChecksum?: string | null;
  currentChecksum?: string | null;
}

@Injectable({ providedIn: 'root' })
export class FlowSharedStateService {
  private graph$ = new BehaviorSubject<FlowGraphSnapshot | null>(null);
  setGraph(g: FlowGraphSnapshot | null) { this.graph$.next(g ? JSON.parse(JSON.stringify(g)) : null); }
  getGraph$() { return this.graph$.asObservable(); }
  get current(): FlowGraphSnapshot | null { return this.graph$.value; }
}
