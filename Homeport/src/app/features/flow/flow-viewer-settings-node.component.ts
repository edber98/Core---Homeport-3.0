import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FlowViewerComponent } from './flow-viewer.component';
import { Edge, ConnectionSettings } from 'ngx-vflow';

// Initial duplication of FlowViewer for node-settings use cases.
// For now, delegates to FlowViewer; will diverge later.
@Component({
  selector: 'flow-viewer-settings-node',
  standalone: true,
  imports: [CommonModule, FlowViewerComponent],
  template: `
    <flow-viewer
      [nodes]="nodes" [edges]="edges" [background]="background"
      [connectionSettings]="connectionSettings" [useStorage]="useStorage"
      [showBottomBar]="showBottomBar" [showRun]="showRun" [showSave]="showSave"
      [showCenterFlow]="showCenterFlow" [meta]="meta" [showExecBadges]="false" [selectedNodeId]="selectedNodeId" [dimInactive]="dimInactive" [simOutputPreview]="simOutputPreview" [focusNodeIds]="focusNodeIds" [autoFitOnInit]="autoFitOnInit" [centerRequest]="centerRequest" [showDescriptions]="false">
    </flow-viewer>
  `
})
export class FlowViewerSettingsNodeComponent {
  @Input() nodes: any[] = [];
  @Input() edges: Edge[] = [] as any;
  @Input() background: any = { type: 'dots', gap: 25, color: '#e8e8e8', size: 1.6, backgroundColor: '#f8f8f8' };
  @Input() connectionSettings: ConnectionSettings = { type: 'template' } as any;
  @Input() useStorage = false;
  @Input() showBottomBar = true;
  @Input() showRun = false;
  @Input() showSave = false;
  @Input() showCenterFlow = true;
  @Input() meta: any = null;
  @Input() selectedNodeId: string | null = null;
  // Dim nodes/edges not highlighted (default true for settings viewer)
  @Input() dimInactive: boolean = true;
  // For settings mode: preview map of outputs per node (1-level only)
  @Input() simOutputPreview: { [nodeId: string]: Array<{ id: string; name: string; type: string; children?: Array<{ id: string; name: string; type: string }> }> } | null = null;
  // When provided, the viewer center action will focus only these node ids
  @Input() focusNodeIds: string[] | null = null;
  // Control initial auto-fit (disable in settings to avoid recenter on mount)
  @Input() autoFitOnInit: boolean = true;
  // Programmatic center trigger (incrementing number)
  @Input() centerRequest: number = 0;
}
