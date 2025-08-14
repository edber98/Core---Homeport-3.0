import { TestBed } from '@angular/core/testing';
import { ExpressionSandboxService } from './expression-sandbox.service';

describe('ExpressionSandboxService', () => {
  let svc: ExpressionSandboxService;

  const ctx = {
    json: {
      id: 'abc-123',
      user: {
        id: 42,
        name: 'Alice',
        email: 'a@example.com',
      },
      users: [{ name: 'Bob' }, { name: 'Eve' }],
    },
    now: new Date('2025-01-01T00:00:00Z'),
  } as any;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    svc = TestBed.inject(ExpressionSandboxService);
  });

  it('evaluates single island to string', () => {
    const out = svc.evaluateTemplate('{{ json.id }}', ctx);
    expect(out).toBe('abc-123');
  });

  it('evaluates multiple islands in the same string', () => {
    const out = svc.evaluateTemplate('{{ json.id }} -- {{ json.id }}', ctx);
    expect(out).toBe('abc-123 -- abc-123');
  });

  it('handles ternary expressions', () => {
    const out = svc.evaluateTemplate("{{ 2 > 1 ? 'Ok' : 'Non' }}", ctx);
    expect(out).toBe('Ok');
  });

  it('handles ternary with variables', () => {
    const out = svc.evaluateTemplate("{{ json.user.email == 'a@example.com' ? 'Lui' : 'Elle' }}", ctx);
    expect(out).toBe('Lui');
  });

  it('handles nested ternaries', () => {
    const out = svc.evaluateTemplate("{{ 1 ? (2 ? 'X' : 'Y') : 'Z' }}", ctx);
    expect(out).toBe('X');
  });

  it('handles array indexing', () => {
    const out = svc.evaluateTemplate('{{ json.users[0].name }}', ctx);
    expect(out).toBe('Bob');
  });

  it('concatenates strings inside island', () => {
    const out = svc.evaluateTemplate("{{ json.user.id + ' - ' + json.user.email }}", ctx);
    expect(out).toBe('42 - a@example.com');
  });

  it('does math operations', () => {
    const out = svc.evaluateTemplate('{{ (2 + 3) * 4 }}', ctx);
    expect(out).toBe(String((2 + 3) * 4));
  });

  it('validateTemplate returns true for valid multi-island', () => {
    expect(svc.validateTemplate('{{ json.id }} -- {{ json.user.name }}', ctx)).toBeTrue();
  });

  it('isValidIsland detects invalid expression', () => {
    expect(svc.isValidIsland('for(;;){}', ctx)).toBeFalse();
  });
});

