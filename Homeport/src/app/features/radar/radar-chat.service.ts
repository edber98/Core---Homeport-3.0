import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

// Ouverture du chat radar depuis n'importe où (board, missions, cards)
// avec un texte pré-rempli et un contexte optionnel.

export interface RadarChatOpenRequest {
  contextLabel?: string;   // affiché en chip — le contexte réel est chargé côté serveur
  missionId?: string;
  signalId?: string;
  cardId?: string;
}

@Injectable({ providedIn: 'root' })
export class RadarChatService {
  private readonly openSubject = new Subject<RadarChatOpenRequest>();
  readonly open$ = this.openSubject.asObservable();

  open(req: RadarChatOpenRequest = {}): void { this.openSubject.next(req); }
}
