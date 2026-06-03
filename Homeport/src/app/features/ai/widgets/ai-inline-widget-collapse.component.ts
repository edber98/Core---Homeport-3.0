import { Component, Input, ChangeDetectionStrategy, OnChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { AiMessage } from '../ai.service';
import { AiStructuredMessageComponent } from '../structured/ai-structured-message.component';
import { AiCanvasHtmlComponent } from '../canvas-html/ai-canvas-html.component';
import { AiDiagramRendererComponent } from '../diagram/ai-diagram-renderer.component';
import { AiInlineImageComponent } from '../images/ai-inline-image.component';
import { AiInlineFileComponent } from '../files/ai-inline-file.component';

/**
 * Wrap n'importe quel widget (structured, canvas_html, diagram, image, file)
 * dans un collapse ouvrable. L'état initial vient de metadata.collapse.collapsed
 * (choix du LLM). L'utilisateur peut ouvrir/fermer à volonté.
 */
@Component({
  selector: 'ai-inline-widget-collapse',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    NzIconModule,
    AiStructuredMessageComponent,
    AiCanvasHtmlComponent,
    AiDiagramRendererComponent,
    AiInlineImageComponent,
    AiInlineFileComponent,
  ],
  template: `
    <ng-container *ngIf="widget">
      <!-- file_inline / image_inline : ces widgets ont DÉJÀ leur propre card
           autonome avec header + actions (download, fullscreen). Doubler avec
           un wrapper collapse → double encadrement moche. Rendu direct.        -->
      <ng-container *ngIf="isStandaloneWidget(); else withCollapse" [ngSwitch]="widget.metadata?.kind">
        <ai-inline-image
          *ngSwitchCase="'image_inline'"
          [data]="widget.metadata?.imageInline!">
        </ai-inline-image>
        <ai-inline-file
          *ngSwitchCase="'file_inline'"
          [data]="widget.metadata?.fileInline!">
        </ai-inline-file>
      </ng-container>

      <!-- Tous les autres widgets : wrapper collapse minimal et intégré -->
      <ng-template #withCollapse>
        <div class="inline-widget" [class.is-open]="isOpen()">
          <button type="button" class="header" (click)="toggle()">
            <span class="chevron">
              <span nz-icon [nzType]="isOpen() ? 'down' : 'right'" nzTheme="outline"></span>
            </span>
            <span class="kind-badge">{{ kindLabel() }}</span>
            <span class="title">{{ headerTitle() }}</span>
          </button>

          <div class="body" *ngIf="isOpen()" [ngSwitch]="widget.metadata?.kind">
            <ai-structured-message
              *ngSwitchCase="'structured'"
              [data]="widget.metadata?.structured!">
            </ai-structured-message>

            <ai-canvas-html
              *ngSwitchCase="'canvas_html'"
              [data]="widget.metadata?.canvasHtml!">
            </ai-canvas-html>

            <ai-diagram-renderer
              *ngSwitchCase="'diagram'"
              [mermaid]="widget.metadata?.diagram?.mermaid || ''"
              [title]="widget.metadata?.diagram?.title || ''">
            </ai-diagram-renderer>

            <div *ngSwitchDefault class="fallback">
              Widget type inconnu : {{ widget.metadata?.kind }}
            </div>
          </div>
        </div>
      </ng-template>
    </ng-container>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      min-width: 0;
      /* Animation d'arrivée : le widget pop-up depuis le texte. max-height + opacity
         + scale Y donne l'impression que ça "s'agrandit" à partir d'une ligne, intégré
         au flow du texte qui le précède. */
      animation: wc-grow-in 360ms cubic-bezier(0.22, 1, 0.36, 1);
      transform-origin: top center;
    }
    @keyframes wc-grow-in {
      0%   { opacity: 0; max-height: 0; transform: scaleY(0.6) translateY(-4px); }
      40%  { opacity: 1; max-height: 200px; }
      100% { opacity: 1; max-height: 1200px; transform: scaleY(1) translateY(0); }
    }

    .inline-widget {
      /* Plus de bordure dure : style "fold" qui s'intègre au texte qui l'entoure.
         Légère ombre interne pour signaler que c'est un bloc cliquable, sans
         séparation visuelle nette de la bulle parent. */
      margin: 8px 0;
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.025);
      overflow: hidden;
      max-width: 100%;
      transition: background 180ms ease, box-shadow 180ms ease;
    }
    .inline-widget:hover {
      background: rgba(0, 0, 0, 0.04);
    }
    .inline-widget.is-open {
      background: rgba(230, 25, 130, 0.04);
      box-shadow: 0 0 0 1px rgba(230, 25, 130, 0.10) inset;
    }
    .header {
      display: flex; align-items: center; gap: 8px;
      width: 100%; padding: 8px 12px;
      background: transparent; border: 0; cursor: pointer;
      text-align: left;
      font: inherit;
      color: inherit;
      transition: background 0.15s ease;
    }
    .header:hover { background: rgba(0, 0, 0, 0.03); }
    .is-open .header {
      background: transparent;
      border-bottom: 1px dashed rgba(230, 25, 130, 0.18);
    }
    .chevron {
      color: #8c8c8c;
      font-size: 11px;
      flex-shrink: 0;
      transition: transform 200ms ease, color 200ms ease;
    }
    .is-open .chevron {
      color: #e61982;
      transform: rotate(0);
    }
    .kind-badge {
      font-size: 10px; font-weight: 600;
      padding: 1px 7px; border-radius: 8px;
      background: rgba(0, 0, 0, 0.06); color: #595959;
      text-transform: uppercase; letter-spacing: 0.3px;
      flex-shrink: 0;
    }
    .is-open .kind-badge { background: rgba(230, 25, 130, 0.12); color: #e61982; }
    .title {
      font-size: 13px; font-weight: 500; color: inherit;
      flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      opacity: 0.85;
    }
    .body {
      padding: 10px 12px;
      animation: wc-body-fade 220ms ease-out;
    }
    @keyframes wc-body-fade {
      from { opacity: 0; transform: translateY(-2px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .fallback {
      padding: 8px; color: #ff4d4f; font-size: 12px;
      background: #fff2f0; border-radius: 6px;
    }
  `],
})
export class AiInlineWidgetCollapseComponent implements OnChanges {
  @Input() widget!: AiMessage;

  isOpen = signal(true);

  /**
   * Pour les widgets "standalone" (file_inline, image_inline) qui ont déjà leur
   * propre card autonome avec header + actions, on n'enveloppe PAS dans un
   * wrapper collapse → évite le double encadrement moche signalé par l'user.
   *
   * Les autres widgets (structured, diagram, canvas_html) gardent leur wrapper
   * collapse qui ajoute un header neutre + chevron pour replier.
   */
  isStandaloneWidget(): boolean {
    const k = this.widget?.metadata?.kind;
    return k === 'file_inline' || k === 'image_inline';
  }

  ngOnChanges(): void {
    // Initialise l'état d'ouverture :
    //   1. localStorage par widgetId si une préférence user existe (persistance recharge)
    //   2. sinon metadata.collapse.collapsed (choix initial du LLM)
    //   3. sinon ouvert par défaut
    const wid = this.widget?.metadata?.widgetId;
    const stored = wid ? this._loadLocalState(String(wid)) : null;
    if (stored !== null) {
      this.isOpen.set(stored);
      return;
    }
    const collapsed = this.widget?.metadata?.['collapse']?.collapsed === true;
    this.isOpen.set(!collapsed);
  }

  toggle(): void {
    const next = !this.isOpen();
    this.isOpen.set(next);
    // Persiste le choix user en localStorage pour le retrouver au refresh
    const wid = this.widget?.metadata?.widgetId;
    if (wid) this._saveLocalState(String(wid), next);
  }

  /** Clé localStorage stable par widgetId (clé globale, pas thread-scoped — un
   *  widgetId est censé être unique dans une conversation, et la convo est
   *  identifiée par l'id du widget). */
  private _storageKey(widgetId: string): string {
    return `kinn:ai:widget-open:${widgetId}`;
  }

  private _loadLocalState(widgetId: string): boolean | null {
    try {
      const raw = localStorage.getItem(this._storageKey(widgetId));
      if (raw === '1') return true;
      if (raw === '0') return false;
      return null;
    } catch { return null; }
  }

  private _saveLocalState(widgetId: string, isOpen: boolean): void {
    try {
      localStorage.setItem(this._storageKey(widgetId), isOpen ? '1' : '0');
    } catch { /* quota / privacy mode → silently ignore */ }
  }

  kindLabel(): string {
    const k = this.widget?.metadata?.kind;
    switch (k) {
      case 'structured': return 'Tableau';
      case 'canvas_html': return 'Canvas';
      case 'diagram': return 'Diagramme';
      case 'image_inline': return 'Image';
      case 'file_inline': return 'Fichier';
      default: return 'Widget';
    }
  }

  headerTitle(): string {
    const md = this.widget?.metadata;
    const custom = md?.['collapse']?.collapseTitle;
    if (custom) return String(custom);
    if (md?.kind === 'structured') return md.structured?.title || 'Contenu structuré';
    if (md?.kind === 'canvas_html') return md.canvasHtml?.title || 'Canvas interactif';
    if (md?.kind === 'diagram') return md.diagram?.title || 'Diagramme';
    if (md?.kind === 'image_inline') return md.imageInline?.caption || md.imageInline?.alt || 'Image';
    if (md?.kind === 'file_inline') return md.fileInline?.caption || md.fileInline?.name || 'Fichier';
    return this.widget?.content || 'Widget';
  }
}
