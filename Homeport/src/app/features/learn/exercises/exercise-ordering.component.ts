import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { OrderingData } from '../learn-curriculum';

@Component({
  selector: 'exercise-ordering',
  standalone: true,
  imports: [CommonModule, DragDropModule, NzButtonModule, NzIconModule, NzAlertModule],
  template: `
    <div class="ord">
      <p class="ord-instruction">{{ data.instruction }}</p>
      <div class="ord-list" cdkDropList (cdkDropListDropped)="drop($event)">
        <div *ngFor="let item of items; let i = index" cdkDrag class="ord-item"
             [class.correct]="submitted && results[i]"
             [class.incorrect]="submitted && !results[i]"
             [cdkDragDisabled]="submitted">
          <span class="ord-handle" *ngIf="!submitted" cdkDragHandle>
            <span nz-icon nzType="menu" nzTheme="outline"></span>
          </span>
          <span class="ord-number">{{ i + 1 }}</span>
          <span class="ord-text">{{ item }}</span>
          <span *ngIf="submitted && results[i]" nz-icon nzType="check-circle" nzTheme="fill" style="color:#52c41a; margin-left:auto"></span>
          <span *ngIf="submitted && !results[i]" nz-icon nzType="close-circle" nzTheme="fill" style="color:#ff4d4f; margin-left:auto"></span>
        </div>
      </div>
      <div class="ord-actions" *ngIf="!submitted">
        <button nz-button nzType="primary" (click)="submit()">Valider</button>
        <button nz-button (click)="shuffle()">Mélanger</button>
      </div>
      <nz-alert *ngIf="submitted && allCorrect" nzType="success" nzMessage="L'ordre est correct !" nzShowIcon></nz-alert>
      <nz-alert *ngIf="submitted && !allCorrect" nzType="error" nzMessage="L'ordre n'est pas tout à fait correct. Les éléments bien placés sont en vert." nzShowIcon></nz-alert>
      <div class="ord-actions" *ngIf="submitted && !allCorrect">
        <button nz-button nzType="primary" (click)="shuffle()">Réessayer</button>
      </div>
    </div>
  `,
  styles: [`
    .ord-instruction { font-size: 14px; margin-bottom: 12px; }
    .ord-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
    .ord-item {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 14px; border: 1px solid #d9d9d9; border-radius: 8px;
      background: #fff; font-size: 14px; cursor: grab; user-select: none;
      transition: all 0.2s;
    }
    .ord-item:active { cursor: grabbing; }
    .ord-item[cdkDragDisabled] { cursor: default; }
    .ord-item.correct { border-color: #52c41a; background: #f6ffed; }
    .ord-item.incorrect { border-color: #ff4d4f; background: #fff2f0; }
    .ord-handle { color: #bbb; cursor: grab; }
    .ord-handle:active { cursor: grabbing; }
    .ord-number {
      display: inline-flex; align-items: center; justify-content: center;
      width: 24px; height: 24px; border-radius: 50%; background: #f0f0f0;
      font-weight: 600; font-size: 12px; flex-shrink: 0;
    }
    .correct .ord-number { background: #52c41a; color: #fff; }
    .incorrect .ord-number { background: #ff4d4f; color: #fff; }
    .ord-text { flex: 1; }
    .ord-actions { display: flex; gap: 8px; }
    .cdk-drag-preview { box-shadow: 0 2px 8px rgba(0,0,0,0.15); border-radius: 8px; }
    .cdk-drag-placeholder { opacity: 0.3; }
  `]
})
export class ExerciseOrderingComponent implements OnInit {
  @Input() data!: OrderingData;
  @Output() completed = new EventEmitter<boolean>();

  items: string[] = [];
  results: boolean[] = [];
  submitted = false;
  allCorrect = false;

  ngOnInit() { this.shuffle(); }

  drop(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.items, event.previousIndex, event.currentIndex);
  }

  submit() {
    this.submitted = true;
    this.results = this.items.map((item, i) => item === this.data.correctOrder[i]);
    this.allCorrect = this.results.every(r => r);
    this.completed.emit(this.allCorrect);
  }

  shuffle() {
    this.submitted = false;
    this.results = [];
    const a = [...this.data.correctOrder];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    // Avoid starting in correct order
    if (a.length > 1 && a.every((item, i) => item === this.data.correctOrder[i])) {
      [a[0], a[1]] = [a[1], a[0]];
    }
    this.items = a;
  }
}
