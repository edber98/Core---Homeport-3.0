import { Component } from '@angular/core';
import { Connection, ConnectionSettings, Edge, Vflow } from 'ngx-vflow';

@Component({
  selector: 'app-graphviz',
  imports: [Vflow],
  templateUrl: './graphviz.html',
  styleUrl: './graphviz.scss'
})
export class Graphviz {
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
}
