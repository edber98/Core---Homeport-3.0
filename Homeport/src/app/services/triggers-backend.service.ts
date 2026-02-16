import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { ApiClientService } from './api-client.service';

export interface TriggerStatus {
  active: boolean;
  triggerType?: string | null;
  startedAt?: string | null;
  lastEventAt?: string | null;
  eventCount?: number;
  lastError?: string | null;
  webhookUrl?: string | null;
  deployedAt?: string | null;
  triggerNodeId?: string | null;
  webhookToken?: string | null;
}

export interface DeployResult {
  triggerType: string;
  webhookUrl?: string | null;
  status: string;
}

@Injectable({ providedIn: 'root' })
export class TriggersBackendService {
  /** Emits the flowId whenever deploy/undeploy succeeds */
  readonly statusChanged$ = new Subject<string>();

  constructor(private api: ApiClientService) {}

  /** Notify all subscribers that a flow's trigger status changed */
  notifyStatusChanged(flowId: string) {
    this.statusChanged$.next(flowId);
  }

  deploy(flowId: string): Observable<DeployResult> {
    return this.api.post<DeployResult>(`/api/flows/${encodeURIComponent(flowId)}/deploy`);
  }

  undeploy(flowId: string): Observable<any> {
    return this.api.post<any>(`/api/flows/${encodeURIComponent(flowId)}/undeploy`);
  }

  getStatus(flowId: string): Observable<TriggerStatus> {
    return this.api.get<TriggerStatus>(`/api/flows/${encodeURIComponent(flowId)}/trigger-status`);
  }

  listActive(wsId: string): Observable<TriggerStatus[]> {
    return this.api.get<TriggerStatus[]>(`/api/workspaces/${encodeURIComponent(wsId)}/triggers`);
  }
}
