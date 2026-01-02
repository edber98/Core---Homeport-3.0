import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiClientService } from './api-client.service';
import { environment } from '../../environments/environment';

export type AiChatThread = { id: string; flowId: string; title: string; createdAt: number; updatedAt: number };
export type AiChatMessage = { id: string; threadId: string; role: 'user'|'assistant'|'system'; text?: string; parts?: any[]; createdAt: number };
export type AiContext = { id: string; flowId: string; data: any; updatedAt: number };

@Injectable({ providedIn: 'root' })
export class AiConsoleBackendService {
  private THREADS_KEY = 'ai.console.threads.'; // + flowId
  private MSGS_KEY = 'ai.console.msgs.';       // + threadId
  private CTX_KEY = 'ai.console.ctx.';         // + flowId

  constructor(private api: ApiClientService) {}

  // Threads
  listChats(flowId: string): Observable<AiChatThread[]> {
    if (environment.useBackend) {
      return this.api.get<AiChatThread[]>(`/api/flows/${encodeURIComponent(flowId)}/ai/chats`).pipe(map(arr => (arr || []).sort((a,b)=>b.updatedAt-a.updatedAt)));
    }
    const list = this.load<AiChatThread[]>(this.THREADS_KEY + flowId, []);
    return of((list || []).sort((a,b)=>b.updatedAt-a.updatedAt));
  }
  createChat(flowId: string, title: string): Observable<AiChatThread> {
    if (environment.useBackend) {
      return this.api.post<AiChatThread>(`/api/flows/${encodeURIComponent(flowId)}/ai/chats`, { title });
    }
    const now = Date.now();
    const t: AiChatThread = { id: `${flowId}-${now.toString(36)}`, flowId, title: title || 'Chat', createdAt: now, updatedAt: now };
    const list = this.load<AiChatThread[]>(this.THREADS_KEY + flowId, []);
    list.unshift(t);
    this.save(this.THREADS_KEY + flowId, list);
    this.save(this.MSGS_KEY + t.id, []);
    return of(t);
  }
  deleteChat(flowId: string, threadId: string): Observable<boolean> {
    if (environment.useBackend) {
      return this.api.delete<any>(`/api/ai/chats/${encodeURIComponent(threadId)}`).pipe(map(()=>true));
    }
    const list = this.load<AiChatThread[]>(this.THREADS_KEY + flowId, []);
    const next = (list || []).filter(t => t.id !== threadId);
    this.save(this.THREADS_KEY + flowId, next);
    try { localStorage.removeItem(this.MSGS_KEY + threadId); } catch {}
    return of(true);
  }

  // Messages
  listMessages(threadId: string): Observable<AiChatMessage[]> {
    if (environment.useBackend) {
      return this.api.get<AiChatMessage[]>(`/api/ai/chats/${encodeURIComponent(threadId)}/messages`).pipe(map(arr => (arr || []).sort((a,b)=>a.createdAt-b.createdAt)));
    }
    const list = this.load<AiChatMessage[]>(this.MSGS_KEY + threadId, []);
    return of((list || []).sort((a,b)=>a.createdAt-b.createdAt));
  }
  appendMessage(threadId: string, msg: Omit<AiChatMessage,'id'|'createdAt'>): Observable<AiChatMessage> {
    if (environment.useBackend) {
      return this.api.post<AiChatMessage>(`/api/ai/chats/${encodeURIComponent(threadId)}/messages`, msg as any);
    }
    const now = Date.now();
    const m: AiChatMessage = { id: `${threadId}-${now.toString(36)}`, createdAt: now, ...(msg as any) };
    const list = this.load<AiChatMessage[]>(this.MSGS_KEY + threadId, []);
    list.push(m);
    this.save(this.MSGS_KEY + threadId, list);
    return of(m);
  }
  deleteMessages(threadId: string): Observable<boolean> {
    if (environment.useBackend) {
      return this.api.delete<any>(`/api/ai/chats/${encodeURIComponent(threadId)}/messages`).pipe(map(()=>true));
    }
    this.save(this.MSGS_KEY + threadId, []);
    return of(true);
  }

  // Context (1 par workflow)
  getContext(flowId: string): Observable<AiContext | null> {
    if (environment.useBackend) { return this.api.get<AiContext>(`/api/flows/${encodeURIComponent(flowId)}/ai/context`); }
    const ctx = this.load<AiContext | null>(this.CTX_KEY + flowId, null);
    return of(ctx);
  }
  saveContext(flowId: string, data: any): Observable<AiContext> {
    if (environment.useBackend) { return this.api.put<AiContext>(`/api/flows/${encodeURIComponent(flowId)}/ai/context`, { data }); }
    const now = Date.now();
    const ctx: AiContext = { id: `ctx-${flowId}`, flowId, data, updatedAt: now };
    this.save(this.CTX_KEY + flowId, ctx);
    return of(ctx);
  }
  clearContext(flowId: string): Observable<boolean> {
    if (environment.useBackend) { return this.api.delete<any>(`/api/flows/${encodeURIComponent(flowId)}/ai/context`).pipe(map(()=>true)); }
    try { localStorage.removeItem(this.CTX_KEY + flowId); } catch {}
    return of(true);
  }

  // Helpers (local)
  private load<T>(k: string, fallback: T): T {
    try { const raw = localStorage.getItem(k); return raw ? (JSON.parse(raw) as T) : fallback; } catch { return fallback; }
  }
  private save(k: string, v: any) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
}

