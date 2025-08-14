import { Injectable } from '@angular/core';
import type { FormSchema, FieldConfig, SectionConfig } from '../../../modules/dynamic-form/dynamic-form.service';
import { BuilderTreeService } from './builder-tree.service';
import { BuilderFactoryService } from './builder-factory.service';

@Injectable({ providedIn: 'root' })
export class BuilderCtxActionsService {
  constructor(private tree: BuilderTreeService, private factory: BuilderFactoryService) {}

  private resolveCtx(schema: FormSchema, key: string): { obj: any; parentArr?: any[]; index?: number } | null {
    // Prefer robust path resolution via parseKey
    const parsed = this.tree.parseKey(key) as any;
    if (!parsed) return this.tree.ctxFromKey(schema, key);
    const walk = (arr: any[] | undefined, idxs: number[]): { obj: any; parentArr?: any[]; index?: number } | null => {
      let parent: any[] | undefined = undefined;
      let obj: any = undefined;
      let curArr = arr;
      for (let i = 0; i < idxs.length; i++) {
        const idx = idxs[i];
        parent = curArr;
        obj = parent?.[idx];
        if (!obj) return null;
        // descend only if next index exists (i < last) and current is a section
        const hasNext = i < idxs.length - 1;
        curArr = hasNext ? (obj?.fields as any[] | undefined) : curArr;
      }
      return { obj, parentArr: parent, index: idxs.length ? idxs[idxs.length - 1] : undefined };
    };
    if (parsed.type === 'fieldPath') {
      const st = schema.steps?.[parsed.stepIndex];
      if (!st) return null;
      return walk(st.fields || [], parsed.path || []);
    }
    if (parsed.type === 'rootFieldPath') {
      return walk(schema.fields || [], parsed.path || []);
    }
    if (parsed.type === 'step') return { obj: (schema.steps || [])[parsed.stepIndex] } as any;
    if (parsed.type === 'root') return { obj: schema } as any;
    return this.tree.ctxFromKey(schema, key);
  }

  addFieldToSection(schema: FormSchema, key: string, type: string = 'text'): FieldConfig | null {
    const ctx = this.resolveCtx(schema, key);
    const sec = ctx?.obj as any;
    if (!sec || sec.type !== 'section') return null;
    sec.fields = sec.fields || [];
    const f = this.factory.newField(type as any);
    sec.fields.push(f);
    return f;
  }

  addSectionInside(schema: FormSchema, key: string): SectionConfig | null {
    const ctx = this.resolveCtx(schema, key);
    const sec = ctx?.obj as any;
    if (!sec || sec.type !== 'section') return null;
    sec.fields = sec.fields || [];
    const ns: SectionConfig = this.factory.newSection();
    sec.fields.push(ns as any);
    return ns as any;
  }

  deleteSection(schema: FormSchema, key: string): boolean {
    const ctx = this.resolveCtx(schema, key);
    if (!ctx || (ctx.obj as any)?.type !== 'section') return false;
    if (ctx.parentArr && ctx.index != null) {
      ctx.parentArr.splice(ctx.index, 1);
      return true;
    }
    return false;
  }

  deleteField(schema: FormSchema, key: string): boolean {
    const ctx = this.resolveCtx(schema, key);
    if (!ctx || (ctx.obj as any)?.type === 'section') return false;
    if (ctx.parentArr && ctx.index != null) {
      ctx.parentArr.splice(ctx.index, 1);
      return true;
    }
    return false;
  }

  // ===== Duplicate / Insert helpers =====
  private deepClone<T>(x: T): T { return JSON.parse(JSON.stringify(x)); }

  duplicateAtKey(schema: FormSchema, key: string): any | null {
    const ctx = this.resolveCtx(schema, key);
    if (!ctx || !ctx.parentArr || ctx.index == null) return null;
    const clone = this.deepClone(ctx.obj);
    ctx.parentArr.splice(ctx.index + 1, 0, clone);
    return clone;
  }

  insertSectionBefore(schema: FormSchema, key: string): SectionConfig | null {
    const ctx = this.resolveCtx(schema, key);
    if (!ctx || (ctx.obj as any)?.type !== 'section' || !ctx.parentArr || ctx.index == null) return null;
    const sec = this.factory.newSection();
    ctx.parentArr.splice(ctx.index, 0, sec);
    return sec;
  }
  insertSectionAfter(schema: FormSchema, key: string): SectionConfig | null {
    const ctx = this.resolveCtx(schema, key);
    if (!ctx || (ctx.obj as any)?.type !== 'section' || !ctx.parentArr || ctx.index == null) return null;
    const sec = this.factory.newSection();
    ctx.parentArr.splice(ctx.index + 1, 0, sec);
    return sec;
  }

  insertFieldBefore(schema: FormSchema, key: string, type: string = 'text'): FieldConfig | null {
    const ctx = this.resolveCtx(schema, key);
    if (!ctx || (ctx.obj as any)?.type === 'section' || !ctx.parentArr || ctx.index == null) return null;
    const f = this.factory.newField(type as any);
    ctx.parentArr.splice(ctx.index, 0, f);
    return f;
  }
  insertFieldAfter(schema: FormSchema, key: string, type: string = 'text'): FieldConfig | null {
    const ctx = this.resolveCtx(schema, key);
    if (!ctx || (ctx.obj as any)?.type === 'section' || !ctx.parentArr || ctx.index == null) return null;
    const f = this.factory.newField(type as any);
    ctx.parentArr.splice(ctx.index + 1, 0, f);
    return f;
  }

  // ===== Root/Step helpers for context menus =====
  addStep(schema: FormSchema) {
    schema.steps = schema.steps || [];
    const st = this.factory.newStep();
    schema.steps.push(st);
    return st;
  }
  addSectionToStep(schema: FormSchema, key: string): SectionConfig | null {
    const parsed = this.tree.parseKey(key) as any;
    if (!parsed || parsed.type !== 'step') return null;
    const st = schema.steps?.[parsed.stepIndex!];
    if (!st) return null;
    st.fields = st.fields || [];
    const sec = this.factory.newSection();
    st.fields.push(sec);
    return sec;
  }
  addFieldToStep(schema: FormSchema, key: string, type: string = 'text'): FieldConfig | null {
    const parsed = this.tree.parseKey(key) as any;
    if (!parsed || parsed.type !== 'step') return null;
    const st = schema.steps?.[parsed.stepIndex!];
    if (!st) return null;
    st.fields = st.fields || [];
    const f = this.factory.newField(type as any);
    st.fields.push(f);
    return f;
  }
  addSectionToRoot(schema: FormSchema): SectionConfig {
    schema.fields = schema.fields || [];
    const sec = this.factory.newSection();
    (schema.fields as any).push(sec);
    return sec;
  }
  addFieldToRoot(schema: FormSchema, type: string = 'text'): FieldConfig {
    schema.fields = schema.fields || [];
    const f = this.factory.newField(type as any);
    (schema.fields as any).push(f);
    return f;
  }

  // ===== Editing actions from preview (mixed items / fields) =====
  moveMixed(schema: FormSchema, e: { path: 'step'|'root'; stepIndex?: number; index: number; dir: 'up'|'down' }) {
    const move = (arr: any[] | undefined) => {
      if (!arr) return;
      const from = e.index;
      const to = e.dir === 'up' ? e.index - 1 : e.index + 1;
      if (to < 0 || to >= arr.length) return;
      const [it] = arr.splice(from, 1);
      arr.splice(to, 0, it);
    };
    if (e.path === 'root') move(schema.fields);
    if (e.path === 'step') move(schema.steps?.[e.stepIndex!].fields);
  }

  moveField(schema: FormSchema, e: { path: 'flat'|'section'|'stepRoot'; stepIndex?: number; sectionIndex?: number; index: number; dir: 'up'|'down' }) {
    const move = (arr: any[] | undefined) => {
      if (!arr) return;
      const from = e.index;
      const to = e.dir === 'up' ? e.index - 1 : e.index + 1;
      if (to < 0 || to >= arr.length) return;
      const [it] = arr.splice(from, 1);
      arr.splice(to, 0, it);
    };
    if (e.path === 'flat') move(schema.fields);
    if (e.path === 'section') {
      if (e.stepIndex != null) {
        const f = schema.steps?.[e.stepIndex].fields?.[e.sectionIndex!];
        const sec = f && (f as any).type === 'section' ? (f as any) : null;
        move(sec?.fields);
      } else {
        const f = schema.fields?.[e.sectionIndex!];
        const sec = f && (f as any).type === 'section' ? (f as any) : null;
        move(sec?.fields);
      }
    }
    if (e.path === 'stepRoot') move(schema.steps?.[e.stepIndex!].fields);
  }

  deleteFieldByPosition(schema: FormSchema, e: { path: 'flat'|'section'|'stepRoot'; stepIndex?: number; sectionIndex?: number; index: number }) {
    const del = (arr: any[] | undefined) => { if (!arr) return; arr.splice(e.index, 1); };
    if (e.path === 'flat') del(schema.fields);
    if (e.path === 'section') {
      if (e.stepIndex != null) {
        const f = schema.steps?.[e.stepIndex].fields?.[e.sectionIndex!];
        const sec = f && (f as any).type === 'section' ? (f as any) : null;
        del(sec?.fields);
      } else {
        const f = schema.fields?.[e.sectionIndex!];
        const sec = f && (f as any).type === 'section' ? (f as any) : null;
        del(sec?.fields);
      }
    }
    if (e.path === 'stepRoot') del(schema.steps?.[e.stepIndex!].fields);
  }
  // deprecated: factories moved to BuilderFactoryService
}
