import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { AuthTokenService } from './auth-token.service';

// Flux temps réel du Radar (SSE /radar/stream) — même pattern que le badge
// crédits : EventSource avec ?token= (pas de header possible), reconnexion
// avec backoff exponentiel. Tous les composants radar s'abonnent à events$.

export interface RadarLiveEvent {
  type: string; // mission.created | mission.updated | mission.stream | mission.tool | signal.created | signal.updated | board.changed | notification.created | open
  workspaceId: string;
  payload: any;
  at: string;
}

const RECONNECT_BASE_MS = 2000;
const RECONNECT_MAX_MS = 30_000;

@Injectable({ providedIn: 'root' })
export class RadarEventsService implements OnDestroy {
  private sse: EventSource | null = null;
  private reconnectMs = RECONNECT_BASE_MS;
  private reconnectTimer: any = null;
  private currentWsId: string | null = null;
  private readonly subject = new Subject<RadarLiveEvent>();
  readonly events$ = this.subject.asObservable();

  constructor(private tokenSvc: AuthTokenService, private zone: NgZone) {}

  connect(wsId: string): void {
    if (!wsId) return;
    if (this.currentWsId === wsId && this.sse) return; // déjà connecté
    this.disconnect();
    this.currentWsId = wsId;
    this.open();
  }

  disconnect(): void {
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    if (this.sse) { try { this.sse.close(); } catch {} this.sse = null; }
    this.currentWsId = this.sse ? this.currentWsId : null;
  }

  ngOnDestroy(): void { this.disconnect(); this.subject.complete(); }

  private open(): void {
    const wsId = this.currentWsId;
    const token = this.tokenSvc?.token || '';
    if (!wsId || !token) return;
    try {
      const url = `${window.location.origin}/api/workspaces/${encodeURIComponent(wsId)}/radar/stream?token=${encodeURIComponent(token)}`;
      this.sse = new EventSource(url);
      this.sse.addEventListener('open', () => { this.reconnectMs = RECONNECT_BASE_MS; });
      this.sse.addEventListener('radar', (ev: MessageEvent) => {
        try {
          const event = JSON.parse(ev.data) as RadarLiveEvent;
          this.zone.run(() => this.subject.next(event));
        } catch { /* event illisible */ }
      });
      this.sse.addEventListener('error', () => {
        try { this.sse?.close(); } catch {}
        this.sse = null;
        const delay = this.reconnectMs;
        this.reconnectMs = Math.min(this.reconnectMs * 2, RECONNECT_MAX_MS);
        this.reconnectTimer = setTimeout(() => this.open(), delay);
      });
    } catch { /* EventSource indisponible */ }
  }
}
