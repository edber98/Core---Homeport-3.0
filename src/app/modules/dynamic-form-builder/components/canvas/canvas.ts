// components/canvas/canvas.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { BuilderState } from '../../builder-state.service';
import { FieldConfig } from '../../builder.types';

@Component({
  selector: 'df-canvas',
  standalone: true,
  imports: [CommonModule, NzListModule, NzButtonModule, DragDropModule],
  templateUrl: './canvas.html',
  styleUrls: ['./canvas.scss']
})
export class Canvas {
  constructor(public state: BuilderState) {}

  dropStep(ev: CdkDragDrop<any[]>) {
    this.state.reorderStep(ev.previousIndex, ev.currentIndex);
  }
  dropSectionRoot(ev: CdkDragDrop<any[]>) {
    this.state.reorderSection(undefined, ev.previousIndex, ev.currentIndex);
  }
  dropSectionIn(stepIndex: number, ev: CdkDragDrop<any[]>) {
    this.state.reorderSection(stepIndex, ev.previousIndex, ev.currentIndex);
  }
  dropField(stepIndex: number | undefined, sectionIndex: number, ev: CdkDragDrop<any[]>) {
    if (ev.previousContainer === ev.container) {
      this.state.reorderField(stepIndex, sectionIndex, ev.previousIndex, ev.currentIndex);
    } else {
      const kind = ev.item.data as FieldConfig['type'];
      if (kind) {
        this.state.addField(kind, stepIndex, sectionIndex, ev.currentIndex);
      }
    }
  }
}
