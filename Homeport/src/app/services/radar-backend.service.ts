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

  getResetCounts(wsId: string): Observable<{ counts: Record<string, number> }> {
    return this.api.get<any>(`/api/workspaces/${encodeURIComponent(wsId)}/radar/reset/counts`);
  }

  resetRadar(wsId: string, body: { groups?: string[]; all?: boolean; confirm: string }): Observable<{ ok: boolean; deleted: Record<string, number> }> {
    return this.api.post<any>(`/api/workspaces/${encodeURIComponent(wsId)}/radar/reset`, body);
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

  // ── Graphe (Knowledge Graph) ──
  getGraphSummary(wsId: string): Observable<RadarGraphSummary> {
    return this.api.get<RadarGraphSummary>(`/api/workspaces/${encodeURIComponent(wsId)}/radar/graph/summary`);
  }
  getGraph(wsId: string, filters: { coreType?: string; subtype?: string; role?: string; q?: string; limit?: number } = {}): Observable<RadarGraphData> {
    return this.api.get<RadarGraphData>(`/api/workspaces/${encodeURIComponent(wsId)}/radar/graph`, filters as any);
  }
  listGraphEntities(wsId: string, filters: { coreType?: string; subtype?: string; role?: string; q?: string; limit?: number } = {}): Observable<RadarGraphEntity[]> {
    return this.api.get<RadarGraphEntity[]>(`/api/workspaces/${encodeURIComponent(wsId)}/radar/graph/entities`, filters as any);
  }
  getNeighborhood(wsId: string, key: string, depth = 1): Observable<RadarNeighborhood> {
    return this.api.get<RadarNeighborhood>(`/api/workspaces/${encodeURIComponent(wsId)}/radar/graph/entities/${encodeURIComponent(key)}/neighborhood`, { depth });
  }
  getLineage(wsId: string, key: string): Observable<RadarLineage> {
    return this.api.get<RadarLineage>(`/api/workspaces/${encodeURIComponent(wsId)}/radar/graph/entities/${encodeURIComponent(key)}/lineage`);
  }
  getOntology(): Observable<RadarOntology> {
    return this.api.get<RadarOntology>(`/api/radar/ontology`);
  }
  listMappings(wsId: string): Observable<RadarMapping[]> {
    return this.api.get<RadarMapping[]>(`/api/workspaces/${encodeURIComponent(wsId)}/radar/mappings`);
  }
  listSnapshots(wsId: string, filters: { entityType?: string; connectorId?: string; limit?: number } = {}): Observable<RadarSnapshotPage> {
    return this.api.get<RadarSnapshotPage>(`/api/workspaces/${encodeURIComponent(wsId)}/radar/snapshots`, filters as any);
  }
  learnConnector(wsId: string, connectorId: string, body: { capability: string; entity: string; activate?: boolean }): Observable<{ mapping: RadarMapping; watch: any; valid: boolean; errors: string[]; sampleCount: number }> {
    return this.api.post<any>(`/api/workspaces/${encodeURIComponent(wsId)}/radar/connectors/${encodeURIComponent(connectorId)}/learn`, body);
  }
  getProcesses(wsId: string, filters: { coreType?: string; subtype?: string } = {}): Observable<{ processes: RadarProcess[] }> {
    return this.api.get<{ processes: RadarProcess[] }>(`/api/workspaces/${encodeURIComponent(wsId)}/radar/process`, filters as any);
  }
  getCrossProcess(wsId: string): Observable<RadarCrossProcess> {
    return this.api.get<RadarCrossProcess>(`/api/workspaces/${encodeURIComponent(wsId)}/radar/process/cross`);
  }
  getAnalytics(wsId: string): Observable<RadarAnalytics> {
    return this.api.get<RadarAnalytics>(`/api/workspaces/${encodeURIComponent(wsId)}/radar/analytics`);
  }
  getRecommendations(wsId: string): Observable<RadarRecommendations> {
    return this.api.get<RadarRecommendations>(`/api/workspaces/${encodeURIComponent(wsId)}/radar/recommendations`);
  }
  getLearningStats(wsId: string): Observable<RadarLearningStats> {
    return this.api.get<RadarLearningStats>(`/api/workspaces/${encodeURIComponent(wsId)}/radar/learning/stats`);
  }
  getContext(wsId: string): Observable<{ context: RadarCompanyContext | null; needsSetup: boolean }> {
    return this.api.get<any>(`/api/workspaces/${encodeURIComponent(wsId)}/radar/context`);
  }
  saveContext(wsId: string, description: string): Observable<{ context: RadarCompanyContext }> {
    return this.api.put<any>(`/api/workspaces/${encodeURIComponent(wsId)}/radar/context`, { description });
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

// ── Graphe (Knowledge Graph) ──
export interface RadarGraphEntity {
  canonicalKey: string; aliasKeys?: string[];
  coreType: string; subtype?: string; roles?: string[];
  label: string; attributes?: Record<string, any>;
}
export interface RadarGraphRelation { from: string; to: string; type: string; role?: string; }
export interface RadarGraphData { entities: RadarGraphEntity[]; relations: RadarGraphRelation[]; }
export interface RadarGraphSummary {
  entities: number; relations: number;
  byType: { coreType: string; subtype?: string; count: number }[];
  byRelationType: { type: string; count: number }[];
}
export interface RadarNeighborhood { center: RadarGraphEntity; entities: RadarGraphEntity[]; relations: RadarGraphRelation[]; }
export interface RadarLineageSource {
  providerKey: string;
  snapshot: { entityType: string; entityKey: string; data: any; contentHash?: string; lastChangedAt?: string };
  mapping?: RadarMapping;
}
export interface RadarLineage { entity: RadarGraphEntity & { sources?: any[] }; sources: RadarLineageSource[]; }
export interface RadarOntology {
  coreTypes: { coreType: string; label?: string; subtypes: { subtype?: string; key: string; label?: string; category?: string; canonicalFields?: { name: string }[] }[] }[];
  relationTypes: string[]; roles: string[];
  coreLabels?: Record<string, string>;
  subtypeLabels?: Record<string, string>;
  relationLabels?: Record<string, string>;
  roleLabels?: Record<string, string>;
}
export interface RadarMapping {
  id?: string; providerKey: string; rawEntityType: string;
  target: { coreType: string; subtype?: string };
  roles?: string[]; keyField?: string; identityFields?: string[]; labelField?: string;
  fieldMap?: Record<string, string>; valueMap?: Record<string, any>;
  relationRules?: any[]; roleRules?: any[];
  learnedBy?: string; status?: string; version?: number; workspaceId?: string | null;
}
export interface RadarSnapshot {
  connectorId?: string; family?: string; entityType: string; entityKey: string;
  contentHash?: string; data: Record<string, any>;
  firstSeenAt?: string; lastSeenAt?: string; lastChangedAt?: string;
}
export interface RadarSnapshotPage {
  items: RadarSnapshot[];
  byType: { entityType: string; count: number }[];
}
export interface RadarProcess {
  coreType: string; subtype?: string;
  entityCount: number; entitiesWithTransitions: number;
  states: { state: string; count: number }[];
  transitions: { from: string; to: string; count: number; avgDurationMs: number }[];
  variants: { sequence: string; count: number }[];
}
export interface RadarCrossProcess {
  cases: number;
  systemByActivity?: Record<string, string>;
  typeByActivity?: Record<string, string>;
  activities: { activity: string; count: number; system?: string }[];
  transitions: { from: string; to: string; count: number }[];
  parallels: { activities: string[]; count: number }[];
  variants: { sequence: string; count: number }[];
}
export interface RadarAnalytics {
  bottlenecks: { process: string; from: string; to: string; avgDays: number; count: number; score: number; description?: string }[];
  delays: { type: string; label?: string; system?: string; state: string; sinceDays: number; score: number; reason?: string }[];
  anomalies: { kind: 'near_miss' | 'orphan'; entity: string; type?: string; system?: string; path?: string; suggestedClient?: string; similarity?: number; score: number; reason?: string }[];
  financial: { invoices: number; paidInvoices: number; billed: number; paid: number; outstanding: number; collectionRate: number };
}
export interface RadarRecommendations {
  recommendations: { type: string; priority: 'haute' | 'normale' | 'basse'; score: number; title: string; detail?: string; action: string; system?: string }[];
  forecast?: { outstanding: number; expectedDays: number; projectedInflow: number; atRiskCount: number; atRisk: { label: string; system?: string; sinceDays: number }[]; collectionRate: number; riskModel?: { status: string; accuracy?: number; examples?: number } | null } | null;
}
export interface RadarCompanyContext {
  description: string; sector?: string; activities?: string[];
  suggestedFamilies?: string[]; keyMetrics?: string[]; summary?: string;
  source?: string; interpretedAt?: string;
}
export interface RadarLearningStats {
  enabled: boolean;
  feedback: {
    total: number;
    byTaskType: { taskType: string; count: number }[];
    byAction: { action: string; count: number }[];
  };
}
