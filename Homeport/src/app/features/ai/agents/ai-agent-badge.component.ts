import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { AgentProfile, resolveAgentProfile } from './ai-roster';

/**
 * Pastille compacte affichant le nom humain d'un subagent (emoji + prénom).
 * Au hover, une fiche riche (avatar, figure historique, années, domaine, bio)
 * s'affiche au-dessus du badge, façon "character sheet" de RPG.
 *
 * Usage :
 *   <ai-agent-badge [subagentType]="'research'"></ai-agent-badge>
 *   <ai-agent-badge [agent]="{subagentType, agentName, agentColor, ...}"></ai-agent-badge>
 */
@Component({
  selector: 'ai-agent-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NzIconModule],
  template: `
    <span
      class="agent-badge"
      [style.--agent-color]="profile()?.color || '#e61982'"
      [class.compact]="compact"
      [class.show-tagline]="showTagline"
      (mouseenter)="openTooltip()"
      (mouseleave)="closeTooltip()"
      (focusin)="openTooltip()"
      (focusout)="closeTooltip()"
      tabindex="0"
    >
      <span class="avatar">{{ profile()?.emoji || '🤖' }}</span>
      <span class="name">{{ profile()?.name || 'Agent' }}</span>
      <span class="tagline" *ngIf="showTagline && profile()?.tagline">· {{ profile()?.tagline }}</span>

      <!-- Rich tooltip portal-like, positionné au-dessus -->
      <span class="tt-wrap" *ngIf="tooltipOpen() && profile()">
        <span class="tt-card" [style.--agent-color]="profile()!.color">
          <span class="tt-head">
            <span class="tt-avatar">{{ profile()!.emoji }}</span>
            <span class="tt-title">
              <span class="tt-figure">{{ profile()!.figure }}</span>
              <span class="tt-meta" *ngIf="profile()!.years || profile()!.field">
                <span *ngIf="profile()!.years">{{ profile()!.years }}</span>
                <span *ngIf="profile()!.years && profile()!.field"> · </span>
                <span *ngIf="profile()!.field">{{ profile()!.field }}</span>
              </span>
            </span>
          </span>
          <span class="tt-bio">{{ profile()!.bio }}</span>
          <span class="tt-role">
            <span class="tt-role-label">Dans Homeport :</span>
            <span class="tt-role-value">{{ profile()!.tagline }}</span>
          </span>
        </span>
      </span>
    </span>
  `,
  styles: [`
    :host { display: inline-flex; }

    .agent-badge {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 2px 9px 2px 4px;
      background: color-mix(in srgb, var(--agent-color) 8%, #fff);
      border: 1px solid color-mix(in srgb, var(--agent-color) 25%, transparent);
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      color: var(--agent-color);
      cursor: default;
      user-select: none;
      outline: none;
      transition: background .15s, border-color .15s, transform .12s;
      line-height: 1.2;
    }
    .agent-badge:hover,
    .agent-badge:focus-visible {
      background: color-mix(in srgb, var(--agent-color) 14%, #fff);
      border-color: color-mix(in srgb, var(--agent-color) 40%, transparent);
      transform: translateY(-1px);
    }
    .agent-badge.compact { padding: 1px 7px 1px 3px; font-size: 11px; gap: 4px; }

    .avatar {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px; height: 18px;
      font-size: 13px;
      line-height: 1;
      background: #fff;
      border-radius: 50%;
      box-shadow: 0 1px 2px rgba(0,0,0,.08);
    }
    .agent-badge.compact .avatar { width: 16px; height: 16px; font-size: 11px; }

    .name { font-weight: 700; letter-spacing: .1px; }
    .tagline { font-weight: 400; color: color-mix(in srgb, var(--agent-color) 70%, #595959); font-size: 11px; }

    /* Tooltip ── positionné au-dessus du badge */
    .tt-wrap {
      position: absolute;
      bottom: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%);
      z-index: 100000;
      pointer-events: none;
      animation: ttIn 160ms cubic-bezier(.2,.8,.2,1);
    }
    @keyframes ttIn {
      from { opacity: 0; transform: translate(-50%, 4px) scale(.96); }
      to   { opacity: 1; transform: translate(-50%, 0) scale(1); }
    }
    .tt-card {
      display: block;
      width: 320px;
      background: #fff;
      border: 1px solid #e8e8e8;
      border-top: 3px solid var(--agent-color);
      border-radius: 10px;
      box-shadow: 0 12px 36px rgba(0,0,0,.14), 0 2px 8px rgba(0,0,0,.06);
      padding: 12px 14px 13px;
      font-size: 12px;
      color: #262626;
      text-align: left;
      white-space: normal;
      line-height: 1.5;
    }
    /* Flèche sous la carte */
    .tt-card::after {
      content: '';
      position: absolute;
      top: 100%; left: 50%;
      transform: translateX(-50%);
      border: 6px solid transparent;
      border-top-color: #fff;
    }

    .tt-head { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 8px; }
    .tt-avatar {
      flex: 0 0 auto;
      width: 40px; height: 40px;
      display: flex; align-items: center; justify-content: center;
      font-size: 22px;
      background: color-mix(in srgb, var(--agent-color) 12%, #fafafa);
      border: 1px solid color-mix(in srgb, var(--agent-color) 25%, transparent);
      border-radius: 50%;
    }
    .tt-title { flex: 1; min-width: 0; }
    .tt-figure {
      display: block;
      font-size: 14px;
      font-weight: 700;
      color: var(--agent-color);
      line-height: 1.2;
    }
    .tt-meta {
      display: block;
      font-size: 11px;
      color: #8c8c8c;
      margin-top: 2px;
    }
    .tt-bio {
      display: block;
      color: #434343;
      margin-bottom: 10px;
    }
    .tt-role {
      display: block;
      padding-top: 8px;
      border-top: 1px solid #f0f0f0;
      font-size: 11px;
    }
    .tt-role-label { color: #8c8c8c; margin-right: 4px; }
    .tt-role-value {
      color: var(--agent-color);
      font-weight: 600;
    }
  `],
})
export class AiAgentBadgeComponent {
  @Input() subagentType?: string | null;
  @Input() agent?: {
    subagentType?: string;
    agentName?: string;
    agentEmoji?: string;
    agentColor?: string;
    agentTagline?: string;
    agentFigure?: string;
  };
  @Input() compact = false;
  @Input() showTagline = false;

  tooltipOpen = signal(false);
  private _openTimer: any = null;

  profile = computed<AgentProfile | null>(() => {
    return resolveAgentProfile({
      subagentType: this.agent?.subagentType || this.subagentType || undefined,
      agentName: this.agent?.agentName,
      agentEmoji: this.agent?.agentEmoji,
      agentColor: this.agent?.agentColor,
      agentTagline: this.agent?.agentTagline,
      agentFigure: this.agent?.agentFigure,
    });
  });

  openTooltip() {
    clearTimeout(this._openTimer);
    this._openTimer = setTimeout(() => this.tooltipOpen.set(true), 280);
  }
  closeTooltip() {
    clearTimeout(this._openTimer);
    this.tooltipOpen.set(false);
  }
}
