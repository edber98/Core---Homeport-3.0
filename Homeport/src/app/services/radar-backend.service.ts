import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from './api-client.service';

export interface RadarCard {
  id: string;
  type: 'briefing' | 'alert' | 'action_proposal' | 'question' | 'mission_status' | 'digest';
  section: string;
  priority: number;
  title: string;
  payload: { markdown?: string; question?: string; proposedAction?: string; severity?: string; missionId?: string; statusText?: string };
  requiresResponse: boolean;
  state: string;
  userResponse?: { action: string; note?: string; answer?: string; at?: string };
  missionId?: string;
  closedNote?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RadarBoard {
  generatedAt: string;
  sections: { title: string; cards: RadarCard[] }[];
  openCount: number;
  recentClosed: RadarCard[];
}

export interface RadarFamily {
  key: string;
  label: string;
  description: string;
  capabilities: { capability: string; kind: string; description: string }[];
  testCapability: string;
  providers: { key: string; name: string; title?: string; iconUrl?: string; iconClass?: string; color?: string; hasCredentials: boolean; capabilities: string[] }[];
}

export interface RadarConnector {
  id: string;
  family: string;
  providerKey: string;
  label?: string;
  status: string;
  lastPollAt?: string;
  lastError?: string;
  capabilities?: { capability: string; kind: string; description: string }[];
}

@Injectable({ providedIn: 'root' })
export class RadarBackendService {
  constructor(private api: ApiClientService) {}

  getBoard(wsId: string): Observable<RadarBoard> {
    return this.api.get<RadarBoard>(`/api/workspaces/${encodeURIComponent(wsId)}/radar/board`);
  }

  respondToCard(wsId: string, cardId: string, body: { action: 'validate' | 'modify' | 'dismiss' | 'answer'; note?: string; answer?: string; modifiedPayload?: any }): Observable<RadarCard> {
    return this.api.post<RadarCard>(`/api/workspaces/${encodeURIComponent(wsId)}/radar/cards/${encodeURIComponent(cardId)}/respond`, body);
  }

  listFamilies(): Observable<RadarFamily[]> {
    return this.api.get<RadarFamily[]>(`/api/radar/families`);
  }

  listConnectors(wsId: string): Observable<RadarConnector[]> {
    return this.api.get<RadarConnector[]>(`/api/workspaces/${encodeURIComponent(wsId)}/radar/connectors`);
  }

  createConnector(wsId: string, body: { family: string; providerKey: string; credentialId?: string; label?: string }): Observable<RadarConnector> {
    return this.api.post<RadarConnector>(`/api/workspaces/${encodeURIComponent(wsId)}/radar/connectors`, body);
  }

  testConnector(wsId: string, connectorId: string): Observable<{ ok: boolean; sample?: any; testedCapability?: string }> {
    return this.api.post<any>(`/api/workspaces/${encodeURIComponent(wsId)}/radar/connectors/${encodeURIComponent(connectorId)}/test`, {});
  }

  deleteConnector(wsId: string, connectorId: string): Observable<any> {
    return this.api.delete<any>(`/api/workspaces/${encodeURIComponent(wsId)}/radar/connectors/${encodeURIComponent(connectorId)}`);
  }

  collectConnector(wsId: string, connectorId: string): Observable<{ ok: boolean; baseline: boolean; deltas: number; perWatch: any[] }> {
    return this.api.post<any>(`/api/workspaces/${encodeURIComponent(wsId)}/radar/connectors/${encodeURIComponent(connectorId)}/collect`, {});
  }

  getActivity(wsId: string, limit = 30): Observable<RadarActivity> {
    return this.api.get<RadarActivity>(`/api/workspaces/${encodeURIComponent(wsId)}/radar/activity`, { limit });
  }

  getSignalDetail(wsId: string, signalId: string): Observable<{ signal: any; deltas: any[]; missions: any[] }> {
    return this.api.get<any>(`/api/workspaces/${encodeURIComponent(wsId)}/radar/signals/${encodeURIComponent(signalId)}`);
  }

  requalifyDelta(wsId: string, deltaId: string): Observable<{ ok: boolean; signalId: string }> {
    return this.api.post<any>(`/api/workspaces/${encodeURIComponent(wsId)}/radar/deltas/${encodeURIComponent(deltaId)}/requalify`, {});
  }

  sendMessage(wsId: string, body: { message: string; missionId?: string; signalId?: string; cardId?: string }): Observable<{ ok: boolean }> {
    return this.api.post<any>(`/api/workspaces/${encodeURIComponent(wsId)}/radar/message`, body);
  }

  getChat(wsId: string, limit = 50): Observable<{ id: string; role: 'user' | 'radar'; text: string; missionId?: string; at: string }[]> {
    return this.api.get<any[]>(`/api/workspaces/${encodeURIComponent(wsId)}/radar/chat`, { limit });
  }

  getAgenda(wsId: string, from: string, to: string): Observable<{ from: string; to: string; items: any[] }> {
    return this.api.get<any>(`/api/workspaces/${encodeURIComponent(wsId)}/radar/agenda`, { from, to });
  }

  reconcile(wsId: string): Observable<{ findings: number; created: number }> {
    return this.api.post<any>(`/api/workspaces/${encodeURIComponent(wsId)}/radar/reconcile`, {});
  }

  // Savoir entreprise
  listKnowledge(wsId: string): Observable<RadarKnowledgeEntry[]> {
    return this.api.get<RadarKnowledgeEntry[]>(`/api/workspaces/${encodeURIComponent(wsId)}/radar/knowledge`);
  }
  saveKnowledge(wsId: string, body: { topic: string; key: string; value: string; confidence?: string }): Observable<RadarKnowledgeEntry> {
    return this.api.post<RadarKnowledgeEntry>(`/api/workspaces/${encodeURIComponent(wsId)}/radar/knowledge`, body);
  }
  updateKnowledge(wsId: string, id: string, body: { value?: string; confidence?: string }): Observable<RadarKnowledgeEntry> {
    return this.api.put<RadarKnowledgeEntry>(`/api/workspaces/${encodeURIComponent(wsId)}/radar/knowledge/${encodeURIComponent(id)}`, body);
  }
  deleteKnowledge(wsId: string, id: string): Observable<any> {
    return this.api.delete<any>(`/api/workspaces/${encodeURIComponent(wsId)}/radar/knowledge/${encodeURIComponent(id)}`);
  }

  // Playbooks (procédures)
  listPlaybooks(wsId: string): Observable<RadarPlaybook[]> {
    return this.api.get<RadarPlaybook[]>(`/api/workspaces/${encodeURIComponent(wsId)}/radar/playbooks`);
  }
  createPlaybook(wsId: string, body: Partial<RadarPlaybook>): Observable<RadarPlaybook> {
    return this.api.post<RadarPlaybook>(`/api/workspaces/${encodeURIComponent(wsId)}/radar/playbooks`, body);
  }
  updatePlaybook(wsId: string, id: string, body: Partial<RadarPlaybook>): Observable<RadarPlaybook> {
    return this.api.put<RadarPlaybook>(`/api/workspaces/${encodeURIComponent(wsId)}/radar/playbooks/${encodeURIComponent(id)}`, body);
  }
  deletePlaybook(wsId: string, id: string): Observable<any> {
    return this.api.delete<any>(`/api/workspaces/${encodeURIComponent(wsId)}/radar/playbooks/${encodeURIComponent(id)}`);
  }
}

export interface RadarActivity {
  missions: { id: string; title: string; status: string; attempts: number; maxAttempts: number; result?: string; lastCritique?: string; error?: string; signalIds?: string[]; createdAt?: string; finishedAt?: string }[];
  signals: { id: string; family?: string; category: string; urgency: string; summary: string; source: string; status: string; resolution?: string; missionIds?: string[]; createdAt?: string; handledAt?: string }[];
  wakeups: { id: string; at: string; reason: string; payload?: any; status: string; firedAt?: string }[];
  deltas: Record<string, number>;
  ignored?: { id: string; family?: string; entityType: string; entityKey: string; type: string; occurredAt?: string; classification?: { significant?: boolean; category?: string; urgency?: string; summary?: string }; after?: { subject?: string; from?: string; title?: string; name?: string } }[];
}

export interface RadarKnowledgeEntry {
  id: string; topic: string; key: string; value: string;
  source: string; confidence: string; verifiedAt?: string; createdAt?: string; updatedAt?: string;
}

export interface RadarPlaybook {
  id: string; name: string;
  triggerCategories: string[]; triggerDescription?: string;
  procedure: string; autonomy: 'propose' | 'auto_with_report' | 'full_auto';
  source: string; enabled: boolean; pendingApproval?: boolean;
  stats?: { timesUsed: number; lastUsedAt?: string; overrideCount?: number };
  createdAt?: string; updatedAt?: string;
}
