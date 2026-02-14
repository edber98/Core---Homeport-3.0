import { Component, ElementRef, ViewChild, ChangeDetectorRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { AiService, AiStreamEvent } from './ai.service';
import { AiMessageComponent } from './ai-message.component';
import { AiQuestionComponent } from './ai-question.component';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const TOOL_LABELS: Record<string, string> = {
  search_tools: 'Recherche d\'outils', get_tool_details: 'Détails outil', execute_tool: 'Exécution',
  list_providers: 'Providers', ask_user: 'Question', search_workflows: 'Recherche workflows',
  run_workflow: 'Lancement workflow', save_memory: 'Mémoire', get_memory: 'Mémoire',
  create_flow: 'Création flow', list_graph: 'Graphe', get_templates: 'Templates',
  get_template_details: 'Détails template', ensure_start: 'Démarrage', add_node: 'Ajout noeud',
  remove_node: 'Suppression', replace_node: 'Remplacement', connect_nodes: 'Connexion',
  disconnect_nodes: 'Déconnexion', connect_by_output_name: 'Connexion sortie',
  get_output_options: 'Sorties', set_node_args: 'Config args', set_node_description: 'Description',
  validate_flow: 'Validation', auto_layout: 'Layout', save_flow: 'Sauvegarde',
  create_start_form: 'Formulaire start', propose_context_mapping: 'Mapping',
  get_node_schema: 'Schéma noeud', get_node_info: 'Info noeud', list_predecessors: 'Prédécesseurs',
  get_scenarios: 'Scénarios', get_msgin_preview: 'Aperçu msgIn',
  get_form_schema: 'Schéma form', set_form_schema: 'MAJ schéma', add_field: 'Ajout champ',
  update_field: 'Modif champ', remove_field: 'Suppr champ', create_form: 'Création form',
  save_form: 'Sauvegarde form', get_output_schema: 'Schéma sortie', build_schema: 'Construction schéma',
};

interface StreamSegment {
  type: 'text' | 'tools';
  html?: string;        // rendered markdown HTML for text segments
  rawText?: string;      // raw text for accumulation
  tools?: StreamTool[];  // tools in a tools segment
}

interface StreamTool {
  id: string; name: string; status: 'running' | 'success' | 'error';
  duration?: number; args?: any; result?: any;
}

@Component({
  selector: 'ai-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, NzInputModule, NzButtonModule, NzIconModule, NzEmptyModule, NzTagModule, NzPopoverModule, AiMessageComponent, AiQuestionComponent],
  template: `
    <!-- Messages -->
    <div class="messages" #scrollContainer>
      <ng-container *ngIf="ai.messages().length === 0 && !ai.streaming()">
        <div class="empty">
          <nz-empty nzNotFoundContent="Commencez une conversation"></nz-empty>
        </div>
      </ng-container>

      <ai-message *ngFor="let msg of ai.messages()" [msg]="msg"></ai-message>

      <!-- Streaming: interleaved text + tools -->
      <div class="streaming-msg" *ngIf="segments.length">
        <div class="ai-msg assistant">
          <div class="avatar"><span nz-icon nzType="robot" nzTheme="outline"></span></div>
          <div class="body">
            <ng-container *ngFor="let seg of segments; let i = index; trackBy: trackSeg">
              <!-- Text segment -->
              <div class="content" *ngIf="seg.type === 'text' && seg.html"
                   [innerHTML]="seg.html"></div>

              <!-- Tools segment: reasoning block -->
              <div class="reasoning-block" *ngIf="seg.type === 'tools' && seg.tools?.length"
                   [class.reasoning-active]="isLastSegment(i) && ai.streaming()">
                <div class="reasoning-header">
                  <span nz-icon nzType="loading" nzTheme="outline" *ngIf="isLastSegment(i) && ai.streaming()"></span>
                  <span nz-icon nzType="bulb" nzTheme="outline" *ngIf="!isLastSegment(i) || !ai.streaming()"></span>
                  <span>Raisonnement</span>
                </div>
                <div class="reasoning-tools">
                  <ng-container *ngFor="let t of seg.tools; trackBy: trackTool">
                    <nz-tag
                      class="tool-tag"
                      [nzColor]="t.status === 'error' ? 'red' : t.status === 'running' ? 'processing' : 'geekblue'"
                      nz-popover
                      [nzPopoverContent]="popTpl"
                      nzPopoverTrigger="hover"
                      nzPopoverPlacement="topLeft">
                      <span nz-icon [nzType]="t.status === 'running' ? 'loading' : t.status === 'error' ? 'close-circle' : 'check-circle'" nzTheme="outline" [nzSpin]="t.status === 'running'" class="tag-icon"></span>
                      {{ toolLabel(t.name) }}
                      <span class="tag-extra" *ngIf="toolExtra(t)">{{ toolExtra(t) }}</span>
                      <span class="tag-dur" *ngIf="t.duration">{{ t.duration }}ms</span>
                    </nz-tag>
                    <ng-template #popTpl>
                      <div class="popover-content">
                        <div class="popover-section" *ngIf="t.args">
                          <div class="popover-label">Arguments</div>
                          <pre class="popover-json">{{ t.args | json }}</pre>
                        </div>
                        <div class="popover-section" *ngIf="t.result !== undefined && t.result !== null && t.status !== 'running'">
                          <div class="popover-label">Résultat</div>
                          <pre class="popover-json">{{ truncJson(t.result) }}</pre>
                        </div>
                      </div>
                    </ng-template>
                  </ng-container>
                </div>
              </div>
            </ng-container>
          </div>
        </div>
      </div>

      <!-- Pending question -->
      <ai-question
        *ngIf="ai.pendingQuestion()"
        [question]="ai.pendingQuestion()!"
        (answered)="onAnswer($event)">
      </ai-question>
    </div>

    <!-- Input -->
    <div class="input-bar">
      <nz-input-group [nzSuffix]="suffixTpl" nzSize="large">
        <input
          nz-input
          [(ngModel)]="inputText"
          placeholder="Écris un message..."
          (keydown.enter)="send()"
          [disabled]="ai.streaming()" />
      </nz-input-group>
      <ng-template #suffixTpl>
        <button nz-button nzType="text" nzSize="small" (click)="send()" [disabled]="ai.streaming() || !inputText.trim()">
          <span nz-icon [nzType]="ai.streaming() ? 'loading' : 'send'" nzTheme="outline"></span>
        </button>
      </ng-template>
    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; height: 100%; }
    .messages { flex: 1; overflow-y: auto; padding: 12px 16px; display: flex; flex-direction: column; gap: 4px; }
    .empty { flex: 1; display: flex; align-items: center; justify-content: center; }
    .streaming-msg .ai-msg { display: flex; gap: 10px; padding: 8px 0; }
    .streaming-msg .avatar { width: 32px; height: 32px; border-radius: 50%; background: #e6f4ff; color: #1677ff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 16px; }
    .streaming-msg .body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
    .streaming-msg .content { background: #f5f5f5; border-radius: 12px 12px 12px 2px; padding: 8px 14px; max-width: 85%; word-break: break-word; line-height: 1.5; }
    .streaming-msg .content :host ::ng-deep p { margin: 0 0 4px; }
    .streaming-msg .content :host ::ng-deep p:last-child { margin: 0; }
    .streaming-msg .content :host ::ng-deep code { background: #e8e8e8; padding: 1px 4px; border-radius: 3px; font-size: 13px; }
    .streaming-msg .content :host ::ng-deep pre { background: #e8e8e8; padding: 8px; border-radius: 6px; overflow-x: auto; }
    .reasoning-block { border-left: 3px solid #d9d9d9; padding: 6px 12px; margin: 4px 0; border-radius: 0 8px 8px 0; transition: opacity 0.3s ease, border-color 0.3s ease; max-width: 85%; }
    .reasoning-block.reasoning-active { border-left-color: #722ed1; opacity: 0.7; animation: pulse-reason 2s ease-in-out infinite; }
    .reasoning-block:not(.reasoning-active) { opacity: 0.5; }
    .reasoning-header { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #999; margin-bottom: 4px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.3px; }
    .reasoning-tools { display: flex; flex-wrap: wrap; gap: 4px; }
    @keyframes pulse-reason { 0%, 100% { opacity: 0.7; } 50% { opacity: 0.5; } }
    .tool-tags { display: flex; flex-wrap: wrap; gap: 4px; }
    .tool-tag { cursor: pointer; display: inline-flex; align-items: center; gap: 3px; font-size: 12px; margin: 0; }
    .tag-icon { font-size: 11px; }
    .tag-extra { opacity: 0.7; font-size: 11px; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .tag-dur { opacity: 0.6; font-size: 10px; margin-left: 2px; }
    .popover-content { max-height: 400px; overflow-y: auto; }
    .popover-section { margin-bottom: 8px; }
    .popover-section:last-child { margin-bottom: 0; }
    .popover-label { font-weight: 600; font-size: 12px; color: #666; margin-bottom: 4px; }
    .popover-json { font-size: 11px; background: #f5f5f5; padding: 6px 8px; border-radius: 4px; margin: 0; max-height: 200px; overflow: auto; white-space: pre-wrap; word-break: break-all; }
    .input-bar { padding: 8px 16px 12px; border-top: 1px solid #f0f0f0; }
  `]
})
export class AiChatComponent {
  inputText = '';
  segments: StreamSegment[] = [];
  @ViewChild('scrollContainer') scrollContainer?: ElementRef<HTMLDivElement>;

  private stopFn?: () => void;

  constructor(public ai: AiService, private cdr: ChangeDetectorRef) {
    effect(() => {
      this.ai.messages();
      this.scrollToBottom();
    });
  }

  async send() {
    const text = (this.inputText || '').trim();
    if (!text || this.ai.streaming()) return;
    this.inputText = '';
    this.segments = [];

    const { events$, stop } = await this.ai.quickSend(text);
    this.stopFn = stop;
    this.handleStream(events$);
  }

  onAnswer(answer: any) {
    this.segments = [];
    const result = this.ai.answerQuestion(answer);
    if (!result) return;
    const { events$, stop } = result;
    this.stopFn = stop;
    this.handleStream(events$);
  }

  private handleStream(events$: any) {
    events$.subscribe({
      next: (ev: AiStreamEvent) => {
        try {
          this.processStreamEvent(ev);
        } catch (e) {
          console.error('[ai-chat] stream event error:', e);
        }
        this.cdr.detectChanges();
        this.scrollToBottom();
      },
      error: (err: any) => {
        console.error('[ai-chat] stream error:', err);
        this.stopFn = undefined;
        this.cdr.detectChanges();
      },
      complete: () => {
        setTimeout(() => { this.segments = []; this.cdr.detectChanges(); }, 100);
        this.stopFn = undefined;
        this.cdr.detectChanges();
      },
    });
  }

  /** Process a single stream event — fully immutable segment updates */
  private processStreamEvent(ev: AiStreamEvent) {
    switch (ev.type) {
      case 'message': {
        const text = (ev as any).text || '';
        const last = this.segments[this.segments.length - 1];
        if (last && last.type === 'text') {
          // Append to existing text segment — create NEW object
          const raw = (last.rawText || '') + text;
          const updated: StreamSegment = { type: 'text', rawText: raw, html: this.renderMd(raw) };
          this.segments = [...this.segments.slice(0, -1), updated];
        } else {
          // New text segment
          this.segments = [...this.segments, { type: 'text', rawText: text, html: this.renderMd(text) }];
        }
        break;
      }
      case 'tool.start': {
        const tool: StreamTool = { id: (ev as any).id, name: (ev as any).name, status: 'running' };
        const last = this.segments[this.segments.length - 1];
        if (last && last.type === 'tools') {
          // Add tool to existing tools segment — create NEW object
          const updated: StreamSegment = { type: 'tools', tools: [...(last.tools || []), tool] };
          this.segments = [...this.segments.slice(0, -1), updated];
        } else {
          // New tools segment
          this.segments = [...this.segments, { type: 'tools', tools: [tool] }];
        }
        break;
      }
      case 'tool.end': {
        const evId = (ev as any).id;
        // Find and update the tool — create NEW segment + tools array
        this.segments = this.segments.map(seg => {
          if (seg.type !== 'tools' || !seg.tools) return seg;
          const idx = seg.tools.findIndex(t => t.id === evId);
          if (idx < 0) return seg;
          const updatedTools = seg.tools.map((t, i) =>
            i === idx ? {
              ...t,
              status: ((ev as any).status || 'success') as 'running' | 'success' | 'error',
              duration: (ev as any).duration,
              args: (ev as any).args,
              result: (ev as any).result,
            } : t
          );
          return { ...seg, tools: updatedTools };
        });
        break;
      }
      case 'done':
        setTimeout(() => { this.segments = []; this.cdr.detectChanges(); }, 100);
        break;
      // Forward builder-relevant events (patch, snapshot, args, desc, form.update)
      case 'patch':
      case 'snapshot':
      case 'args':
      case 'desc':
        console.log('[ai-chat] forwarding side event:', ev.type, ev);
        this.ai.emitSideEvent(ev);
        break;
    }
    // Forward form and flow events too
    if ((ev as any).type?.startsWith?.('form.') || (ev as any).type?.startsWith?.('flow.')) {
      console.log('[ai-chat] forwarding form/flow event:', (ev as any).type, ev);
      this.ai.emitSideEvent(ev);
    }
  }

  renderMd(src: string): string {
    try {
      const html = marked.parse(String(src || ''), { breaks: true, gfm: true }) as string;
      return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['p', 'strong', 'em', 'code', 'pre', 'a', 'ul', 'ol', 'li', 'br', 'span', 'b', 'i', 'h1', 'h2', 'h3', 'h4', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'blockquote', 'hr'],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
      });
    } catch { return src; }
  }

  // trackBy functions to avoid DOM thrashing during streaming
  trackSeg(i: number, seg: StreamSegment): string { return `${i}-${seg.type}`; }
  trackTool(i: number, t: StreamTool): string { return t.id; }

  isLastSegment(i: number): boolean { return i === this.segments.length - 1; }


  toolLabel(name: string): string {
    return TOOL_LABELS[name] || name;
  }

  toolExtra(t: StreamTool): string {
    if (!t.args) return '';
    if (t.name === 'execute_tool' && t.args.key) return t.args.key;
    if (t.name === 'search_tools' && t.args.query) return `"${t.args.query}"`;
    if (t.name === 'get_tool_details' && t.args.key) return t.args.key;
    if (t.name === 'get_template_details' && t.args.key) return t.args.key;
    if (t.name === 'add_node' && t.args.templateKey) return t.args.templateKey;
    if (t.name === 'connect_nodes') return `${t.args.sourceId?.slice(-8) || '?'} → ${t.args.targetId?.slice(-8) || '?'}`;
    if (t.name === 'get_templates' && t.args.query) return `"${t.args.query}"`;
    if (t.name === 'set_node_args' && t.args.nodeId) return t.args.nodeId.slice(-8);
    return '';
  }

  truncJson(val: any): string {
    try {
      const txt = JSON.stringify(val, null, 2);
      return txt.length > 800 ? txt.slice(0, 800) + '\n...' : txt;
    } catch { return String(val); }
  }

  private scrollToBottom() {
    try {
      const el = this.scrollContainer?.nativeElement;
      if (el) setTimeout(() => el.scrollTop = el.scrollHeight, 0);
    } catch {}
  }
}
