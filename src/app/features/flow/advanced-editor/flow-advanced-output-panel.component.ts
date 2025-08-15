import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'flow-advanced-output-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="panel output" aria-label="Output panel"></div>
  `,
  styles: [`
    :host { display:block; height:100%; }
    .panel { height:100%; overflow:auto; padding:24px 28px; background:transparent; }
  `]
})
export class FlowAdvancedOutputPanelComponent {
  @Input() outputs: string[] = [];
}
