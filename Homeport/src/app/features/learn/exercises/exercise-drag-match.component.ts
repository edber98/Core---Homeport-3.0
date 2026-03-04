import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { DragMatchData } from '../learn-curriculum';

interface MatchSlot {
  left: string;
  right: string | null;
  correct?: boolean;
}

@Component({
  selector: 'exercise-drag-match',
  standalone: true,
  imports: [CommonModule, DragDropModule, NzButtonModule, NzIconModule, NzAlertModule],
  template: `
    <div class="dm">
      <p class="dm-instruction">{{ data.instruction }}</p>

      <!-- Available right-side items to drag -->
      <div class="dm-pool" *ngIf="!submitted">
        <div class="dm-pool-label">Glissez les éléments ci-dessous vers la bonne ligne :</div>
        <div class="dm-pool-items" cdkDropList [cdkDropListData]="pool" [cdkDropListConnectedTo]="allDropListIds" (cdkDropListDropped)="dropPool($event)" [id]="'pool'">
          <div *ngFor="let item of pool" cdkDrag class="dm-chip">{{ item }}</div>
        </div>
      </div>

      <!-- Match table -->
      <div class="dm-table">
        <div *ngFor="let slot of slots; let i = index" class="dm-row" [class.correct]="submitted && slot.correct" [class.incorrect]="submitted && slot.correct === false">
          <div class="dm-left">{{ slot.left }}</div>
          <div class="dm-arrow"><span nz-icon nzType="arrow-right"></span></div>
          <div class="dm-right-drop" cdkDropList [cdkDropListData]="slot.right ? [slot.right] : []" [cdkDropListConnectedTo]="allDropListIds" (cdkDropListDropped)="dropSlot($event, i)" [id]="'slot-' + i">
            <div *ngIf="slot.right" cdkDrag class="dm-chip placed" [cdkDragDisabled]="submitted">{{ slot.right }}</div>
            <div *ngIf="!slot.right && !submitted" class="dm-placeholder">Déposez ici</div>
            <span *ngIf="submitted && slot.correct" class="dm-feedback" nz-icon nzType="check-circle" nzTheme="fill" style="color:#52c41a"></span>
            <span *ngIf="submitted && slot.correct === false" class="dm-feedback" nz-icon nzType="close-circle" nzTheme="fill" style="color:#ff4d4f"></span>
          </div>
        </div>
      </div>

      <div class="dm-actions" *ngIf="!submitted">
        <button nz-button nzType="primary" [disabled]="!allPlaced" (click)="submit()">Valider</button>
        <button nz-button (click)="reset()">Réinitialiser</button>
      </div>
      <nz-alert *ngIf="submitted && allCorrect" nzType="success" nzMessage="Toutes les associations sont correctes !" nzShowIcon></nz-alert>
      <nz-alert *ngIf="submitted && !allCorrect" nzType="error" nzMessage="Certaines associations sont incorrectes. Les bonnes réponses sont indiquées en vert." nzShowIcon></nz-alert>
      <div class="dm-actions" *ngIf="submitted && !allCorrect">
        <button nz-button nzType="primary" (click)="retry()">Réessayer</button>
      </div>
    </div>
  `,
  styles: [`
    .dm-instruction { font-size: 14px; margin-bottom: 12px; }
    .dm-pool { margin-bottom: 16px; }
    .dm-pool-label { font-size: 13px; color: #666; margin-bottom: 6px; }
    .dm-pool-items {
      display: flex; flex-wrap: wrap; gap: 8px; min-height: 36px;
      padding: 8px; border: 1px dashed #d9d9d9; border-radius: 6px; background: #fafafa;
    }
    .dm-chip {
      padding: 6px 12px; background: #e6f7ff; border: 1px solid #91d5ff;
      border-radius: 6px; font-size: 13px; cursor: grab; user-select: none;
    }
    .dm-chip.placed { background: #f6ffed; border-color: #b7eb8f; }
    .dm-chip:active { cursor: grabbing; }
    .dm-table { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
    .dm-row {
      display: flex; align-items: center; gap: 8px; padding: 8px; border-radius: 8px;
      border: 1px solid #f0f0f0; background: #fff;
    }
    .dm-row.correct { border-color: #52c41a; background: #f6ffed; }
    .dm-row.incorrect { border-color: #ff4d4f; background: #fff2f0; }
    .dm-left { flex: 1; font-weight: 500; font-size: 14px; }
    .dm-arrow { color: #999; flex-shrink: 0; }
    .dm-right-drop {
      flex: 1; min-height: 36px; display: flex; align-items: center; gap: 8px;
      padding: 4px 8px; border: 1px dashed #d9d9d9; border-radius: 6px; background: #fafafa;
    }
    .dm-placeholder { color: #bbb; font-size: 13px; font-style: italic; }
    .dm-feedback { font-size: 18px; flex-shrink: 0; }
    .dm-actions { display: flex; gap: 8px; }
    .cdk-drag-preview { box-shadow: 0 2px 8px rgba(0,0,0,0.15); border-radius: 6px; }
    .cdk-drag-placeholder { opacity: 0.3; }
  `]
})
export class ExerciseDragMatchComponent implements OnInit {
  @Input() data!: DragMatchData;
  @Output() completed = new EventEmitter<boolean>();

  slots: MatchSlot[] = [];
  pool: string[] = [];
  submitted = false;
  allCorrect = false;
  correctMap: Record<string, string> = {};

  get allPlaced(): boolean { return this.slots.every(s => s.right !== null); }

  get allDropListIds(): string[] {
    return ['pool', ...this.slots.map((_, i) => 'slot-' + i)];
  }

  ngOnInit() { this.initState(); }

  private initState() {
    this.correctMap = {};
    this.data.pairs.forEach(p => { this.correctMap[p.left] = p.right; });
    this.slots = this.data.pairs.map(p => ({ left: p.left, right: null }));
    this.pool = this.shuffle(this.data.pairs.map(p => p.right));
    this.submitted = false;
    this.allCorrect = false;
  }

  dropPool(event: CdkDragDrop<string[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(this.pool, event.previousIndex, event.currentIndex);
    }
  }

  dropSlot(event: CdkDragDrop<any>, slotIndex: number) {
    const slot = this.slots[slotIndex];
    const draggedItem = event.previousContainer.data instanceof Array
      ? event.previousContainer.data[event.previousIndex]
      : null;

    if (!draggedItem) return;

    // If coming from pool
    if (event.previousContainer.id === 'pool') {
      // If slot already has an item, put it back
      if (slot.right) this.pool.push(slot.right);
      slot.right = draggedItem;
      this.pool = this.pool.filter((_, i) => i !== event.previousIndex);
    } else {
      // Coming from another slot
      const prevSlotIndex = parseInt(event.previousContainer.id.replace('slot-', ''), 10);
      const prevSlot = this.slots[prevSlotIndex];
      const temp = slot.right;
      slot.right = prevSlot.right;
      prevSlot.right = temp;
    }
  }

  submit() {
    this.submitted = true;
    this.slots.forEach(s => { s.correct = s.right === this.correctMap[s.left]; });
    this.allCorrect = this.slots.every(s => s.correct);
    this.completed.emit(this.allCorrect);
  }

  reset() { this.initState(); }

  retry() { this.initState(); }

  private shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}
