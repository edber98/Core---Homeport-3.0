import { Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { RadarBackendService, RadarOntology } from '../../services/radar-backend.service';

// Traduction FR des termes d'ontologie pour l'UI (coreType, sous-type, relation,
// rôle). Charge /radar/ontology une seule fois et expose des helpers. Évite que
// l'UI affiche « Party / invoice / party_of » au lieu de « Acteur / Facture / acteur ».

@Injectable({ providedIn: 'root' })
export class RadarLabelsService {
  readonly ready = signal(false);
  ontology: RadarOntology | null = null;
  private core: Record<string, string> = {};
  private subtype: Record<string, string> = {};
  private relation: Record<string, string> = {};
  private role: Record<string, string> = {};
  private loading: Promise<void> | null = null;

  constructor(private radar: RadarBackendService) {}

  load(): Promise<void> {
    if (this.ready()) return Promise.resolve();
    if (this.loading) return this.loading;
    this.loading = firstValueFrom(this.radar.getOntology()).then(o => {
      this.ontology = o;
      this.core = o.coreLabels || {};
      this.subtype = o.subtypeLabels || {};
      this.relation = o.relationLabels || {};
      this.role = o.roleLabels || {};
      this.ready.set(true);
    }).catch(() => { this.ready.set(true); });
    return this.loading;
  }

  coreLabel(coreType: string): string { return this.core[coreType] || coreType; }
  subtypeLabel(coreType: string, subtype?: string): string {
    if (!subtype) return this.coreLabel(coreType);
    return this.subtype[`${coreType}.${subtype}`] || subtype;
  }
  /** Libellé court d'une entité : sous-type FR si présent, sinon coreType FR. */
  typeLabel(coreType: string, subtype?: string): string {
    return subtype ? this.subtypeLabel(coreType, subtype) : this.coreLabel(coreType);
  }
  relationLabel(type: string): string { return this.relation[type] || type; }
  roleLabel(role: string): string { return this.role[role] || role; }
}
