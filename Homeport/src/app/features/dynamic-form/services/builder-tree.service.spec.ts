import { BuilderTreeService } from './builder-tree.service';
import type { FormSchema } from '../../../modules/dynamic-form/dynamic-form.service';

describe('BuilderTreeService', () => {
  let svc: BuilderTreeService;
  beforeEach(() => { svc = new BuilderTreeService(); });

  it('drops into empty section (inner insert)', () => {
    const schema: FormSchema = { fields: [
      { type: 'section', title: 'A', fields: [] } as any,
      { type: 'text', key: 'k1', label: 'f1' } as any
    ] } as any;
    const aKey = 'field:0';
    const fKey = 'field:1';
    // simulate dragging field into section A
    const res = svc.handleDrop(schema, {
      dragNode: { key: fKey }, node: { key: aKey }, dropPosition: 0, event: { dropToGap: false }
    });
    expect(res).toBeTruthy();
    expect((schema.fields as any[]).length).toBe(1);
    expect(((schema.fields as any[])[0] as any).fields.length).toBe(1);
  });
});

