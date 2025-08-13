import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import type { FormSchema, StepConfig, SectionConfig, FieldConfig } from '../../../modules/dynamic-form/dynamic-form.service';

/**
 * BuilderCustomizeService
 * -----------------------
 * - Construit dynamiquement un FormGroup et une fonction d'application pour
 *   personnaliser un élément (form/step/section/field) selon une clef symbolique.
 * - Permet d'ajouter de nouveaux items en un endroit unique, sans gonfler le composant.
 * - Tous les champs facultatifs: seule l'UI correspondante s'affiche dans le dialog générique.
 */
@Injectable({ providedIn: 'root' })
export class BuilderCustomizeService {
  constructor(private fb: FormBuilder) {}

  // -------- Helpers internes (styles px) --------
  private px(n: any): string | undefined {
    if (n == null || n === '') return undefined;
    const v = Number(n);
    return isNaN(v) ? undefined : `${v}px`;
  }
  private unpx(v: any): number | null {
    if (v == null || v === '') return null;
    const n = Number(String(v).replace('px',''));
    return isNaN(n) ? null : n;
  }
  private addSpacing(group: FormGroup) {
    ['m_top','m_right','m_bottom','m_left','p_top','p_right','p_bottom','p_left']
      .forEach(k => group.addControl(k, this.fb.control(null)));
  }
  private patchStyle(group: FormGroup, st?: Record<string, any>) {
    const pick = (prop: string) => this.unpx(st?.[prop]);
    group.patchValue({
      color: st?.['color'] ?? '', fontSize: this.unpx(st?.['fontSize']),
      borderWidth: this.unpx(st?.['borderWidth']), borderRadius: this.unpx(st?.['borderRadius']), borderColor: st?.['borderColor'] ?? '', boxShadow: st?.['boxShadow'] ?? '',
      m_top: pick('marginTop'), m_right: pick('marginRight'), m_bottom: pick('marginBottom'), m_left: pick('marginLeft'),
      p_top: pick('paddingTop'), p_right: pick('paddingRight'), p_bottom: pick('paddingBottom'), p_left: pick('paddingLeft'),
    }, { emitEvent: false });
  }
  private styleFromForm(group: FormGroup): Record<string, any> {
    const v: any = group.value; const st: any = {};
    const cp = (k: string) => { if (v[k] != null && v[k] !== '') st[k] = v[k]; };
    ['color','borderColor','boxShadow'].forEach(cp);
    if (this.px(v['fontSize'])) st['fontSize'] = this.px(v['fontSize']);
    if (this.px(v['borderWidth'])) st['borderWidth'] = this.px(v['borderWidth']);
    if (this.px(v['borderRadius'])) st['borderRadius'] = this.px(v['borderRadius']);
    const m = (k: string, f: string) => { const t = this.px(v[k]); if (t) st[f] = t; };
    m('m_top','marginTop'); m('m_right','marginRight'); m('m_bottom','marginBottom'); m('m_left','marginLeft');
    m('p_top','paddingTop'); m('p_right','paddingRight'); m('p_bottom','paddingBottom'); m('p_left','paddingLeft');
    return st;
  }

  /**
   * Construit le triplet { title, form, apply } pour une clef de personnalisation donnée.
   * - title: titre du dialog
   * - form: FormGroup initialisé
   * - apply(): applique les changements sur l'élément, sans side-effects ailleurs
   */
  build(schema: FormSchema, selected: FormSchema | StepConfig | SectionConfig | FieldConfig, key: string) {
    const form = this.fb.group({});
    const add = (k: string, init: any = null) => form.addControl(k, this.fb.control(init));
    const addStd = () => { ['color','fontSize','borderWidth','borderColor','borderRadius','boxShadow'].forEach(k => add(k)); this.addSpacing(form); };

    let title = 'Personnaliser';
    let apply: () => void = () => {};

    // -------- Formulaire global --------
    if (selected === schema) {
      if (key === 'form.actionsBar') {
        addStd(); this.patchStyle(form, schema.ui?.actions?.actionsStyle);
        apply = () => { const st = this.styleFromForm(form); schema.ui = schema.ui || {}; (schema.ui as any).actions = (schema.ui as any).actions || {}; (schema.ui.actions as any).actionsStyle = Object.keys(st).length ? st : undefined; };
        title = 'Barre d’actions (Formulaire)';
      } else if (/form\.(submitBtn|cancelBtn|resetBtn)/.test(key)) {
        const btnKey = key.split('.')[1] as 'submitBtn'|'cancelBtn'|'resetBtn';
        add('text'); add('enabled', true); add('ariaLabel'); addStd();
        this.patchStyle(form, (schema.ui?.actions as any)?.[btnKey]?.style);
        form.patchValue({ text: (schema.ui?.actions as any)?.[btnKey]?.text || '', enabled: (schema.ui?.actions as any)?.[btnKey]?.enabled ?? true, ariaLabel: (schema.ui?.actions as any)?.[btnKey]?.ariaLabel || '' }, { emitEvent: false });
        apply = () => { const v = form.value as any; const st = this.styleFromForm(form); schema.ui = schema.ui || {}; (schema.ui as any).actions = (schema.ui as any).actions || {}; (schema.ui.actions as any)[btnKey] = { text: v.text || undefined, enabled: v.enabled !== false, ariaLabel: v.ariaLabel || undefined, style: Object.keys(st).length ? st : undefined }; };
        title = `Bouton ${(btnKey==='submitBtn'?'Valider':btnKey==='cancelBtn'?'Annuler':'Reset')} (Formulaire)`;
      }
    }

    // -------- Step --------
    if ((selected as any)?.fields !== undefined && !(selected as any)?.type) {
      const step = selected as StepConfig;
      if (key === 'step.prevBtn' || key === 'step.nextBtn') {
        const target = key === 'step.prevBtn' ? 'prevBtn' : 'nextBtn';
        add('text'); add('enabled', true); add('ariaLabel'); addStd();
        this.patchStyle(form, (step as any)[target]?.style);
        form.patchValue({ text: (step as any)[target]?.text || '', enabled: (step as any)[target]?.enabled ?? true, ariaLabel: (step as any)[target]?.ariaLabel || '' }, { emitEvent: false });
        apply = () => { const v = form.value as any; const st = this.styleFromForm(form); (step as any)[target] = { text: v.text || undefined, enabled: v.enabled !== false, ariaLabel: v.ariaLabel || undefined, style: Object.keys(st).length ? st : undefined }; };
        title = key === 'step.prevBtn' ? 'Bouton Précédent (Step)' : 'Bouton Suivant (Step)';
      }
    }

    // -------- Section --------
    if ((selected as any)?.type === 'section') {
      const section = selected as SectionConfig as any;
      if (key === 'section.container') { addStd(); this.patchStyle(form, section.itemStyle); apply = () => { const st = this.styleFromForm(form); section.itemStyle = Object.keys(st).length ? st : undefined; }; title = 'Section: Conteneur'; }
      else if (key === 'section.title') { addStd(); this.patchStyle(form, section.titleStyle); apply = () => { const st = this.styleFromForm(form); section.titleStyle = Object.keys(st).length ? st : undefined; }; title = 'Section: Titre'; }
      else if (key === 'section.description') { addStd(); this.patchStyle(form, section.descriptionStyle); apply = () => { const st = this.styleFromForm(form); section.descriptionStyle = Object.keys(st).length ? st : undefined; }; title = 'Section: Description'; }
    }

    // -------- Field --------
    if ((selected as any)?.type && (selected as any)?.type !== 'section') {
      const field = selected as FieldConfig as any;
      if (key === 'field.label') { add('color'); add('fontSize'); form.patchValue({ color: field.labelStyle?.color || '', fontSize: this.unpx(field.labelStyle?.fontSize) }, { emitEvent: false }); apply = () => { const v = form.value as any; const st: any = {}; if (v.color) st.color = v.color; if (v.fontSize != null && v.fontSize !== '') st.fontSize = this.px(v.fontSize)!; field.labelStyle = Object.keys(st).length ? st : undefined; }; title = 'Field: Label'; }
      else if (key === 'field.container') { addStd(); this.patchStyle(form, field.itemStyle); apply = () => { const st = this.styleFromForm(form); field.itemStyle = Object.keys(st).length ? st : undefined; }; title = 'Field: Conteneur'; }
    }

    return { title, form, apply };
  }
}
