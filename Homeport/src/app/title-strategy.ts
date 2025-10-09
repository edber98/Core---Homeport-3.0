import { inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

/**
 * Builds document titles from route data.title with a Kinn suffix.
 * If no title is provided, defaults to just "Kinn".
 */
export class KinnTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly appName = 'Kinn';

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const routeTitle = this.buildTitle(snapshot);
    if (routeTitle && routeTitle.trim().length) {
      this.title.setTitle(`${this.appName} — ${routeTitle}`);
    } else {
      this.title.setTitle(this.appName);
    }
  }
}

