import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from './api-client.service';

export interface CreditsBalance {
  included: number;
  recharged: number;
  total: number;
}

export interface CreditsUserQuota {
  enabled: boolean;
  monthlyMax: number;
  consumedThisCycle: number;
  remaining: number;
  cycleStart?: string;
  cycleEnd?: string;
}

export interface CreditsMeResponse {
  enabled: boolean;
  mocked: boolean;
  exists: boolean;
  balance: CreditsBalance | null;
  currency: string;
  totalConsumed: number | null;
  userQuota: CreditsUserQuota | null;
  panelPublicUrl: string;
  appId: string;
  detailsUrl: string;
  error?: string;
  errorStatus?: number | null;
}

@Injectable({ providedIn: 'root' })
export class CreditsBackendService {
  constructor(private api: ApiClientService) {}

  getMe(): Observable<CreditsMeResponse> {
    return this.api.get<CreditsMeResponse>('/api/me/credits');
  }
}
