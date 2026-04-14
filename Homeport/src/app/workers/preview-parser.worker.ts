/// <reference lib="webworker" />
// Preview Parser Web Worker
// Accumule des chunks JSON partiels et les parse via jsonrepair.
// Throttle interne pour éviter de saturer le main thread (~30fps).

import { jsonrepair } from 'jsonrepair';

interface AccumulateMsg {
  type: 'accumulate';
  sessionId: string;
  toolName?: string;
  chunk: string;
}
interface ResetMsg { type: 'reset'; sessionId: string; }
interface CloseMsg { type: 'close'; sessionId: string; }
type InMsg = AccumulateMsg | ResetMsg | CloseMsg;

interface Session {
  buffer: string;
  toolName: string;
  lastParsed: any;
  lastParseAt: number;
  pending: boolean;
}

const THROTTLE_MS = 33;
const sessions = new Map<string, Session>();

function getOrCreate(id: string, toolName?: string): Session {
  let s = sessions.get(id);
  if (!s) {
    s = { buffer: '', toolName: toolName || '', lastParsed: null, lastParseAt: 0, pending: false };
    sessions.set(id, s);
  } else if (toolName && !s.toolName) {
    s.toolName = toolName;
  }
  return s;
}

function diffKeys(prev: any, next: any): string[] {
  if (!next || typeof next !== 'object') return [];
  if (!prev || typeof prev !== 'object') return Object.keys(next);
  const keys: string[] = [];
  for (const k of Object.keys(next)) {
    if (!(k in prev) || prev[k] !== next[k]) keys.push(k);
  }
  return keys;
}

function tryParse(session: Session, sessionId: string) {
  const now = Date.now();
  if (now - session.lastParseAt < THROTTLE_MS) {
    if (!session.pending) {
      session.pending = true;
      const delay = THROTTLE_MS - (now - session.lastParseAt);
      setTimeout(() => {
        const s = sessions.get(sessionId);
        if (!s) return;
        s.pending = false;
        doParse(s, sessionId);
      }, delay);
    }
    return;
  }
  doParse(session, sessionId);
}

function doParse(session: Session, sessionId: string) {
  session.lastParseAt = Date.now();
  const buf = session.buffer;
  if (!buf.trim()) return;
  let repaired: string;
  try { repaired = jsonrepair(buf); }
  catch { return; }
  let parsed: any;
  try { parsed = JSON.parse(repaired); }
  catch { return; }

  // For execute_tool, inner args are under parsed.args
  let effective = parsed;
  if (session.toolName === 'execute_tool' && parsed && typeof parsed === 'object' && parsed.args && typeof parsed.args === 'object') {
    effective = parsed.args;
  }

  const changed = diffKeys(session.lastParsed, effective);
  session.lastParsed = effective;

  (self as any).postMessage({
    type: 'parsed',
    sessionId,
    parsed: effective,
    diffKeys: changed,
    ts: session.lastParseAt,
  });
}

self.addEventListener('message', (ev: MessageEvent<InMsg>) => {
  const msg = ev.data;
  if (!msg || !msg.type) return;
  switch (msg.type) {
    case 'accumulate': {
      const s = getOrCreate(msg.sessionId, msg.toolName);
      s.buffer += msg.chunk || '';
      tryParse(s, msg.sessionId);
      break;
    }
    case 'reset': {
      const s = sessions.get(msg.sessionId);
      if (s) { s.buffer = ''; s.lastParsed = null; s.lastParseAt = 0; s.pending = false; }
      break;
    }
    case 'close': {
      sessions.delete(msg.sessionId);
      break;
    }
  }
});
