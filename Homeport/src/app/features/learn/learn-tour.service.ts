import { Injectable, NgZone } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription, filter, take } from 'rxjs';
import { driver, type DriveStep, type Driver, type AllowedButtons } from 'driver.js';

import { TourDefinition, TourStep, TourStepAction } from './learn-tours';
import { LearnProgressService } from './learn-progress.service';

@Injectable({ providedIn: 'root' })
export class LearnTourService {

  private current: Driver | null = null;
  private currentTourId: string | null = null;
  private tourSteps: TourStep[] = [];

  /** Cleanup functions for inline actions (click / dom) */
  private actionCleanups: (() => void)[] = [];

  /**
   * Navigate-action state — lives OUTSIDE actionCleanups
   * so it survives driver.destroy() during navigate pause.
   */
  private navSub: Subscription | null = null;
  private navTimer: number | null = null;
  private navResolved = false;

  /**
   * Flag: when true, onDestroyStarted / onDeselected must NOT
   * clean up navigate state (we're pausing, not quitting).
   */
  private isPausing = false;

  constructor(
    private zone: NgZone,
    private router: Router,
    private progress: LearnProgressService,
  ) {}

  // ── Public API ───────────────────────────────────────────────────

  async startTour(tour: TourDefinition): Promise<void> {
    this.destroyCurrent();

    if (tour.targetRoute) {
      const currentUrl = this.router.url.split('?')[0];
      if (currentUrl !== tour.targetRoute) {
        await this.router.navigateByUrl(tour.targetRoute);
      }
    }

    await this.delay(tour.navigationDelay);

    // Filter: keep lazy elements always, filter static by DOM presence
    const filteredSteps: TourStep[] = [];
    for (const step of tour.steps) {
      if (typeof step.element === 'function') {
        filteredSteps.push(step);
      } else {
        if (document.querySelector(step.element)) {
          filteredSteps.push(step);
        }
      }
    }

    if (filteredSteps.length === 0) return;

    this.tourSteps = filteredSteps;
    this.currentTourId = tour.id;
    this.launchDriver(0);
  }

  /** Full stop — cleans everything and kills the tour */
  destroyCurrent(): void {
    this.cleanupActionListeners();
    this.cleanupNavigate();
    this.removeFloatingHint();
    if (this.current) {
      this.isPausing = true; // prevent re-entrant cleanup
      const d = this.current;
      this.current = null;
      this.currentTourId = null;
      this.tourSteps = [];
      try { d.destroy(); } catch { /* already destroyed */ }
      this.isPausing = false;
    } else {
      this.currentTourId = null;
      this.tourSteps = [];
    }
  }

  // ── Driver lifecycle ─────────────────────────────────────────────

  private launchDriver(fromIndex: number): void {
    const steps = this.tourSteps.slice(fromIndex);
    if (steps.length === 0) {
      this.markTourComplete();
      return;
    }

    const driveSteps = steps.map((s, i) => this.buildDriveStep(s, fromIndex + i));

    this.zone.runOutsideAngular(() => {
      this.current = driver({
        showProgress: true,
        animate: true,
        smoothScroll: true,
        stagePadding: 8,
        stageRadius: 8,
        popoverClass: 'kinn-tour-popover',
        nextBtnText: 'Suivant',
        prevBtnText: 'Précédent',
        doneBtnText: 'Terminer',
        progressText: `{{current}} / ${this.tourSteps.length}`,
        steps: driveSteps,

        onNextClick: (_el, _step, opts) => {
          const d = opts.driver;
          if (!d.hasNextStep()) {
            d.destroy();
            return;
          }
          const localIdx = d.getActiveIndex() ?? 0;
          const globalIdx = fromIndex + localIdx + 1;
          const nextTourStep = this.tourSteps[globalIdx];
          if (nextTourStep?.preDelay) {
            setTimeout(() => { if (d.isActive()) d.moveNext(); }, nextTourStep.preDelay);
          } else {
            d.moveNext();
          }
        },

        onDestroyStarted: () => {
          if (!this.isPausing) {
            // User-initiated close (X button, overlay click, "Terminer")
            this.cleanupActionListeners();
            this.cleanupNavigate();
            this.removeFloatingHint();
            this.markTourComplete();
          }
          this.current?.destroy();
        },
      });

      this.current.drive();
    });
  }

  private markTourComplete(): void {
    this.zone.run(() => {
      if (this.currentTourId) {
        this.progress.completeTour(this.currentTourId);
      }
    });
  }

  // ── Step building ────────────────────────────────────────────────

  private buildDriveStep(step: TourStep, globalIndex: number): DriveStep {
    const isNavigateAction = step.action?.type === 'navigate';
    const hasInlineAction = !!step.action && !isNavigateAction;

    let description = step.description;
    if (step.action?.hint) {
      description += `<div class="tour-action-hint">${step.action.hint}</div>`;
    }

    const ds: DriveStep = {
      popover: {
        title: step.title,
        description,
        side: step.side || 'bottom',
        align: 'center',
      },
    };

    // Disable buttons for action steps
    if (hasInlineAction || isNavigateAction) {
      ds.popover!.disableButtons = ['next' as AllowedButtons, 'previous' as AllowedButtons];
    }

    // Element: string or lazy function
    if (typeof step.element === 'function') {
      const fn = step.element;
      ds.element = (() => fn()) as () => Element;
    } else {
      ds.element = step.element;
    }

    // Navigate action: pause driver, wait for URL, resume
    if (isNavigateAction) {
      ds.onHighlighted = () => {
        this.runPreActionAndRefresh(step);
        this.setupNavigateAction(step.action!, globalIndex);
      };
      // onDeselected: only cleanup if NOT pausing (user went "previous")
      ds.onDeselected = () => {
        if (!this.isPausing) {
          this.cleanupNavigate();
          this.cleanupActionListeners();
        }
      };
    }
    // Inline actions (click / dom)
    else if (hasInlineAction) {
      ds.onHighlighted = (el, _driveStep, opts) => {
        this.runPreActionAndRefresh(step);
        this.setupInlineAction(step.action!, opts.driver, el, globalIndex);
      };
      ds.onDeselected = () => {
        this.cleanupActionListeners();
      };
    }
    // No action — just preAction
    else if (step.preAction) {
      ds.onHighlighted = () => {
        this.runPreActionAndRefresh(step);
      };
    }

    return ds;
  }

  // ── Navigate action (pause / resume) ─────────────────────────────

  private setupNavigateAction(action: TourStepAction, globalIndex: number): void {
    this.navResolved = false;
    const timeout = action.timeout ?? 60000;

    const resumeAfterNav = () => {
      if (this.navResolved) return;
      this.navResolved = true;

      // Clean navigate state
      this.cleanupNavigate();
      this.removeFloatingHint();

      // Destroy driver if still alive
      if (this.current) {
        this.isPausing = true;
        const d = this.current;
        this.current = null;
        try { d.destroy(); } catch { /* ok */ }
        this.isPausing = false;
      }

      // Resume from next step after preDelay
      const nextStep = this.tourSteps[globalIndex + 1];
      const waitMs = nextStep?.preDelay ?? 800;
      setTimeout(() => {
        if (this.currentTourId) {
          this.launchDriver(globalIndex + 1);
        }
      }, waitMs);
    };

    // 1) Subscribe to NavigationEnd FIRST (before destroying driver)
    this.navSub = this.zone.run(() =>
      this.router.events.pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        filter(e => e.urlAfterRedirects.includes(action.urlMatch!)),
        take(1),
      ).subscribe(() => resumeAfterNav()),
    );

    // 2) Check if already at the target URL
    if (this.router.url.includes(action.urlMatch!)) {
      resumeAfterNav();
      return;
    }

    // 3) Safety timeout
    this.navTimer = window.setTimeout(resumeAfterNav, timeout);

    // 4) Show floating hint with close button
    if (action.hint) {
      this.showFloatingHint(action.hint, () => {
        // User clicked ✕ on the hint → cancel tour
        this.destroyCurrent();
      });
    }

    // 5) Destroy driver after 600ms to free overlay for user interaction
    setTimeout(() => {
      if (this.navResolved) return;
      if (this.current) {
        this.isPausing = true;
        const d = this.current;
        this.current = null;
        try { d.destroy(); } catch { /* ok */ }
        this.isPausing = false;
      }
    }, 600);
  }

  /** Clean navigate-specific state (subscription + timer) */
  private cleanupNavigate(): void {
    if (this.navSub) {
      this.navSub.unsubscribe();
      this.navSub = null;
    }
    if (this.navTimer != null) {
      clearTimeout(this.navTimer);
      this.navTimer = null;
    }
  }

  // ── Inline actions (click / dom) ─────────────────────────────────

  private setupInlineAction(action: TourStepAction, d: Driver, el?: Element, globalIndex?: number): void {
    const timeout = action.timeout ?? 60000;
    let resolved = false;

    const advance = () => {
      if (resolved) return;
      resolved = true;
      setTimeout(() => {
        if (!d.isActive()) return;
        const nextStep = globalIndex != null ? this.tourSteps[globalIndex + 1] : undefined;
        if (nextStep?.preDelay) {
          setTimeout(() => { if (d.isActive()) d.moveNext(); }, nextStep.preDelay);
        } else {
          if (d.isActive()) d.moveNext();
        }
      }, 300);
    };

    // Safety timeout
    const timer = window.setTimeout(advance, timeout);
    this.actionCleanups.push(() => clearTimeout(timer));

    switch (action.type) {
      case 'click': {
        const target = action.clickTarget
          ? document.querySelector(action.clickTarget)
          : el;
        if (target) {
          const handler = () => advance();
          target.addEventListener('click', handler, { once: true });
          this.actionCleanups.push(() => target.removeEventListener('click', handler));
        } else {
          setTimeout(advance, 1000);
        }
        break;
      }
      case 'dom': {
        if (action.domSelector && document.querySelector(action.domSelector)) {
          advance();
          return;
        }
        const interval = window.setInterval(() => {
          if (document.querySelector(action.domSelector!)) {
            clearInterval(interval);
            advance();
          }
        }, 200);
        this.actionCleanups.push(() => clearInterval(interval));
        break;
      }
    }
  }

  // ── Floating hint ────────────────────────────────────────────────

  private floatingHintEl: HTMLElement | null = null;

  private showFloatingHint(text: string, onClose?: () => void): void {
    this.removeFloatingHint();
    const el = document.createElement('div');
    el.className = 'tour-floating-hint';
    el.innerHTML = `<span class="tour-floating-hint-icon">👆</span><span class="tour-floating-hint-text">${text}</span>`;

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'tour-floating-hint-close';
    closeBtn.innerHTML = '✕';
    closeBtn.addEventListener('click', () => {
      if (onClose) onClose();
      else this.removeFloatingHint();
    });
    el.appendChild(closeBtn);

    document.body.appendChild(el);
    this.floatingHintEl = el;
  }

  private removeFloatingHint(): void {
    if (this.floatingHintEl) {
      this.floatingHintEl.remove();
      this.floatingHintEl = null;
    }
  }

  // ── preAction + refresh ─────────────────────────────────────────

  /**
   * Run step.preAction() (e.g. open a panel), then after a DOM reflow
   * call driver.refresh() so the highlight repositions correctly.
   */
  private runPreActionAndRefresh(step: TourStep): void {
    if (!step.preAction) return;
    step.preAction();
    // Wait for Angular change detection + CSS transition to start,
    // then refresh the driver overlay position.
    setTimeout(() => this.current?.refresh(), 350);
  }

  // ── Utilities ────────────────────────────────────────────────────

  private cleanupActionListeners(): void {
    for (const fn of this.actionCleanups) {
      try { fn(); } catch { /* ignore */ }
    }
    this.actionCleanups = [];
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
