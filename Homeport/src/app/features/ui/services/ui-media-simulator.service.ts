import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type UiSimBp = 'auto'|'xs'|'sm'|'md'|'lg'|'xl';

@Injectable({ providedIn: 'root' })
export class UiMediaSimulatorService {
  // Currently simulated breakpoint for preview/editing
  readonly activeBp$ = new BehaviorSubject<UiSimBp>('auto');
  // When true and a fixed bp is active, style edits are saved under that bp (styleBp[bp])
  readonly captureToBp$ = new BehaviorSubject<boolean>(true);

  setActive(bp: UiSimBp) { this.activeBp$.next(bp); }
  setCaptureToBp(v: boolean) { this.captureToBp$.next(!!v); }

  get active(): UiSimBp { return this.activeBp$.value; }
  get captureToBp(): boolean { return this.captureToBp$.value; }
}

