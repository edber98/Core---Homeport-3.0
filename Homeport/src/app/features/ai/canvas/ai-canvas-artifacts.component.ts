import { ChangeDetectionStrategy, Component, Input, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { AiService, AiMessage } from '../ai.service';

interface Artifact {
  id: string;               // _id of message
  kind: string;             // canvas_html | diagram | image_inline | structured | plan_proposal
  icon: string;
  label: string;
  title: string;
  preview?: string;         // extrait ou URL
  createdAt?: string;
}

/**
 * Canvas "Artifacts" : liste tous les widgets produits dans le thread
 * (canvas HTML, diagrammes, images, plans, affichages structurés).
 * Clic → scroll vers le message dans le chat.
 */
@Component({
  selector: 'ai-canvas-artifacts',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NzIconModule, NzTagModule, NzEmptyModule, NzButtonModule, NzToolTipModule],
  template: `
    <div class="art-wrap" *ngIf="artifacts().length; else empty">
      <div class="art-head">
        <span>{{ artifacts().length }} artefact{{ artifacts().length > 1 ? 's' : '' }}</span>
      </div>
      <div class="art-list">
        <div *ngFor="let a of artifacts()" class="art-card" (click)="scrollToMessage(a.id)">
          <div class="art-top">
            <span class="art-icon">{{ a.icon }}</span>
            <span class="art-label">{{ a.label }}</span>
            <span class="art-spacer"></span>
            <span class="art-date" *ngIf="a.createdAt">{{ formatDate(a.createdAt) }}</span>
          </div>
          <div class="art-title" [nz-tooltip]="a.title">{{ a.title }}</div>
          <div class="art-preview" *ngIf="a.preview">{{ a.preview }}</div>
        </div>
      </div>
    </div>
    <ng-template #empty>
      <div class="art-empty">
        <nz-empty nzNotFoundContent="Aucun artefact produit dans cette conversation.
Les diagrammes, canvas 3D, graphiques et images apparaissent ici."></nz-empty>
      </div>
    </ng-template>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; height: 100%; overflow: auto; }
    .art-wrap { padding: 10px 12px; }
    .art-head { font-size: 11px; color: #8c8c8c; text-transform: uppercase; letter-spacing: 0.5px; padding: 4px 4px 10px; }
    .art-list { display: flex; flex-direction: column; gap: 8px; }
    .art-card { background: #fff; border: 1px solid #f0f0f0; border-radius: 8px; padding: 10px 12px; cursor: pointer; transition: border-color .15s, box-shadow .15s; }
    .art-card:hover { border-color: #1890ff; box-shadow: 0 2px 6px rgba(24,144,255,0.12); }
    .art-top { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #595959; }
    .art-icon { font-size: 16px; }
    .art-label { text-transform: uppercase; font-weight: 600; letter-spacing: 0.3px; }
    .art-spacer { flex: 1; }
    .art-date { color: #bfbfbf; font-size: 11px; }
    .art-title { font-size: 13px; color: #262626; margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .art-preview { font-size: 11px; color: #8c8c8c; margin-top: 4px; line-height: 1.4; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
    .art-empty { display: flex; align-items: center; justify-content: center; height: 100%; padding: 40px 20px; white-space: pre-wrap; }
  `],
})
export class AiCanvasArtifactsComponent {
  @Input() threadId!: string;
  public ai = inject(AiService);

  artifacts = computed<Artifact[]>(() => {
    const msgs = this.ai.messages() || [];
    const out: Artifact[] = [];
    for (const m of msgs as any[]) {
      const kind = m?.metadata?.kind;
      if (!kind) continue;
      const id = m._id;
      if (!id) continue;
      const createdAt = m.createdAt || m.updatedAt;
      switch (kind) {
        case 'canvas_html':
          out.push({
            id, kind, icon: this.iconFor(m.metadata.canvasHtml?.type || 'demo'),
            label: 'Canvas',
            title: m.metadata.canvasHtml?.title || m.content || 'Canvas interactif',
            preview: m.metadata.canvasHtml?.description || '',
            createdAt,
          });
          break;
        case 'diagram':
          out.push({
            id, kind, icon: '📊',
            label: m.metadata.diagram?.type || 'Diagramme',
            title: m.metadata.diagram?.title || 'Diagramme',
            preview: (m.metadata.diagram?.mermaid || '').slice(0, 140),
            createdAt,
          });
          break;
        case 'image_inline':
          out.push({
            id, kind, icon: '🖼️', label: 'Image',
            title: m.metadata.imageInline?.caption || m.metadata.imageInline?.alt || 'Image',
            preview: m.metadata.imageInline?.url || m.metadata.imageInline?.fileId || '',
            createdAt,
          });
          break;
        case 'structured':
          out.push({
            id, kind, icon: '📋',
            label: m.metadata.structured?.layout || 'Structuré',
            title: m.metadata.structured?.title || m.content || 'Affichage structuré',
            createdAt,
          });
          break;
        case 'plan_proposal':
          out.push({
            id, kind, icon: '📝', label: 'Plan',
            title: m.metadata.planProposal?.title || 'Plan d\'action',
            preview: `${m.metadata.planProposal?.steps?.length || 0} étape(s)`,
            createdAt,
          });
          break;
      }
    }
    return out.reverse(); // plus récents en haut
  });

  private iconFor(type: string): string {
    switch (type) {
      case '3d': return '🧊';
      case '2d': return '🎨';
      case 'animation': return '✨';
      default: return '🧪';
    }
  }

  formatDate(iso: string): string {
    try {
      const d = new Date(iso);
      const now = new Date();
      if (d.toDateString() === now.toDateString()) {
        return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      }
      return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    } catch { return ''; }
  }

  scrollToMessage(id: string) {
    try {
      const el = document.querySelector(`[data-message-id="${id}"]`) as HTMLElement | null;
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('msg-flash');
        setTimeout(() => el.classList.remove('msg-flash'), 1200);
      }
    } catch {}
  }
}
