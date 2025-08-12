// src/app/template-editor.component.ts
import {
  Component, OnInit, Input, ElementRef, ViewChild, forwardRef,
  ChangeDetectionStrategy, ChangeDetectorRef, HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import nunjucks from 'nunjucks';

import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

// NG-ZORRO 18+ (compatible Angular 20)
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
@Component({
  standalone: true,
  selector: 'app-expression-editor-testing-component',
  imports: [
    CommonModule,
    NzCardModule,
    NzDropDownModule,
    NzButtonModule,
    NzMenuModule,
  
  ],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => ExpressionEditorTestingComponent),
    multi: true
  }],
  templateUrl: './expression-editor-testing-component.html',
  styleUrl: './expression-editor-testing-component.scss'
})
export class ExpressionEditorTestingComponent
  implements ControlValueAccessor, OnInit {

  //////////////////////////////////////////////////////////////////
  // ==== INPUTS ===================================================
  /** Objet de contexte : on en déduit automatiquement les variables. */
  @Input() context: any = {};
  /** Liste supplémentaire (ou totale) de variables ; si fourni, prioritaire. */
  @Input() variableList: string[] | null = null;
  /** Placeholder du textarea. */
  @Input() placeholder = 'Écrivez votre modèle …';

  //////////////////////////////////////////////////////////////////
  // ==== Vues & états internes ===================================
  @ViewChild('ta', { static: true }) textarea!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('hl', { static: true }) highlights!: ElementRef<HTMLDivElement>;

  value = '';                                        // modèle brut
  preview: SafeHtml = '';
  vars: string[] = [];                               // suggestions
  caret = { left: 0, bottom: 0 };                    // pos caret
  dropdownVisible = false;

  private regex = /{{\s*([\w.]+)\s*}}/g;

  constructor(private cd: ChangeDetectorRef,
    private san: DomSanitizer) { }

  //////////////////////////////////////////////////////////////////
  // ==== Angular lifecycle =======================================
  ngOnInit() { this.updateVarList(); }

  //////////////////////////////////////////////////////////////////
  // ==== ControlValueAccessor impl ===============================
  onChangeFn: (_: any) => void = () => { };
  onTouchedFn: () => void = () => { };
  writeValue(v: string): void {
    this.value = v ?? '';
    this.textarea.nativeElement.value = this.value;
    this.highlights.nativeElement.innerHTML =
      this.decorate(this.value) + '<br>';
    this.renderPreview();
  }
  registerOnChange(fn: any): void { this.onChangeFn = fn; }
  registerOnTouched(fn: any): void { this.onTouchedFn = fn; }
  setDisabledState(dis: boolean): void {
    this.textarea.nativeElement.disabled = dis;
  }

  //////////////////////////////////////////////////////////////////
  // ==== Handlers ================================================
  onInput() {
    this.value = this.textarea.nativeElement.value;
    this.onChangeFn(this.value);
    this.highlights.nativeElement.innerHTML =
      this.decorate(this.value) + '<br>';
    this.renderPreview();
    this.extractVars();
    this.cd.markForCheck();
  }

  updateCaretPos() {
    const ta = this.textarea.nativeElement;
    const { selectionStart } = ta;
    const div = document.createElement('div');
    div.style.cssText =
      `position:fixed;visibility:hidden;white-space:pre-wrap;
       font:14px/1.5 "SF Mono";padding:8px;border:1px solid`;
    div.textContent = ta.value.substring(0, selectionStart ?? 0);
    document.body.appendChild(div);
    const rect = div.getBoundingClientRect();
    document.body.removeChild(div);
    this.caret = rect;
    this.dropdownVisible = false;          // se rouvrira à l'insertion manuelle
  }

  insertVar(v: string) {
    const ta = this.textarea.nativeElement;
    const { selectionStart, selectionEnd } = ta;
    const before = ta.value.slice(0, selectionStart ?? 0);
    const after = ta.value.slice(selectionEnd ?? 0);
    const token = `{{ ${v} }}`;
    ta.value = before + token + after;
    ta.focus();
    ta.selectionStart = ta.selectionEnd = (before + token).length;
    this.dropdownVisible = false;
    this.onInput();                       // déclenche update
  }

  //////////////////////////////////////////////////////////////////
  // ==== Helpers =================================================
private decorate(txt: string) {
  return txt
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(this.regex, (_, v) => {
      const spaces = '&nbsp;'.repeat(v.length+4); // ou ' ' si ce n’est pas dans du HTML
      return `<mark class="nj-token">${spaces}</mark>`;
    });
}

  private renderPreview() {
    try {
      const html = nunjucks.renderString(
        this.value,
        this.context ?? {}
      );
      this.preview = this.san.bypassSecurityTrustHtml(html);
    } catch {
      this.preview = this.san.bypassSecurityTrustHtml(
        '<i style="color:#d92f2f">Erreur de rendu</i>'
      );
    }
  }

  private extractVars() {
    const found = new Set<string>();
    this.regex.lastIndex = 0;
    let m; while ((m = this.regex.exec(this.value))) found.add(m[1]);
    this.vars = [...found];
  }

  private updateVarList() {
    if (this.variableList && this.variableList.length) {
      this.vars = [...this.variableList];
      return;
    }
    // sinon, on dérive à partir du contexte récursivement
    const flat: string[] = [];
    const walk = (obj: any, prefix = '') => {
      Object.entries(obj || {}).forEach(([k, val]) => {
        const key = prefix ? `${prefix}.${k}` : k;
        flat.push(key);
        if (val && typeof val === 'object' && !Array.isArray(val))
          walk(val, key);
      });
    };
    walk(this.context);
    this.vars = flat;
  }

  //////////////////////////////////////////////////////////////////
  // ==== HostListener pour Tab → insérer variable sélectionnée ===
  @HostListener('keydown', ['$event'])
  handleKeydown(e: KeyboardEvent) {
    // Intercepter Tab uniquement si le menu suggestions est ouvert
    if (e.key === 'Tab' && this.dropdownVisible && this.vars.length) {
      e.preventDefault();
      this.insertVar(this.vars[0]);          // insère la 1ʳᵉ suggestion
    }
  }
}

/////////////////////////////////////////////////////////////////
//  ───  SAFE HTML PIPE (interne pour garder le fichier unique) ───
/////////////////////////////////////////////////////////////////
import { Pipe, PipeTransform } from '@angular/core';
@Pipe({ name: 'safe', standalone: true })
export class SafePipe implements PipeTransform {
  constructor(private s: DomSanitizer) { }
  transform(v: string): SafeHtml { return this.s.bypassSecurityTrustHtml(v); }
}