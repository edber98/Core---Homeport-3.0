import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { NzIconModule } from 'ng-zorro-antd/icon';

interface DragItem {
  id: string;
  label: string;
  icon: string;
  color: string;
}

@Component({
  selector: 'demo-drag-nodes',
  standalone: true,
  imports: [CommonModule, DragDropModule, NzIconModule],
  template: `
    <div class="ddn">
      <div class="ddn-instruction">
        Glissez les nœuds depuis la palette vers les emplacements du canvas.
      </div>

      <div class="ddn-layout">
        <!-- Palette -->
        <div class="ddn-palette">
          <div class="ddn-palette-title">Palette</div>
          <div cdkDropList [cdkDropListData]="palette" cdkDropListSortingDisabled
               [cdkDropListConnectedTo]="slotIds"
               class="ddn-palette-list"
               (cdkDropListDropped)="onDrop($event)">
            <div *ngFor="let item of palette" cdkDrag [cdkDragData]="item" class="ddn-node"
                 [style.borderColor]="item.color">
              <span nz-icon [nzType]="item.icon" nzTheme="outline" [style.color]="item.color"></span>
              {{ item.label }}
            </div>
          </div>
        </div>

        <!-- Canvas with slots -->
        <div class="ddn-canvas">
          <div *ngFor="let slot of slots; let i = index" class="ddn-slot-wrapper">
            <div class="ddn-slot-label">{{ slotLabels[i] }}</div>
            <div cdkDropList [id]="slotIds[i]" [cdkDropListData]="slot"
                 [cdkDropListConnectedTo]="['palette']"
                 class="ddn-slot"
                 [class.ddn-slot-filled]="slot.length > 0"
                 [class.ddn-slot-correct]="isCorrect(i)"
                 [class.ddn-slot-incorrect]="slot.length > 0 && validated && !isCorrect(i)"
                 (cdkDropListDropped)="onDrop($event)">
              <div *ngIf="slot.length === 0" class="ddn-slot-placeholder">
                <span nz-icon nzType="plus" nzTheme="outline"></span>
              </div>
              <div *ngFor="let item of slot" cdkDrag [cdkDragData]="item" class="ddn-node"
                   [style.borderColor]="item.color">
                <span nz-icon [nzType]="item.icon" nzTheme="outline" [style.color]="item.color"></span>
                {{ item.label }}
              </div>
            </div>
            <!-- Connector arrow -->
            <div *ngIf="i < slots.length - 1" class="ddn-arrow">
              <span nz-icon nzType="arrow-right" nzTheme="outline"></span>
            </div>
          </div>
        </div>
      </div>

      <!-- Validation -->
      <div class="ddn-actions">
        <button class="ddn-btn" (click)="validate()" [disabled]="!allFilled">Vérifier</button>
        <button class="ddn-btn ddn-btn-secondary" (click)="reset()">Recommencer</button>
      </div>
      <div *ngIf="validated" class="ddn-result" [class.success]="allCorrect" [class.error]="!allCorrect">
        {{ allCorrect ? 'Parfait ! Les nœuds sont dans le bon ordre.' : 'Pas tout à fait… Essayez un autre arrangement !' }}
      </div>
    </div>
  `,
  styles: [`
    .ddn { padding: 16px; height: 100%; display: flex; flex-direction: column; }
    .ddn-instruction { font-size: 14px; color: #666; margin-bottom: 14px; }

    .ddn-layout { display: flex; gap: 20px; flex: 1; min-height: 0; }

    /* Palette */
    .ddn-palette { width: 140px; flex-shrink: 0; }
    .ddn-palette-title { font-size: 12px; font-weight: 600; color: #999; text-transform: uppercase; margin-bottom: 8px; }
    .ddn-palette-list { display: flex; flex-direction: column; gap: 8px; min-height: 60px; }

    /* Node chip */
    .ddn-node {
      display: flex; align-items: center; gap: 6px;
      padding: 8px 12px; border: 2px solid #d9d9d9; border-radius: 8px;
      background: #fff; cursor: grab; font-size: 13px; font-weight: 500;
      transition: box-shadow 0.2s;
      user-select: none;
    }
    .ddn-node:active { cursor: grabbing; }
    .cdk-drag-preview { box-shadow: 0 4px 16px rgba(0,0,0,0.15); border-radius: 8px; }
    .cdk-drag-placeholder { opacity: 0.3; }

    /* Canvas */
    .ddn-canvas { flex: 1; display: flex; align-items: center; justify-content: center; gap: 0; flex-wrap: wrap; }
    .ddn-slot-wrapper { display: flex; align-items: center; gap: 8px; }
    .ddn-slot-label { font-size: 11px; color: #999; text-align: center; margin-bottom: 4px; display: none; }
    .ddn-slot {
      width: 130px; min-height: 50px;
      border: 2px dashed #d9d9d9; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      background: #fff; transition: all 0.2s;
    }
    .ddn-slot-filled { border-style: solid; }
    .ddn-slot-correct { border-color: #52c41a; background: #f6ffed; }
    .ddn-slot-incorrect { border-color: #ff4d4f; background: #fff2f0; }
    .ddn-slot-placeholder { color: #d9d9d9; font-size: 20px; }
    .ddn-arrow { color: #bbb; font-size: 18px; margin: 0 4px; }

    /* Actions */
    .ddn-actions { display: flex; gap: 8px; margin-top: 14px; }
    .ddn-btn {
      padding: 6px 18px; border: 1px solid #1890ff; border-radius: 6px;
      background: #1890ff; color: #fff; cursor: pointer; font-size: 13px;
      transition: opacity 0.2s;
    }
    .ddn-btn:disabled { opacity: 0.5; cursor: default; }
    .ddn-btn-secondary { background: #fff; color: #666; border-color: #d9d9d9; }
    .ddn-result {
      margin-top: 10px; padding: 8px 14px; border-radius: 6px; font-size: 13px;
    }
    .ddn-result.success { background: #f6ffed; color: #52c41a; border: 1px solid #b7eb8f; }
    .ddn-result.error { background: #fff2f0; color: #ff4d4f; border: 1px solid #ffa39e; }

    @media (max-width: 768px) {
      .ddn-layout { flex-direction: column; }
      .ddn-palette { width: 100%; }
      .ddn-palette-list { flex-direction: row; flex-wrap: wrap; }
      .ddn-canvas { flex-direction: column; }
      .ddn-slot-wrapper { flex-direction: column; }
      .ddn-arrow { transform: rotate(90deg); }
    }
  `]
})
export class DemoDragNodesComponent {
  palette: DragItem[] = [
    { id: 'start', label: 'Start', icon: 'play-circle', color: '#52c41a' },
    { id: 'http', label: 'HTTP', icon: 'api', color: '#1890ff' },
    { id: 'condition', label: 'Condition', icon: 'fork', color: '#faad14' },
    { id: 'email', label: 'Email', icon: 'mail', color: '#722ed1' },
  ];

  slots: DragItem[][] = [[], [], [], []];
  slotLabels = ['Étape 1', 'Étape 2', 'Étape 3', 'Étape 4'];
  slotIds = ['slot-0', 'slot-1', 'slot-2', 'slot-3'];
  correctOrder = ['start', 'http', 'condition', 'email'];

  validated = false;

  get allFilled(): boolean {
    return this.slots.every(s => s.length > 0);
  }

  get allCorrect(): boolean {
    return this.slots.every((s, i) => s.length > 0 && s[0].id === this.correctOrder[i]);
  }

  isCorrect(i: number): boolean {
    return this.validated && this.slots[i].length > 0 && this.slots[i][0].id === this.correctOrder[i];
  }

  onDrop(event: CdkDragDrop<DragItem[]>): void {
    this.validated = false;
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      // If target slot already has an item, move it back to palette
      if (event.container.data.length > 0 && event.container !== event.previousContainer) {
        const existing = event.container.data.splice(0, 1);
        this.palette.push(...existing);
      }
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        0,
      );
    }
  }

  validate(): void {
    this.validated = true;
  }

  reset(): void {
    this.validated = false;
    const all = [...this.palette];
    for (const slot of this.slots) {
      all.push(...slot.splice(0));
    }
    // Shuffle palette
    this.palette = all.sort(() => Math.random() - 0.5);
  }
}
