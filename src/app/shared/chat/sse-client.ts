import { NgZone, inject } from '@angular/core';
import { Observable, Subject } from 'rxjs';

export interface SseEvent { type: string; [k: string]: any }
export interface SseStream<T> { events$: Observable<T>; stop: () => void }

function parseEventData(data: any): any {
  if (data == null) return {};
  try {
    if (typeof data === 'string') return JSON.parse(data);
    return data;
  } catch {
    return { text: String(data) };
  }
}

export function openSse<T extends SseEvent>(opts: {
  zone?: NgZone;
  url: string;
  eventTypes: string[];
  onErrorAs?: string; // coerce onerror as this type (default: 'error')
  coerce?: (raw: any, fallbackType?: string) => T;
}): SseStream<T> {
  const zone = opts.zone || inject(NgZone);
  const subj = new Subject<T>();
  const es = new EventSource(opts.url, { withCredentials: false });
  const coerce = opts.coerce || ((raw, fallbackType) => {
    const obj = typeof raw === 'object' && raw ? raw : { text: String(raw) };
    if (!obj.type && fallbackType) (obj as any).type = fallbackType;
    return obj as T;
  });
  const handle = (type: string) => (ev: MessageEvent) => {
    try {
      const raw = parseEventData((ev as any).data);
      if (!raw.type) raw.type = type;
      zone.run(() => subj.next(coerce(raw, type)));
    } catch {
      zone.run(() => subj.next(coerce({ type, text: String((ev as any).data || '') }, type)));
    }
  };
  for (const t of opts.eventTypes) es.addEventListener(t, handle(t));
  es.addEventListener('done', () => { zone.run(() => subj.next(coerce({ type: 'done' }, 'done'))); try { es.close(); } catch {} subj.complete(); });
  es.onerror = () => { zone.run(() => subj.next(coerce({ type: opts.onErrorAs || 'error', code: 'eventsource_error', message: 'Connection failed' }, opts.onErrorAs || 'error'))); };
  const stop = () => { try { es.close(); } catch {} subj.complete(); };
  return { events$: subj.asObservable(), stop };
}

