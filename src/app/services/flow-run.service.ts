import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ExecutionMode = 'prod' | 'test';
export type RunStatus = 'queued'|'running'|'success'|'error'|'cancelled'|'timed_out'|'partial_success';
export type NodeStatus = 'pending'|'running'|'success'|'error'|'skipped'|'blocked'|'timed_out';

export interface ErrorInfo {
  code?: string; message: string; severity?: 'error'|'warn'|'info';
  retriable?: boolean; stack?: string; data?: any;
  at?: 'render'|'execute'|'merge'|'condition'|'transport'; ts?: string;
}

export interface NodeAttempt {
  runId: string; nodeId: string; attempt: number;
  kind: 'trigger'|'function'|'condition'|'merge'|'delay'|'wait';
  templateKey?: string; templateRaw?: string;
  status: NodeStatus; startedAt: string; finishedAt?: string; durationMs?: number;
  argsPre?: any; argsPost?: any; input?: any; result?: any; errors?: ErrorInfo[];
}

export interface ExecutionRun {
  id: string; runId: string; flowVersionId: string;
  mode: ExecutionMode; status: RunStatus; startedAt: string; finishedAt?: string; durationMs?: number;
  initialInput?: any; initialCtx?: any; finalPayload?: any; finalMsg?: any; errors?: ErrorInfo[]; metadata?: any;
  attempts: NodeAttempt[];
}

@Injectable({ providedIn: 'root' })
export class FlowRunService {
  private seq = 10000;
  private runs: ExecutionRun[] = [];
  private launched = 0;
  private completed = 0;
  private nodeStats = new Map<string, { count: number; lastStatus?: NodeStatus }>();

  runs$ = new BehaviorSubject<ExecutionRun[]>([]);
  counters$ = new BehaviorSubject<{ launched: number; completed: number }>({ launched: 0, completed: 0 });
  nodeStats$ = new BehaviorSubject<Map<string, { count: number; lastStatus?: NodeStatus }>>(this.nodeStats);

  run(graph: any, mode: ExecutionMode = 'test', input: any = {}, flowId: string = 'adhoc'): ExecutionRun {
    const now = new Date();
    const id = `${++this.seq}`;
    const run: ExecutionRun = {
      id, runId: id, flowVersionId: flowId, mode,
      status: 'running', startedAt: now.toISOString(), attempts: [], initialInput: input
    } as ExecutionRun;
    this.launched++; this.pushCounters();
    this.runs.unshift(run); this.runs$.next([...this.runs]);

    // Simple sequential traversal: start-like then others in insertion order
    const nodes: any[] = (graph?.nodes || []);
    const edges: any[] = (graph?.edges || []);
    // Topologically naive: favor nodes without input first
    const hasIncoming = new Set<string>();
    for (const e of edges) { if (e?.target) hasIncoming.add(String(e.target)); }
    const ordered = [
      ...nodes.filter(n => !hasIncoming.has(String(n.id))),
      ...nodes.filter(n => hasIncoming.has(String(n.id)))
    ];

    let payload: any = input || {};
    const started = Date.now();
    for (const n of ordered) {
      const model = (n?.data?.model) || {};
      const tpl = model?.templateObj || {};
      const kind = this.kindOf(tpl);
      const startAt = Date.now();
      const attempt: NodeAttempt = {
        runId: id, nodeId: model.id || n.id, attempt: 1, kind,
        templateKey: tpl?.id, templateRaw: tpl?.name,
        status: 'running', startedAt: new Date().toISOString(),
        argsPre: { ...(model?.context || {}) }, input: payload
      };
      run.attempts.push(attempt);
      this.runs$.next([...this.runs]);
      // Mark node as running
      this.bumpNodeStats(model.id || n.id, 'running');

      // Render params (mock): identity + add mode marker
      attempt.argsPost = { ...(attempt.argsPre || {}), __mode: mode };

      // Execute (mock handlers)
      try {
        const result = this.execMock(tpl, attempt.argsPost, payload, mode);
        attempt.result = result;
        attempt.status = 'success';
        attempt.finishedAt = new Date().toISOString();
        attempt.durationMs = Date.now() - startAt;
        // Root payload becomes the function result directly
        payload = result;
        this.bumpNodeStats(model.id || n.id, attempt.status);
      } catch (err: any) {
        attempt.errors = [{ message: String(err?.message || err || 'Error'), severity: 'error', at: 'execute', ts: new Date().toISOString() }];
        attempt.status = 'error';
        this.bumpNodeStats(model.id || n.id, attempt.status);
      }
      this.runs$.next([...this.runs]);
      if (attempt.status === 'error') break;
      // Cancellation guard
      if (this.cancelled.has(id)) { run.status = 'cancelled'; break; }
    }

    run.status = run.attempts.some(a => a.status === 'error') ? 'error' : 'success';
    run.finishedAt = new Date().toISOString();
    run.durationMs = Date.now() - started;
    run.finalPayload = payload;
    this.completed++; this.pushCounters();
    this.runs$.next([...this.runs]);
    return run;
  }

  private cancelled = new Set<string>();
  cancel(runId: string) {
    this.cancelled.add(runId);
    try {
      const run = this.runs.find(r => r.runId === runId);
      if (run) { run.status = 'cancelled'; this.runs$.next([...this.runs]); }
    } catch {}
    setTimeout(() => this.cancelled.delete(runId), 5000);
  }

  runNode(tpl: any, nodeId: string, mode: ExecutionMode = 'test', input: any = {}): ExecutionRun {
    const now = new Date();
    const id = `${++this.seq}`;
    const run: ExecutionRun = {
      id, runId: id, flowVersionId: 'single', mode,
      status: 'running', startedAt: now.toISOString(), attempts: [], initialInput: input
    } as ExecutionRun;
    this.launched++; this.pushCounters();
    this.runs.unshift(run); this.runs$.next([...this.runs]);

    const startAt = Date.now();
    const attempt: NodeAttempt = {
      runId: id, nodeId, attempt: 1, kind: this.kindOf(tpl),
      templateKey: tpl?.id, templateRaw: tpl?.name, status: 'running',
      startedAt: new Date().toISOString(), argsPre: {}, input
    };
    run.attempts.push(attempt); this.runs$.next([...this.runs]);
    try {
      // Render: mock passthrough (tpl/context not used here)
      attempt.argsPost = { __mode: mode };
      const result = this.execMock(tpl, attempt.argsPost, input, mode);
      attempt.result = result; attempt.status = 'success';
      attempt.finishedAt = new Date().toISOString(); attempt.durationMs = Date.now() - startAt;
      // For single node run, finalPayload mirrors the raw result
      (run as any).finalPayload = result;
      this.bumpNodeStats(nodeId, attempt.status);
    } catch (err: any) {
      attempt.errors = [{ message: String(err?.message || err || 'Error'), severity: 'error', at: 'execute', ts: new Date().toISOString() }];
      attempt.status = 'error'; this.bumpNodeStats(nodeId, attempt.status);
    }
    run.status = attempt.status === 'success' ? 'success' : 'error';
    run.finishedAt = new Date().toISOString(); run.durationMs = Date.now() - startAt; run.finalPayload = attempt.result;
    this.completed++; this.pushCounters(); this.runs$.next([...this.runs]);
    return run;
  }

  private kindOf(tpl: any): NodeAttempt['kind'] {
    switch ((tpl?.type || '').toLowerCase()) {
      case 'start': return 'trigger';
      case 'event': return 'trigger';
      case 'endpoint': return 'trigger';
      case 'condition': return 'condition';
      case 'loop': return 'wait';
      default: return 'function';
    }
  }

  private execMock(tpl: any, args: any, payload: any, mode: ExecutionMode): any {
    const t = (tpl?.type || '').toLowerCase();
    if (t === 'start' || t === 'event' || t === 'endpoint') {
      return { ...payload, _triggered: true, _mode: mode };
    }
    if (t === 'condition') {
      return { ok: true, selected: 0, _mode: mode };
    }
    if (tpl?.id === 'tmpl_math_add') {
      const a = Number(args?.a || 0), b = Number(args?.b || 0);
      return { sum: a + b, a, b, _mode: mode };
    }
    if (tpl?.id === 'tmpl_text_upper') {
      const s = String(args?.input || '');
      return { text: s.toUpperCase(), _mode: mode };
    }
    // Default (function-like): return args-only (do not merge upstream payload)
    return { ...args, _mode: mode };
  }

  private pushCounters() {
    this.counters$.next({ launched: this.launched, completed: this.completed });
  }

  private bumpNodeStats(nodeId: string, status: NodeStatus) {
    try {
      const k = String(nodeId);
      const cur = this.nodeStats.get(k) || { count: 0 };
      // Increment only when a node finishes (success/error), not when starting
      if (status !== 'running') { cur.count = (cur.count || 0) + 1; }
      cur.lastStatus = status;
      this.nodeStats.set(k, cur);
      // Emit a new Map instance for OnPush pipes
      this.nodeStats$.next(new Map(this.nodeStats));
    } catch { }
  }
}
