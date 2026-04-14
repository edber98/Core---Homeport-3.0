import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';

interface AccordionSection {
  id: string;
  title: string;
  content: string;
  defaultOpen?: boolean;
}

interface AccordionData {
  sections: AccordionSection[];
}

@Component({
  selector: 'ai-structured-accordion',
  standalone: true,
  imports: [CommonModule, NzCollapseModule],
  template: `
    <nz-collapse class="accordion" *ngIf="data?.sections?.length" [nzBordered]="false">
      <nz-collapse-panel
        *ngFor="let s of data.sections; let i = index"
        [nzHeader]="s.title"
        [nzActive]="openState[i]"
        (nzActiveChange)="openState[i] = $event">
        <div class="section-content">{{ s.content }}</div>
      </nz-collapse-panel>
    </nz-collapse>
  `,
  styles: [`
    :host ::ng-deep .accordion.ant-collapse {
      background: transparent; border: 0;
    }
    :host ::ng-deep .accordion .ant-collapse-item {
      background: #fff; margin-bottom: 6px;
      border: 1px solid #f0f0f0; border-radius: 8px !important;
      overflow: hidden;
    }
    :host ::ng-deep .accordion .ant-collapse-header {
      font-size: 13px; font-weight: 600; color: #333;
      padding: 10px 14px !important;
      transition: background-color 0.15s ease;
    }
    :host ::ng-deep .accordion .ant-collapse-header:hover {
      background: #fafafa;
    }
    :host ::ng-deep .accordion .ant-collapse-item-active .ant-collapse-header {
      background: #fdf2f8; color: #e61982;
    }
    :host ::ng-deep .accordion .ant-collapse-content {
      background: #fff; border-top: 1px solid #f5f5f5;
    }
    :host ::ng-deep .accordion .ant-collapse-content-box {
      padding: 10px 14px !important;
    }
    .section-content {
      font-size: 12px; color: #555; line-height: 1.6;
      white-space: pre-wrap; word-break: break-word;
    }
  `],
})
export class AiStructuredAccordionComponent implements OnChanges {
  @Input() data!: AccordionData;
  openState: boolean[] = [];

  ngOnChanges(): void {
    this.openState = (this.data?.sections || []).map(s => !!s.defaultOpen);
  }
}
