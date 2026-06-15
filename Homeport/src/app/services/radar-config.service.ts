import { Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiClientService } from './api-client.service';

// Flag d'activation du Radar (env backend RADAR_ENABLED). Chargé une fois après
// login, mis en cache ; le menu et le guard de route s'y réfèrent.

@Injectable({ providedIn: 'root' })
export class RadarConfigService {
  readonly enabled = signal<boolean>(true);
  private loaded = false;

  constructor(private api: ApiClientService) {}

  async load(): Promise<boolean> {
    if (this.loaded) return this.enabled();
    try {
      const r = await firstValueFrom(this.api.get<{ enabled: boolean }>('/api/radar/config'));
      this.enabled.set(!!r?.enabled);
    } catch {
      this.enabled.set(false); // endpoint absent / erreur → on masque par sécurité
    }
    this.loaded = true;
    return this.enabled();
  }

  reset(): void { this.loaded = false; }
}
