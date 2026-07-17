import {
  DEFAULT_TENANT_ID,
  getCurrentTenantId,
  isMultiTenantEnabled,
  scopeQuery,
  addTenantContext,
  getTenantRole,
} from './tenantScoping';

// The app runs single-tenant today. These tests lock the invariants that keep
// existing data working: default mode must be a no-op so writes/queries are not
// accidentally scoped (which would hide or corrupt data).

describe('tenantScoping (single-tenant invariants)', () => {
  it('defaults to the "default" tenant', () => {
    expect(DEFAULT_TENANT_ID).toBe('default');
    expect(getCurrentTenantId()).toBe('default');
  });

  it('is not in multi-tenant mode', () => {
    expect(isMultiTenantEnabled()).toBe(false);
  });

  it('scopeQuery is a no-op in default mode (returns the same query)', () => {
    const query = { table: 'clients' };
    expect(scopeQuery(query)).toBe(query);
  });

  it('addTenantContext does NOT inject tenantId in default mode', () => {
    const data = { name: 'Acme', a: 1 };
    const out = addTenantContext(data);
    expect(out).toEqual({ name: 'Acme', a: 1 });
    expect('tenantId' in out).toBe(false);
  });

  it('addTenantContext injects tenantId for a non-default tenant', () => {
    expect(addTenantContext({ a: 1 }, 'agency-2')).toEqual({ a: 1, tenantId: 'agency-2' });
  });

  it('getTenantRole defers to the existing role system in default mode', () => {
    expect(getTenantRole('someone@example.com')).toBeNull();
  });
});
