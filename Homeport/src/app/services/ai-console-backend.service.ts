import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiClientService } from './api-client.service';

export type AiChatThread = { id: string; flowId: string; title: string; createdAt: number; updatedAt: number; nodeId?: string; type?: string };
export type AiChatMessage = { id: string; threadId: string; role: 'user'|'assistant'|'system'; text?: string; parts?: any[]; createdAt: number };
export type AiContext = { id: string; flowId: string; data: any; updatedAt: number };

@Injectable({ providedIn: 'root' })
export class AiConsoleBackendService {
  constructor(private api: ApiClientService) {}

  // Threads
  listChats(flowId: string): Observable<AiChatThread[]> {
    return this.api.get<AiChatThread[]>(`/api/flows/${encodeURIComponent(flowId)}/ai/chats`).pipe(map(arr => (arr || []).sort((a,b)=>b.updatedAt-a.updatedAt)));
  }
  createChat(flowId: string, title: string, extra?: { nodeId?: string; type?: string }): Observable<AiChatThread> {
    const body: any = { title };
    if (extra && extra.nodeId) body.nodeId = extra.nodeId;
    if (extra && extra.type) body.type = extra.type;
    return this.api.post<AiChatThread>(`/api/flows/${encodeURIComponent(flowId)}/ai/chats`, body);
  }
  deleteChat(flowId: string, threadId: string): Observable<boolean> {
    return this.api.delete<any>(`/api/ai/chats/${encodeURIComponent(threadId)}`).pipe(map(()=>true));
  }

  // Messages
  listMessages(threadId: string): Observable<AiChatMessage[]> {
    return this.api.get<AiChatMessage[]>(`/api/ai/chats/${encodeURIComponent(threadId)}/messages`).pipe(map(arr => (arr || []).sort((a,b)=>a.createdAt-b.createdAt)));
  }
  appendMessage(threadId: string, msg: Omit<AiChatMessage,'id'|'createdAt'>): Observable<AiChatMessage> {
    return this.api.post<AiChatMessage>(`/api/ai/chats/${encodeURIComponent(threadId)}/messages`, msg as any);
  }
  deleteMessages(threadId: string): Observable<boolean> {
    return this.api.delete<any>(`/api/ai/chats/${encodeURIComponent(threadId)}/messages`).pipe(map(()=>true));
  }

  // Context (1 par workflow)
  getContext(flowId: string): Observable<AiContext | null> {
    return this.api.get<AiContext>(`/api/flows/${encodeURIComponent(flowId)}/ai/context`);
  }
  saveContext(flowId: string, data: any): Observable<AiContext> {
    return this.api.put<AiContext>(`/api/flows/${encodeURIComponent(flowId)}/ai/context`, { data });
  }
  clearContext(flowId: string): Observable<boolean> {
    return this.api.delete<any>(`/api/flows/${encodeURIComponent(flowId)}/ai/context`).pipe(map(()=>true));
  }

}
