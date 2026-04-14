import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';

export type WidgetActionId =
  | 'fullscreen'
  | 'copy'
  | 'export:pdf'
  | 'export:png'
  | 'export:svg'
  | 'export:json'
  | 'export:csv'
  | 'export:xlsx';

export interface WidgetAction {
  id: WidgetActionId;
  label: string;
  icon: string;
}

/**
 * Small dropdown menu button used in the top-right corner of each widget.
 * Parent declares the available actions; clicks are emitted via the `action` output.
 */
@Component({
  selector: 'ai-widget-actions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NzIconModule, NzButtonModule, NzDropDownModule],
  template: `
    <button
      nz-button nzType="text" nzSize="small" class="widget-btn"
      nz-dropdown [nzDropdownMenu]="menu" [nzTrigger]="'click'" nzPlacement="bottomRight"
      (click)="$event.stopPropagation()"
      title="Options">
      <span nz-icon nzType="more" nzTheme="outline"></span>
    </button>
    <nz-dropdown-menu #menu="nzDropdownMenu">
      <ul nz-menu class="widget-menu">
        <li nz-menu-item *ngFor="let a of actions" (click)="action.emit(a.id)">
          <span nz-icon [nzType]="a.icon" nzTheme="outline"></span>
          &nbsp;{{ a.label }}
        </li>
      </ul>
    </nz-dropdown-menu>
  `,
  styles: [`
    :host { display: inline-flex; }
    .widget-btn {
      width: 28px; height: 28px; padding: 0 !important;
      display: flex; align-items: center; justify-content: center;
      color: #555 !important; transition: background 0.15s, color 0.15s;
    }
    .widget-btn:hover { background: #f5f5f5 !important; color: #e61982 !important; }
    .widget-btn ::ng-deep [nz-icon] { font-size: 16px; }
    .widget-menu { min-width: 200px; }
  `],
})
export class AiWidgetActionsComponent {
  @Input() actions: WidgetAction[] = [];
  @Output() action = new EventEmitter<WidgetActionId>();
}
