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
  save_form: 'Sauvegarde form', get_output_schema: 'Schéma sortie',
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
            <ng-container *ngFor="let seg of segments">
              <!-- Text segment -->
              <div class="content" *ngIf="seg.type === 'text' && seg.html" [innerHTML]="seg.html"></div>

              <!-- Tools segment -->
              <div class="tool-tags" *ngIf="seg.type === 'tools' && seg.tools?.length">
                <ng-container *ngFor="let t of seg.tools">
                  <nz-tag
                    class="tool-tag"
                    [nzColor]="t.status === 'error' ? 'red' : t.status === 'running' ? 'processing' : 'geekblue'"
                    nz-popover
                    [nzPopoverContent]="popTpl"
                    nzPopoverTrigger="hover"
                    nzPopoverPlacement="topLeft"
                    [nzPopoverOverlayStyle]="{ maxWidth: '500px' }">
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
    .tool-tags { display: flex; flex-wrap: wrap; gap: 4px; max-width: 85%; }
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
        switch (ev.type) {
          case 'message': {
            const text = (ev as any).text || '';
            // Get or create a text segment at the end
            let last = this.segments[this.segments.length - 1];
            if (!last || last.type !== 'text') {
              last = { type: 'text', rawText: '', html: '' };
              this.segments = [...this.segments, last];
            }
            last.rawText = (last.rawText || '') + text;
            last.html = this.renderMd(last.rawText);
            // Force new ref for change detection
            this.segments = [...this.segments];
            break;
          }
          case 'tool.start': {
            const tool: StreamTool = { id: (ev as any).id, name: (ev as any).name, status: 'running' };
            let last = this.segments[this.segments.length - 1];
            if (!last || last.type !== 'tools') {
              last = { type: 'tools', tools: [] };
              this.segments = [...this.segments, last];
            }
            last.tools = [...(last.tools || []), tool];
            this.segments = [...this.segments];
            break;
          }
          case 'tool.end': {
            // Find and update the tool in any tools segment
            for (const seg of this.segments) {
              if (seg.type !== 'tools' || !seg.tools) continue;
              const idx = seg.tools.findIndex(t => t.id === (ev as any).id);
              if (idx >= 0) {
                seg.tools[idx] = {
                  ...seg.tools[idx],
                  status: (ev as any).status || 'success',
                  duration: (ev as any).duration,
                  args: (ev as any).args,
                  result: (ev as any).result,
                };
                seg.tools = [...seg.tools];
                break;
              }
            }
            this.segments = [...this.segments];
            break;
          }
          case 'done':
            // Delay clearing so message transition is smooth
            setTimeout(() => { this.segments = []; this.cdr.detectChanges(); }, 100);
            break;
        }
        this.cdr.detectChanges();
        this.scrollToBottom();
      },
      complete: () => {
        setTimeout(() => { this.segments = []; this.cdr.detectChanges(); }, 100);
        this.stopFn = undefined;
        this.cdr.detectChanges();
      },
    });
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
