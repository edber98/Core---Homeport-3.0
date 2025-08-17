import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'ui-topbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ui-topbar.component.html',
  styleUrl: './ui-topbar.component.scss'
})
export class UiTopbarComponent {
  @Input() projectName = 'UI Project';
  @Input() device: 'desktop'|'tablet'|'mobile-portrait'|'mobile-landscape' = 'desktop';
  @Input() zoomPct = 100;
  @Input() rulers = false;
  @Input() guides = false;
  @Input() grid = false;
  @Input() canUndo = false;
  @Input() canRedo = false;
  @Input() preview = false;

  @Output() deviceChange = new EventEmitter<'desktop'|'tablet'|'mobile-portrait'|'mobile-landscape'>();
  @Output() zoomChange = new EventEmitter<number>();
  @Output() rulersChange = new EventEmitter<boolean>();
  @Output() guidesChange = new EventEmitter<boolean>();
  @Output() gridChange = new EventEmitter<boolean>();
  @Output() undo = new EventEmitter<void>();
  @Output() redo = new EventEmitter<void>();
  @Output() publish = new EventEmitter<void>();
  @Output() export = new EventEmitter<void>();
  @Output() previewChange = new EventEmitter<boolean>();
  @Output() openBreakpoints = new EventEmitter<void>();
  @Output() openDesignSystem = new EventEmitter<void>();

  onZoom(v: any) {
    const num = Math.max(25, Math.min(200, Number(v) || this.zoomPct));
    this.zoomChange.emit(num);
  }
}
