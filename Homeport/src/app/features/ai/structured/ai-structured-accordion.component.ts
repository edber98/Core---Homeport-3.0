import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { marked } from 'marked';

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
        <div class="section-content md" [innerHTML]="renderedHtml[i]"></div>
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
      word-break: break-word;
    }
    .section-content.md :first-child { margin-top: 0; }
    .section-content.md :last-child { margin-bottom: 0; }
    .section-content.md p { margin: 0 0 8px; }
    .section-content.md ul, .section-content.md ol { margin: 0 0 8px; padding-left: 20px; }
    .section-content.md li { margin: 2px 0; }
    .section-content.md code {
      background: #f5f5f5; padding: 1px 5px; border-radius: 3px;
      font-size: 11px; font-family: 'SFMono-Regular', Consolas, monospace;
    }
    .section-content.md pre {
      background: #f8f8f8; padding: 8px 10px; border-radius: 6px;
      overflow-x: auto; margin: 6px 0;
    }
    .section-content.md pre code { background: transparent; padding: 0; }
    .section-content.md h1, .section-content.md h2, .section-content.md h3,
    .section-content.md h4 { margin: 10px 0 6px; font-weight: 600; color: #333; }
    .section-content.md h1 { font-size: 14px; }
    .section-content.md h2 { font-size: 13px; }
    .section-content.md h3, .section-content.md h4 { font-size: 12px; }
    .section-content.md table {
      border-collapse: collapse; margin: 6px 0; width: 100%; font-size: 11px;
    }
    .section-content.md th, .section-content.md td {
      border: 1px solid #eee; padding: 4px 8px; text-align: left;
    }
    .section-content.md th { background: #fafafa; font-weight: 600; }
    .section-content.md a { color: #e61982; text-decoration: none; }
    .section-content.md a:hover { text-decoration: underline; }
    .section-content.md blockquote {
      margin: 6px 0; padding: 4px 10px; border-left: 3px solid #f0f0f0;
      color: #777;
    }
    .section-content.md strong { font-weight: 600; color: #333; }
  `],
})
export class AiStructuredAccordionComponent implements OnChanges {
  @Input() data!: AccordionData;
  openState: boolean[] = [];
  renderedHtml: string[] = [];

  ngOnChanges(): void {
    const sections = this.data?.sections || [];
    this.openState = sections.map(s => !!s.defaultOpen);
    this.renderedHtml = sections.map(s => {
      try {
        return marked.parse(s.content || '', { async: false, breaks: true, gfm: true }) as string;
      } catch {
        return String(s.content || '');
      }
    });
  }
}
