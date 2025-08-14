import { Component } from '@angular/core';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTypographyModule } from 'ng-zorro-antd/typography';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { Connection, ConnectionSettings, Edge, Vflow } from 'ngx-vflow';
import { NzFlexModule } from 'ng-zorro-antd/flex';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { CommonModule, JsonPipe } from '@angular/common';
import {
  trigger,
  transition,
  style,
  animate,
} from '@angular/animations';

import { NzInputModule } from 'ng-zorro-antd/input';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ExpressionEditorComponent } from '../../../../modules/expression-editor/expression-editor';
import { FieldTagsComponent, ExprTag } from '../../components/field-tags/field-tags';




@Component({
  selector: 'app-dashboard-stats',
  imports: [
    CommonModule,
    NzTableModule,
    NzDividerModule,
    NzListModule,
    NzTypographyModule,
    NzMenuModule,
    NzFlexModule,
    NzButtonModule,
    NzIconModule,
    NzInputModule,
    FormsModule,
    ReactiveFormsModule,
    Vflow,
    ExpressionEditorComponent,
    FieldTagsComponent
  ],
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateX(0)', opacity: 1 })),
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ transform: 'translateX(100%)', opacity: 0 })),
      ]),
    ])
  ],
  templateUrl: './dashboard-stats.html',
  styleUrl: './dashboard-stats.scss'
})
export class DashboardStats {

// any.component.ts
expr = '{{ json.id }}';
ctx = {
  json: { id: 'abc-123', user: { name: 'Alice', email: 'a@example.com' } },
  env: { NODE_ENV: 'development' },
  node: { 'Fetch User': { data: { id: 42 } } },
  now: new Date(),
};

// Exemple de fonctions suggérées avec arguments (facultatif)
fnSpecs = {
/*   add: { args: ['a', 'b'] },
  toUpper: { args: ['text'] }, */
};

 ctx_var:any = {
  user: {
    firstName: 'Alice',
    lastName : 'Dupont',
    address  : {
      city   : 'Paris',
      country: 'France'
    }
  },
  order: {
    id   : 9876,
    total: 123.45
  },
  date: '31/07/2025'
};

tags: ExprTag[] = [];



  public nodes: any[] = [
    {
      id: '1',
      point: { x: 0, y: 150 },
      type: 'html-template',
      data: {
        type: 'output',
        output1: 'output1',
        output2: 'output2',
      },
    },
    {
      id: '2',
      point: { x: 550, y: 100 },
      type: 'html-template',
      data: {
        type: 'input',
        input1: 'input1',
        input2: 'input2',
      },
    },
  ];

  public edges: Edge[] = [];

  selection_item: any = null


  metadatas: any = [
    {
      _id: '123456789',
      name: "Product",
      type: 'html-template',
      label: "{{name}}",
      data: 'ds',
      point: { x: 0, y: 100 },
      fields: [{
        name: "name",
        label: "Nom",
        type: "String",
        required: true
      }]
    },
    {
      _id: '234567891',
      name: "StockMouvement",
      type: 'html-template',
      label: "{{name}}",
      point: { x: 550, y: 100 },
      fields: [{
        name: "name",
        label: "Nom",
        type: "String",
        required: true
      },
      {
        name: "label",
        label: "Label",
        type: "String",
        required: true
      }]
    }
  ]

  selectItem(changes: any) {
    console.log(changes)
    if (this.selection_item && this.selection_item._id == changes._id) {
      this.selection_item = null
    }
    else
      this.selection_item = changes
  }

  public connectionSettings: ConnectionSettings = {
    curve: 'smooth-step',
    validator: (connection) => {
      return connection.target === '2' && connection.targetHandle === 'input1';
    },
  };

  public createEdge({ source, target, sourceHandle, targetHandle }: Connection) {
    this.edges = [
      ...this.edges,
      {
        id: `${source} -> ${target}${sourceHandle ?? ''}${targetHandle ?? ''}`,
        markers: {
          start: { type: 'arrow-closed' },
          end: { type: 'arrow-closed' },
        },
        source,
        target,
        curve: 'smooth-step',
        sourceHandle,
        targetHandle,
      },
    ];
  }

  constructor() {
    // Build tags from ctx.json by default (path starts with 'json')
    this.tags = flattenToTags(this.ctx.json ?? {}, 'json');
  }
}

function flattenToTags(obj: any, prefix: string): ExprTag[] {
  const out: ExprTag[] = [];
  const walk = (o: any, path: string) => {
    if (o && typeof o === 'object' && !Array.isArray(o)) {
      for (const k of Object.keys(o)) walk(o[k], path ? `${path}.${k}` : k);
    } else if (Array.isArray(o)) {
      // suggest first element index as entry point
      walk(o[0], `${path}[0]`);
    } else {
      const name = path.split('.').pop() || path;
      out.push({ path, name });
    }
  };
  walk(obj, prefix);
  return out;
}
