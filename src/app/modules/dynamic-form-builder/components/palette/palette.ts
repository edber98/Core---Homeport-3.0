// components/palette/palette.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { BuilderState } from '../../builder-state.service';

@Component({
  selector: 'df-palette',
  standalone: true,
  imports: [CommonModule, NzButtonModule, DragDropModule],
  templateUrl: './palette.html'
})
export class Palette {
  constructor(public state: BuilderState) {}
}
