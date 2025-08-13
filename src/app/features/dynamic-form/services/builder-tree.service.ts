import { Injectable } from '@angular/core';
import type { FormSchema, SectionConfig, FieldConfig, StepConfig } from '../../../modules/dynamic-form/dynamic-form.service';

/**
 * BuilderTreeService
 * ------------------
 * Regroupe toute la logique liée à l'arbre (nz-tree):
 * - Génération/résolution de clés stables pour nodes (ex: step:0:field:1:field:2)
 * - Recherche d'un objet (field/section/step) depuis une clé
 * - Déplacement (drag & drop) cross-niveaux avec les règles du builder
 *
 * Objectif: alléger le composant et favoriser la réutilisabilité/testabilité.
 */
@Injectable({ providedIn: 'root' })
export class BuilderTreeService {
  /** Renvoie la clé pour un objet du schéma, ou null si non trouvé */
  keyForObject(schema: FormSchema, obj: any): string | null {
    if (obj === schema) return 'root';
    const searchFields = (base: string, fields?: any[]): string | null => {
      for (let i = 0; i < (fields || []).length; i++) {
        const f = (fields as any)[i];
        const isStepBase = base.startsWith('step:');
        const key = isStepBase ? `${base}:field:${i}` : `${base}:${i}`;
        if (f === obj) return key;
        if (f && f.type === 'section') {
          const childBase = isStepBase ? key : `${key}:field`;
          const sub = searchFields(childBase, f.fields || []);
          if (sub) return sub;
        }
      }
      return null;
    };
    if (schema.steps) {
      for (let si = 0; si < schema.steps.length; si++) {
        const st = schema.steps[si];
        if (obj === st) return `step:${si}`;
        const sub = searchFields(`step:${si}`, st.fields || []);
        if (sub) return sub;
      }
    }
    return searchFields('field', schema.fields || []);
  }

  /**
   * Retourne l'objet, son parent et l'index du node pointé par sa clé de tree.
   * Exemple de clé: 'step:0:field:2:field:1'
   */
  ctxFromKey(schema: FormSchema, key: string): { obj: any; parentArr?: any[]; index?: number } | null {
    if (!key) return null;
    if (key === 'root') return { obj: schema } as any;
    const parts = key.split(':');
    const n = (s: string) => Number(s);
    const drillFields = (arr: any[] | undefined, chain: string[], start: number) => {
      let curArr = arr as any[] | undefined;
      let curObj: any = null;
      let parent: any[] | undefined;
      let idx: number | undefined;
      for (let i = start; i < chain.length; i += 2) {
        if (chain[i] !== 'field') return null;
        const fi = n(chain[i + 1]);
        parent = curArr;
        idx = fi;
        curObj = curArr?.[fi];
        if (!curObj) return null;
        curArr = curObj?.fields; // si section, descendre
      }
      return { obj: curObj, parentArr: parent, index: idx };
    };
    if (parts[0] === 'step') {
      const si = n(parts[1]);
      const step = schema.steps?.[si];
      if (!step) return null;
      if (parts.length === 2) return { obj: step } as any;
      return drillFields(step.fields || [], parts, 2);
    }
    if (parts[0] === 'field') return drillFields(schema.fields || [], parts, 0);
    return null;
  }

  /**
   * Applique un drop à l'arbre selon les règles du builder.
   * Retourne la clé du node déplacé si succès, sinon null.
   */
  handleDrop(schema: FormSchema, e: any): string | null {
    const dragKey: string = String(e?.dragNode?.key || '');
    const dropKey: string = String(e?.node?.key || '');
    const rawPos = (e as any)?.dropPosition;
    const dropToGap = !!((e as any)?.event?.dropToGap);
    let pos: number = typeof rawPos === 'number' ? Number(rawPos) : (dropToGap ? 1 : 0);
    if (!dragKey || !dropKey || dragKey === dropKey) return null;

    const src = this.ctxFromKey(schema, dragKey);
    if (!src || !src.obj) return null;
    const isSection = (src.obj as any).type === 'section';
    const isField = (src.obj as any).type && (src.obj as any).type !== 'section';
    if (!isSection && !isField) return null;

    const dst = this.ctxFromKey(schema, dropKey);
    if (!dst) return null;

    let targetArr: any[] | undefined;
    let insertIndex = 0;
    const stepsMode = !!schema.steps?.length;
    const dropIsStep = dropKey.startsWith('step:') && dropKey.split(':').length === 2;
    const dropIsRoot = dropKey === 'root';

    // Cas particulier: déposer sur une section vide => insérer DANS la section
    const dstIsEmptySection = (dst.obj as any)?.type === 'section' && (!Array.isArray((dst.obj as any).fields) || ((dst.obj as any).fields.length === 0));
    if (dstIsEmptySection && !dropIsStep && !dropIsRoot) {
      const sec = dst.obj as any; sec.fields = sec.fields || [];
      if (this.#containsObj(src.obj, sec)) return null;
      targetArr = sec.fields; insertIndex = 0;
    } else if (pos === 0 && !dropToGap) {
      // Déposer à l'intérieur du node cible
      if (dropIsStep) {
        if (!stepsMode) return null;
        const si = Number(dropKey.split(':')[1]);
        const step = schema.steps?.[si]; if (!step) return null;
        step.fields = step.fields || [];
        targetArr = step.fields;
        insertIndex = targetArr.length;
      } else if (dropIsRoot) {
        if (stepsMode) return null; // racine interdite en mode steps
        schema.fields = schema.fields || [];
        targetArr = schema.fields;
        insertIndex = (targetArr || []).length;
      } else {
        if ((dst.obj as any).type === 'section') {
          const sec = dst.obj as any; sec.fields = sec.fields || [];
          // Interdire de déposer un élément dans lui-même ou un de ses descendants
          if (this.#containsObj(src.obj, sec)) return null;
          targetArr = sec.fields; insertIndex = sec.fields.length;
        } else return null; // pas d'insertion dans un field
      }
    } else {
      // Déposer avant/après (même parent que la cible)
      if (dropIsStep) return null; // pas de réordres des steps ici
      if (dst.parentArr) {
        targetArr = dst.parentArr;
        const baseIndex = dst.index ?? 0;
        insertIndex = baseIndex + (pos > 0 ? 1 : 0);
        // Interdire de déposer un élément avant/après un descendant (changement de parent sous-lui)
        // Tolérer le réordonnancement dans le même parent
        if (this.#containsArrayInSubtree(src.obj, targetArr) && targetArr !== src.parentArr) return null;
      } else return null;
    }
    if (!targetArr) return null;
    if (stepsMode && targetArr === schema.fields) return null; // interdit

    if (src.parentArr && src.index != null) {
      const [moved] = src.parentArr.splice(src.index, 1);
      if (!moved) return null;
      if (targetArr === src.parentArr && insertIndex > src.index) insertIndex -= 1;
      targetArr.splice(Math.max(0, Math.min(insertIndex, targetArr.length)), 0, moved);
      return this.keyForObject(schema, moved);
    }
    return null;
  }

  // ----- Guards: éviter drag→drop dans son propre sous-arbre -----
  #containsObj(root: any, candidate: any): boolean {
    if (!root) return false;
    if (root === candidate) return true;
    const visit = (arr?: any[]): boolean => {
      for (const f of arr || []) {
        if (f === candidate) return true;
        if (f?.type === 'section' && visit(f.fields)) return true;
      }
      return false;
    };
    if ((root as any)?.type === 'section') return visit((root as any).fields);
    // Steps/root: parcourir à partir de root.fields si présent
    if ((root as StepConfig)?.fields) return visit((root as StepConfig).fields as any);
    return false;
  }

  #containsArrayInSubtree(root: any, targetArr: any[] | undefined): boolean {
    if (!root || !targetArr) return false;
    const arrays: any[] = [];
    const collect = (arr?: any[]) => {
      if (!arr) return;
      arrays.push(arr);
      for (const f of arr) if (f?.type === 'section') collect(f.fields);
    };
    if ((root as any)?.type === 'section') collect((root as any).fields);
    else if ((root as StepConfig)?.fields) collect((root as StepConfig).fields as any);
    return arrays.includes(targetArr);
  }
}
