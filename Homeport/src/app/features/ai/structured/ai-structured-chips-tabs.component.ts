import { Component, Input, signal, computed, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzIconModule } from 'ng-zorro-antd/icon';

interface ChipsBlock {
  type: 'text' | 'image' | 'code' | 'quote';
  content: string;
  language?: string;
  alt?: string;
}

interface ChipsChip {
  id: string;
  label: string;
  badge?: string | number;
}

interface ChipsTab {
  chipId: string;
  content: {
    title?: string;
    blocks: ChipsBlock[];
  };
}

interface ChipsTabsData {
  chips: ChipsChip[];
  tabs: ChipsTab[];
}

@Component({
  selector: 'ai-structured-chips-tabs',
  standalone: true,
  imports: [CommonModule, NzIconModule],
  template: `
    <div class="chips-tabs" *ngIf="data">
      <div class="chips-bar">
        <button
          type="button"
          class="chip"
          *ngFor="let c of data.chips"
          [class.active]="activeChipId() === c.id"
          (click)="setActive(c.id)">
          <span class="chip-label">{{ c.label }}</span>
          <span class="chip-badge" *ngIf="c.badge !== undefined && c.badge !== null">{{ c.badge }}</span>
        </button>
      </div>

      <div class="tab-content" [attr.data-chip]="activeChipId()">
        <ng-container *ngIf="currentTab() as tab">
          <div class="tab-title" *ngIf="tab.content?.title">{{ tab.content.title }}</div>
          <div class="blocks">
            <ng-container *ngFor="let b of tab.content?.blocks || []">
              <p class="block-text" *ngIf="b.type === 'text'">{{ b.content }}</p>
              <img
                class="block-image"
                *ngIf="b.type === 'image'"
                [src]="b.content"
                [alt]="b.alt || ''" />
              <pre class="block-code" *ngIf="b.type === 'code'"><code>{{ b.content }}</code></pre>
              <blockquote class="block-quote" *ngIf="b.type === 'quote'">
                <span nz-icon nzType="message" nzTheme="outline"></span>
                <span>{{ b.content }}</span>
              </blockquote>
            </ng-container>
          </div>
        </ng-container>
        <div class="empty-tab" *ngIf="!currentTab()">
          <span>Aucun contenu pour cette sélection.</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .chips-tabs { display: flex; flex-direction: column; gap: 10px; }
    .chips-bar {
      display: flex; gap: 6px; flex-wrap: nowrap; overflow-x: auto;
      padding: 2px 0 6px; scrollbar-width: thin;
      -webkit-overflow-scrolling: touch;
    }
    .chips-bar::-webkit-scrollbar { height: 4px; }
    .chips-bar::-webkit-scrollbar-thumb { background: #ddd; border-radius: 2px; }
    .chip {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: 12px; padding: 4px 12px; border-radius: 14px;
      background: #fff; color: #666; border: 1px solid #e8e8e8;
      cursor: pointer; transition: all 0.15s ease;
      white-space: nowrap; flex-shrink: 0;
    }
    .chip:hover { border-color: #e61982; color: #e61982; }
    .chip.active {
      background: #e61982; color: #fff; border-color: #e61982;
      box-shadow: 0 2px 6px rgba(230, 25, 130, 0.25);
    }
    .chip-badge {
      font-size: 10px; padding: 0 6px; border-radius: 8px;
      background: rgba(0, 0, 0, 0.08); color: inherit;
    }
    .chip.active .chip-badge { background: rgba(255, 255, 255, 0.25); }

    .tab-content {
      background: #fff; border: 1px solid #f0f0f0; border-radius: 8px;
      padding: 12px 14px; min-height: 40px;
      animation: fadeIn 120ms ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(2px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .tab-title {
      font-size: 14px; font-weight: 600; color: #333;
      margin-bottom: 8px;
    }
    .blocks { display: flex; flex-direction: column; gap: 8px; }
    .block-text { margin: 0; font-size: 13px; color: #333; line-height: 1.5; }
    .block-image {
      max-width: 100%; border-radius: 6px; display: block;
    }
    .block-code {
      background: #f6f6f6; padding: 8px 10px; border-radius: 6px;
      font-size: 12px; color: #333; margin: 0; overflow-x: auto;
    }
    .block-quote {
      margin: 0; padding: 8px 12px;
      background: #fdf2f8; border-left: 3px solid #e61982;
      border-radius: 0 6px 6px 0; font-size: 13px; color: #555;
      display: flex; gap: 8px; align-items: flex-start;
    }
    .block-quote span[nz-icon] { color: #e61982; margin-top: 3px; flex-shrink: 0; }
    .empty-tab { color: #999; font-size: 12px; font-style: italic; }

    @media (max-width: 640px) {
      .chips-bar { padding-bottom: 4px; }
      .chip { font-size: 11px; padding: 3px 10px; }
    }
  `],
})
export class AiStructuredChipsTabsComponent implements OnChanges {
  @Input() data!: ChipsTabsData;

  activeChipId = signal<string | null>(null);

  currentTab = computed(() => {
    const id = this.activeChipId();
    if (!id || !this.data?.tabs) return null;
    return this.data.tabs.find(t => t.chipId === id) || null;
  });

  ngOnChanges(): void {
    const first = this.data?.chips?.[0]?.id || null;
    if (first && this.activeChipId() === null) this.activeChipId.set(first);
  }

  setActive(id: string): void {
    this.activeChipId.set(id);
  }
}
