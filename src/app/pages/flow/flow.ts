import { AfterViewInit, Component, ElementRef, inject, ViewChild } from '@angular/core';
import { Connection, ConnectionSettings, Edge, NodeChange, Vflow } from 'ngx-vflow';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { CommonModule } from '@angular/common';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { DragDropModule } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-flow',
  imports: [
    Vflow,
    NzIconModule,
    CommonModule,
    DragDropModule
/*     NzSelectModule,
    NzPopoverModule */
  ],
  templateUrl: './flow.html',
  styleUrl: './flow.scss'
})
export class Flow implements AfterViewInit {
/*   viewportService = inject(ViewportService);
 */@ViewChild('flow') flow!: any;
  @ViewChild('targetList', {static: false}) dropZone!: any;

  selection_item: any = null

  public nodes: any[] = [
    {
      id: '1',
      point: { x: 500, y: 150 },
      type: 'html-template',
      data: {
        type: 'start',
        connector: 'start',
      },
    },
    {
      id: '2',
      point: { x: 500, y: 350 },
      type: 'html-template',
      data: {
        type: 'condition',
        input: 'condition_1',
        output_1: 'condition_2',
        output_2: 'condition_2_2',

      },
    },
    {
      id: '3',
      point: { x: 300, y: 600 },
      type: 'html-template',
      data: {
        type: 'action',
        input: 'action_1_1',
        output: 'action_1_2',
      },
    },
    {
      id: '4',
      point: { x: 700, y: 600 },
      type: 'html-template',
      data: {
        type: 'action',
        input: 'action_2_1',
        output: 'action_2_2',
      },
    },
    {
      id: '5',
      point: { x: 500, y: 800 },
      type: 'html-template',
      data: {
        type: 'mail',
        input: 'mail_1',
        output: 'mail_2',

      },
    },

    {
      id: '6',
      point: { x: 500, y: 1000 },
      type: 'html-template',
      data: {
        type: 'loop',
        input: 'mail_1_7',
        start_loop_output: 'start_loop_output_1',
        end_loop_output: 'end_loop_output',
        output: 'end_s'
      },
    },

    {
      id: '7',
      point: { x: 300, y: 1200 },
      type: 'html-template',
      data: {
        type: 'mail',
        input: 'mail_1_7',
        output: 'mail_2_7',

      },
    },
    {
      id: '8',
      point: { x: 500, y: 1350 },
      type: 'html-template',
      data: {
        type: 'pdf',
        input: 'mail_1_7',
        output: 'mail_2_7',

      },
    },
  ];

  public edges: Edge[] = [
    {
      "id": "1 -> 2startcondition_1",
      "markers": {
        "end": {
          "type": "arrow-closed"
        }
      },
      "source": "1",
      "target": "2",
      "sourceHandle": "start",
      "targetHandle": "condition_1"
    },
    {
      "id": "2 -> 4condition_2_2",
      "markers": {
        "end": {
          "type": "arrow-closed"
        }
      },
      "source": "2",
      "target": "4",
      "sourceHandle": "condition_2_2"
    },
    {
      "id": "2 -> 3condition_2",
      "markers": {
        "end": {
          "type": "arrow-closed"
        }
      },
      "source": "2",
      "target": "3",
      "sourceHandle": "condition_2"
    },
    {
      "id": "3 -> 5",
      "markers": {
        "end": {
          "type": "arrow-closed"
        }
      },
      "source": "3",
      "target": "5"
    },
    {
      "id": "4 -> 5",
      "markers": {
        "end": {
          "type": "arrow-closed"
        }
      },
      "source": "4",
      "target": "5"
    },
    {
      "id": "5 -> 6",
      "markers": {
        "end": {
          "type": "arrow-closed"
        }
      },
      "source": "5",
      "target": "6",
      "targetHandle": "mail_1_7"
    },
    {
      "id": "6 -> 7",
      "markers": {
        "end": {
          "type": "arrow-closed"
        }
      },
      "source": "6",
      "target": "7",
      "sourceHandle": "start_loop_output_1",
    },
    {
      "id": "7 -> 6",
      "markers": {
        "end": {
          "type": "arrow-closed"
        }
      },
      "source": "7",
      "target": "6",
      // "sourceHandle": "end_loop_output",
      "targetHandle": "end_loop_output"
    },
    {
      "id": "6 -> 8end_s",
      "markers": {
        "end": {
          "type": "arrow-closed"
        }
      },
      "source": "6",
      "target": "8",
      "sourceHandle": "end_s"
    }
  ]

  public connectionSettings: ConnectionSettings = {
    /*     validator: (connection) => {
          return connection.target === '2' && connection.targetHandle === 'input1';
        }, */
  };


  ngAfterViewInit() {
    // Délai pour s'assurer que les entités sont bien rendues
    setTimeout(() => {
      this.centerView();
    }, 10);
  }

  centerView() {
    console.log(this.flow)
    this.flow.viewportService.fitView({
      duration: 300,       // ms pour une animation fluide
      padding: 0.5,        // entre 0 et 1 (plus c’est haut, moins ça zoom)
      minZoom: 0.1,        // empêche de trop zoomer
      maxZoom: 0.3         // empêche de trop dézoomer
    });
  }

    onExternalDrop(event: any) {
      console.log("OK",event, this.dropZone)
          // Récupère les coordonnées souris depuis l'événement natif
    const mouseEvent = event.event as MouseEvent;

  
    // Utilise directement l'élément cible pour récupérer les coordonnées
    const dropZoneRect = this.dropZone.element.nativeElement.getBoundingClientRect();

    // coordonnées écran → coordonnées relatives au composant
    const relative = {
      x: mouseEvent.clientX - dropZoneRect.left,
      y: mouseEvent.clientY - dropZoneRect.top,
    };

    // Récupérer le viewport (zoom et offset)
    const viewport = this.flow.viewportService.readableViewport();
    console.log(viewport)
    const scale = viewport.zoom; // Zoom actuel
    const offsetX = viewport.x;   // Offset horizontal
    const offsetY = viewport.y;   // Offset vertical

    // Ajuster les coordonnées en tenant compte du zoom et offset
    const positionInFlow = {
      x: ((relative.x - offsetX) / scale)-(250/2),
      y: (relative.y - offsetY) / scale-50
    };

    // Ajouter le nouveau nœud précisément au bon endroit
    const newNode = {
      id: 'node_' + Date.now(),
      type: "html-template",
      label: event.item.data.label,
      point: /* {x: 800, y: 1400}, // */positionInFlow, 
      data: event.item.data
    };
//this.nodes = this.nodes.concat(newNode); // méthode alternative safe
this.nodes = [...this.nodes, newNode];
    console.log(this.dropZone.element.nativeElement.getBoundingClientRect())
 /*    const position = this.flow.project({ x: event.dropPoint.x, y: event.dropPoint.y });

    const newNode = {
      id: this.generateId(),
      type: event.item.data.type,
      label: event.item.data.label,
      position,
    };

    this.nodes = [...this.nodes, newNode]; */
  }

  onDragEnter(event: any) {
  //event.preventDefault();
  console.log('🔵 Élément entré dans la zone');
}

onDragLeave(event: any) {
 // event.preventDefault();
  console.log('🔴 Élément sorti de la zone');
}

onDragOver(event: any) {
  event.preventDefault(); // Obligatoire pour que les autres events fonctionnent
}

  selectItem(changes: any) {
    if (this.selection_item && this.selection_item.id == changes.id) {
      this.selection_item = null
    }
    else
      this.selection_item = changes
  }

  public createEdge({ source, target, sourceHandle, targetHandle }: Connection) {
    console.log(target, source, this.edges)
    this.edges = [
      ...this.edges,
      {
        id: `${source} -> ${target}${sourceHandle ?? ''}${targetHandle ?? ''}`,
        markers: {
          /*    start: { type: null }, */
          end: { type: 'arrow-closed' },
        },
        source,
        target,
        sourceHandle,
        targetHandle,
      },
    ];
  }
}
