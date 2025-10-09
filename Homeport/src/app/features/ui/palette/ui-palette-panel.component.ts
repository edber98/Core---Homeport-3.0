import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ui-palette-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="palette">
    <div class="panel-heading"><div class="card-title"><div class="t">Palette</div><div class="s">Composants</div></div></div>
    <div class="items">
      <button class="item" *ngFor="let el of elements" (click)="add.emit(el.tag)" type="button">
        <span class="mini-icon"><i class="fa-regular fa-square"></i></span>
        <div class="meta"><div class="title">{{el.label}}</div><div class="subtitle">{{el.tag}}</div></div>
      </button>
    </div>
  </div>
  `,
  styles: [`
  .palette { }
  .panel-heading { display:flex; align-items:flex-end; font-weight:600; font-size:13px; color:#111; padding:6px 0 8px; margin-bottom: 8px; border-bottom:1px solid #E2E1E4; }
  .items { display:flex; flex-direction:column; gap:8px; }
  .item { display:flex; gap:10px; align-items:center; background:#fff; border:1px solid #e5e7eb; border-radius:10px; padding:10px 12px; cursor:pointer; }
  .item:hover { border-color:#d1d5db; }
  .mini-icon { width:16px; height:16px; display:inline-flex; align-items:center; justify-content:center; }
  .meta .title { font-weight:600; font-size:12px; }
  .meta .subtitle { color:#8c8c8c; font-size:12px; }
  `]
})
export class UiPalettePanelComponent {
  @Input() elements: Array<{ tag: string; label: string }> = [];
  @Output() add = new EventEmitter<string>();
}

