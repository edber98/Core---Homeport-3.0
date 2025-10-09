import { Injectable } from '@angular/core';
import { UiTag } from './ui-model.service';

@Injectable({ providedIn: 'root' })
export class UiRulesService {
  // Basic HTML-like constraints and custom rules
  canNest(parent: UiTag, child: UiTag): boolean {
    // Disallow button inside label as per request
    if (parent === 'label' && child === 'button') return false;
    // li must be inside ul
    if (child === 'li' && parent !== 'ul') return false;
    // ul may contain only li
    if (parent === 'ul' && child !== 'li') return false;
    // img/input are void; they should not contain children (handled by builder, not here)
    return true;
  }
}

