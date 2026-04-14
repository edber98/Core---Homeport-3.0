import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { jsonrepair } from 'jsonrepair';

export interface ParsedPreview {
  sessionId: string;
  parsed: any;
  diffKeys: string[];
  ts: number;
}

/**
 * Service Angular qui encapsule un Web Worker de parsing JSON incrémental
 * pour les live previews d'outputs AI. Les chunks `tool.input_delta` sont
 * envoyés au worker qui les accumule, tente `jsonrepair` puis renvoie
 * l'état parsé. Fallback sur parse main thread si le worker est indispo.
 */
@Injectable({ providedIn: 'root' })
export class PreviewParserService implements OnDestroy {
  private worker: Worker | null = null;
  private workerUnavailable = false;
  private subjects = new Map<string, Subject<ParsedPreview>>();
  private toolNames = new Map<string, string>();
  // Fallback state (main thread) — par session
  private fbBuffers = new Map<string, string>();
  private fbLastParsed = new Map<string, any>();
  private fbThrottleTimers = new Map<string, any>();

  constructor(private zone: NgZone) {
    this.initWorker();
  }

  ngOnDestroy(): void {
    try { this.worker?.terminate(); } catch { /* noop */ }
    this.worker = null;
    for (const s of this.subjects.values()) s.complete();
    this.subjects.clear();
    this.toolNames.clear();
  }

  private initWorker(): void {
    try {
      // Angular build supporte `new Worker(new URL('...', import.meta.url))`
      this.worker = new Worker(new URL('../../../workers/preview-parser.worker.ts', import.meta.url), { type: 'module' });
      this.worker.addEventListener('message', (ev: MessageEvent) => {
        const data = ev.data;
        if (!data || data.type !== 'parsed') return;
        const subj = this.subjects.get(data.sessionId);
        if (!subj) return;
        // Re-entre dans la zone Angular pour déclencher CD
        this.zone.run(() => subj.next({
          sessionId: data.sessionId,
          parsed: data.parsed,
          diffKeys: data.diffKeys || [],
          ts: data.ts || Date.now(),
        }));
      });
      this.worker.addEventListener('error', (err) => {
        console.warn('[preview-parser] worker error — fallback to main thread:', err.message);
        this.workerUnavailable = true;
        try { this.worker?.terminate(); } catch { /* noop */ }
        this.worker = null;
      });
    } catch (e) {
      console.warn('[preview-parser] worker init failed — fallback main thread:', e);
      this.worker = null;
      this.workerUnavailable = true;
    }
  }

  /** Démarre une session et retourne un Observable des états parsés. */
  startSession(sessionId: string, toolName: string): Observable<ParsedPreview> {
    let subj = this.subjects.get(sessionId);
    if (!subj) {
      subj = new Subject<ParsedPreview>();
      this.subjects.set(sessionId, subj);
    }
    this.toolNames.set(sessionId, toolName);
    return subj.asObservable();
  }

  /** Feed d'un chunk brut JSON partiel. */
  feed(sessionId: string, chunk: string): void {
    if (!chunk) return;
    const toolName = this.toolNames.get(sessionId) || '';
    if (this.worker && !this.workerUnavailable) {
      this.worker.postMessage({ type: 'accumulate', sessionId, toolName, chunk });
      return;
    }
    // Fallback main thread
    this.fallbackFeed(sessionId, toolName, chunk);
  }

  /** Remplace intégralement l'état d'une session (utilisé pour appliquer un snapshot serveur). */
  publishState(sessionId: string, parsed: any, diffKeys: string[] = []): void {
    const subj = this.subjects.get(sessionId);
    if (!subj) return;
    subj.next({ sessionId, parsed, diffKeys, ts: Date.now() });
  }

  closeSession(sessionId: string): void {
    const subj = this.subjects.get(sessionId);
    if (subj) { subj.complete(); this.subjects.delete(sessionId); }
    this.toolNames.delete(sessionId);
    this.fbBuffers.delete(sessionId);
    this.fbLastParsed.delete(sessionId);
    const t = this.fbThrottleTimers.get(sessionId);
    if (t) { clearTimeout(t); this.fbThrottleTimers.delete(sessionId); }
    if (this.worker) {
      try { this.worker.postMessage({ type: 'close', sessionId }); } catch { /* noop */ }
    }
  }

  // ── Fallback main thread (worker indispo) ─────────────────────────────────
  private fallbackFeed(sessionId: string, toolName: string, chunk: string): void {
    const buf = (this.fbBuffers.get(sessionId) || '') + chunk;
    this.fbBuffers.set(sessionId, buf);
    if (this.fbThrottleTimers.has(sessionId)) return;
    const t = setTimeout(() => {
      this.fbThrottleTimers.delete(sessionId);
      this.fallbackParse(sessionId, toolName);
    }, 33);
    this.fbThrottleTimers.set(sessionId, t);
  }

  private fallbackParse(sessionId: string, toolName: string): void {
    const buf = this.fbBuffers.get(sessionId);
    if (!buf) return;
    let parsed: any;
    try { parsed = JSON.parse(jsonrepair(buf)); }
    catch { return; }
    let effective = parsed;
    if (toolName === 'execute_tool' && parsed && typeof parsed === 'object' && parsed.args && typeof parsed.args === 'object') {
      effective = parsed.args;
    }
    const prev = this.fbLastParsed.get(sessionId);
    const diffKeys: string[] = [];
    if (effective && typeof effective === 'object') {
      for (const k of Object.keys(effective)) {
        if (!prev || !(k in prev) || prev[k] !== effective[k]) diffKeys.push(k);
      }
    }
    this.fbLastParsed.set(sessionId, effective);
    const subj = this.subjects.get(sessionId);
    if (subj) subj.next({ sessionId, parsed: effective, diffKeys, ts: Date.now() });
  }
}
