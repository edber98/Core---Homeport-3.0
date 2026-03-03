import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { driver, type DriveStep, type Driver, type AllowedButtons } from 'driver.js';

import { TourDefinition, TourStep, TourStepAction } from './learn-tours';
import { LearnProgressService } from './learn-progress.service';

@Injectable({ providedIn: 'root' })
export class LearnTourService {

  private current: Driver | null = null;
  private currentTourId: string | null = null;
  /** Filtered tour steps (mirrors driveSteps by index) */
  private tourSteps: TourStep[] = [];
  /** Cleanup functions for active action listeners */
  private actionCleanups: (() => void)[] = [];

  constructor(
    private zone: NgZone,
    private router: Router,
    private progress: LearnProgressService,
  ) {}

  /** Start a guided tour. Navigates if needed, then launches driver.js */
  async startTour(tour: TourDefinition): Promise<void> {
    this.destroyCurrent();

    // Navigate to target route if needed
    if (tour.targetRoute) {
      const currentUrl = this.router.url.split('?')[0];
      if (currentUrl !== tour.targetRoute) {
        await this.router.navigateByUrl(tour.targetRoute);
      }
    }

    // Wait for page to render
    await this.delay(tour.navigationDelay);

    // Filter steps: keep lazy (function) elements always, filter static ones
    const filteredSteps: TourStep[] = [];
    for (const step of tour.steps) {
      if (typeof step.element === 'function') {
        // Lazy elements are always included — resolved at display time
        filteredSteps.push(step);
      } else {
        const el = document.querySelector(step.element);
        if (el) {
          filteredSteps.push(step);
        }
        // If not found and not optional, skip (can't show without element)
      }
    }

    if (filteredSteps.length === 0) return;

    this.tourSteps = filteredSteps;
    this.currentTourId = tour.id;

    const driveSteps = filteredSteps.map((s, i) => this.buildDriveStep(s, i));

    // Run driver.js outside Angular zone to avoid triggering change detection on each frame
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
        progressText: '{{current}} / {{total}}',
        steps: driveSteps,
        onNextClick: (_el, _step, opts) => {
          const d = opts.driver;
          if (!d.hasNextStep()) {
            d.destroy();
            return;
          }
          const nextIdx = (d.getActiveIndex() ?? 0) + 1;
          const nextTourStep = this.tourSteps[nextIdx];
          if (nextTourStep?.preDelay) {
            setTimeout(() => d.moveNext(), nextTourStep.preDelay);
          } else {
            d.moveNext();
          }
        },
        onDestroyStarted: () => {
          this.cleanupActionListeners();
          this.zone.run(() => {
            if (this.currentTourId) {
              this.progress.completeTour(this.currentTourId);
            }
          });
          this.current?.destroy();
        },
      });

      this.current.drive();
    });
  }

  /** Convert a TourStep into a driver.js DriveStep */
  private buildDriveStep(step: TourStep, _index: number): DriveStep {
    const hasAction = !!step.action;

    // Build description with optional action hint
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
        ...(hasAction ? { disableButtons: ['next' as AllowedButtons] } : {}),
      },
    };

    // Element: string or lazy function
    if (typeof step.element === 'function') {
      const fn = step.element;
      ds.element = (() => fn()) as () => Element;
    } else {
      ds.element = step.element;
    }

    // Action hooks: set up listener when step becomes active, clean up when deselected
    if (hasAction) {
      ds.onHighlighted = (el, _driveStep, opts) => {
        this.setupActionListener(step.action!, opts.driver, el);
      };
      ds.onDeselected = () => {
        this.cleanupActionListeners();
      };
    }

    return ds;
  }

  /** Set up a listener for an interactive action step */
  private setupActionListener(action: TourStepAction, d: Driver, el?: Element): void {
    const timeout = action.timeout ?? 60000;
    let resolved = false;

    const advance = () => {
      if (resolved) return;
      resolved = true;
      // Small transition delay before moving
      setTimeout(() => {
        if (!d.isActive()) return;
        const nextIdx = (d.getActiveIndex() ?? 0) + 1;
        const nextStep = this.tourSteps[nextIdx];
        if (nextStep?.preDelay) {
          setTimeout(() => {
            if (d.isActive()) d.moveNext();
          }, nextStep.preDelay);
        } else {
          d.moveNext();
        }
      }, 300);
    };

    // Safety timeout: auto-advance after N seconds
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
          // Target not found — auto-advance after short delay
          setTimeout(advance, 1000);
        }
        break;
      }
      case 'navigate': {
        const interval = window.setInterval(() => {
          if (this.router.url.includes(action.urlMatch!)) {
            clearInterval(interval);
            advance();
          }
        }, 200);
        this.actionCleanups.push(() => clearInterval(interval));
        break;
      }
      case 'dom': {
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

  /** Clean up all active action listeners and timers */
  private cleanupActionListeners(): void {
    for (const fn of this.actionCleanups) {
      try { fn(); } catch { /* ignore */ }
    }
    this.actionCleanups = [];
  }

  /** Destroy the currently active tour */
  destroyCurrent(): void {
    this.cleanupActionListeners();
    if (this.current) {
      // Temporarily remove the callback to avoid double-marking
      const d = this.current;
      this.current = null;
      this.currentTourId = null;
      this.tourSteps = [];
      try { d.destroy(); } catch { /* already destroyed */ }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
