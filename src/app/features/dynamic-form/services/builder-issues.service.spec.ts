import { BuilderIssuesService } from './builder-issues.service';
import type { FormSchema } from '../../../modules/dynamic-form/dynamic-form.service';

describe('BuilderIssuesService', () => {
  let svc: BuilderIssuesService;
  beforeEach(() => { svc = new BuilderIssuesService(); });

  it('detects duplicate field keys', () => {
    const schema: FormSchema = { fields: [
      { type: 'text', key: 'dup' } as any,
      { type: 'text', key: 'dup' } as any
    ] } as any;
    const dups = svc.findDuplicates(schema);
    expect(dups.length).toBe(1);
    expect(dups[0].key).toBe('dup');
    expect(dups[0].objs.length).toBe(2);
  });

  it('flags invalid condition references', () => {
    const schema: FormSchema = { fields: [
      { type: 'text', key: 'known' } as any,
      { type: 'text', key: 'target', visibleIf: { '==': [{ var: 'unknown' }, true] } } as any
    ] } as any;
    const bad = svc.findInvalidConditionRefs(schema);
    expect(bad.length).toBe(1);
    expect(bad[0].missing).toContain('unknown');
  });
});

