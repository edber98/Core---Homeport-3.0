import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'demo-expression-eval',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="dee">
      <div class="dee-instruction">
        Écrivez une expression pour extraire une valeur du contexte JSON. Utilisez la syntaxe <code>{{ '{{ }}' }}</code>.
      </div>
      <div class="dee-layout">
        <!-- Context -->
        <div class="dee-panel dee-context">
          <div class="dee-panel-title">Contexte</div>
          <pre class="dee-json">{{ contextJson }}</pre>
        </div>

        <!-- Expression input -->
        <div class="dee-panel dee-input-panel">
          <div class="dee-panel-title">Expression</div>
          <input class="dee-input" [(ngModel)]="expression" placeholder="Ex: {{ '{{ data.user.name }}' }}" (ngModelChange)="evaluate()" />
          <div class="dee-examples">
            <div class="dee-examples-title">Essayez :</div>
            <button *ngFor="let ex of examples" class="dee-example-btn" (click)="expression = ex; evaluate()">{{ ex }}</button>
          </div>
        </div>

        <!-- Result -->
        <div class="dee-panel dee-result-panel">
          <div class="dee-panel-title">Résultat</div>
          <pre class="dee-result" [class.dee-result-error]="resultError">{{ resultDisplay }}</pre>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dee { padding: 16px; height: 100%; display: flex; flex-direction: column; }
    .dee-instruction { font-size: 14px; color: #666; margin-bottom: 14px; line-height: 1.6; }
    .dee-instruction code { background: #f5f5f5; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 13px; }

    .dee-layout { display: flex; gap: 12px; flex: 1; min-height: 0; }

    .dee-panel { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .dee-panel-title { font-size: 11px; font-weight: 600; color: #999; text-transform: uppercase; margin-bottom: 6px; }

    .dee-json {
      flex: 1; background: #1e1e1e; color: #d4d4d4; padding: 12px; border-radius: 8px;
      font-size: 12px; font-family: 'SFMono-Regular', Consolas, monospace;
      overflow: auto; margin: 0;
    }

    .dee-input {
      width: 100%; padding: 10px 12px; border: 2px solid #d9d9d9; border-radius: 8px;
      font-family: 'SFMono-Regular', Consolas, monospace; font-size: 14px;
      outline: none; transition: border-color 0.2s; box-sizing: border-box;
    }
    .dee-input:focus { border-color: #e61982; }

    .dee-examples { margin-top: 10px; }
    .dee-examples-title { font-size: 12px; color: #999; margin-bottom: 6px; }
    .dee-example-btn {
      display: inline-block; padding: 4px 10px; margin: 0 4px 4px 0;
      border: 1px solid #d9d9d9; border-radius: 4px; background: #fff;
      font-family: monospace; font-size: 12px; cursor: pointer;
      transition: all 0.15s;
    }
    .dee-example-btn:hover { border-color: #e61982; color: #e61982; }

    .dee-result {
      flex: 1; background: #f6ffed; border: 1px solid #b7eb8f; border-radius: 8px;
      padding: 12px; font-family: 'SFMono-Regular', Consolas, monospace;
      font-size: 14px; color: #52c41a; margin: 0; overflow: auto; white-space: pre-wrap;
    }
    .dee-result-error { background: #fff2f0; border-color: #ffa39e; color: #ff4d4f; }

    @media (max-width: 768px) {
      .dee-layout { flex-direction: column; }
      .dee-json { max-height: 100px; }
    }
  `]
})
export class DemoExpressionEvalComponent {
  context: Record<string, any> = {
    data: {
      user: { name: 'Alice Dupont', email: 'alice@example.com', age: 28 },
      items: ['Laptop', 'Phone', 'Tablet'],
      total: 2450.90,
    },
  };

  contextJson = JSON.stringify(this.context, null, 2);

  expression = '';
  resultDisplay = '';
  resultError = false;

  examples = [
    '{{ data.user.name }}',
    '{{ data.total }}',
    '{{ data.items[0] }}',
    '{{ data.items.length }}',
  ];

  evaluate(): void {
    const expr = this.expression.trim();
    if (!expr) {
      this.resultDisplay = '';
      this.resultError = false;
      return;
    }

    // Extract expression from {{ }}
    let path = expr;
    const match = expr.match(/^\{\{\s*(.*?)\s*\}\}$/);
    if (match) path = match[1];

    try {
      const result = this.resolvePath(path);
      if (result === undefined) {
        this.resultDisplay = 'undefined';
        this.resultError = true;
      } else {
        this.resultDisplay = typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result);
        this.resultError = false;
      }
    } catch (e: any) {
      this.resultDisplay = e.message || 'Erreur';
      this.resultError = true;
    }
  }

  private resolvePath(path: string): any {
    // Simple path resolver: data.user.name, data.items[0], data.items.length
    const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
    let current: any = this.context;
    for (const part of parts) {
      if (part === '') continue;
      if (current == null) throw new Error(`Impossible d'accéder à « ${part} » sur une valeur nulle`);
      current = current[part];
    }
    return current;
  }
}
