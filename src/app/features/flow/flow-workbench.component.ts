import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'flow-workbench',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './flow-workbench.component.html',
  styleUrl: './flow-workbench.component.scss'
})
export class FlowWorkbenchComponent {}

