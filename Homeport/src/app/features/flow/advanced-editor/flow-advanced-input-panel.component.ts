import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'flow-advanced-input-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="panel input" aria-label="Input panel"></div>
  `,
  styles: [`
    :host { display:block; height:100%; }
    .panel { height:100%; overflow:auto; padding:16px 20px; background:transparent; }
  `]
})
export class FlowAdvancedInputPanelComponent {
  @Input() model: any;
}
