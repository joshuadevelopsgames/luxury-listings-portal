import { resolvePermission, getEffectivePermissions } from './permissionResolver';

// Access control is a security boundary — these tests pin the exact rules so a
// future refactor can't silently widen (or break) who can see a page.

describe('resolvePermission', () => {
  it('grants system admins everything', () => {
    expect(resolvePermission({ permission: 'crm', isAdmin: true })).toBe(true);
    expect(
      resolvePermission({ permission: 'anything', pagePermissions: [], isAdmin: true })
    ).toBe(true);
  });

  it('grants access when the page is in the user permission list', () => {
    expect(
      resolvePermission({ permission: 'dashboard', pagePermissions: ['dashboard', 'tasks'] })
    ).toBe(true);
  });

  it('denies access to pages not in the list', () => {
    expect(
      resolvePermission({ permission: 'crm', pagePermissions: ['dashboard', 'tasks'] })
    ).toBe(false);
  });

  it('denies by default with no permissions and non-admin', () => {
    expect(resolvePermission({ permission: 'dashboard' })).toBe(false);
  });

  it('ignores deprecated custom/feature permission params', () => {
    expect(
      resolvePermission({
        permission: 'crm',
        pagePermissions: ['dashboard'],
        customPermissions: ['crm'],
        featurePermissions: ['crm'],
      })
    ).toBe(false);
  });
});

describe('getEffectivePermissions', () => {
  it('returns a wildcard for admins', () => {
    expect(getEffectivePermissions({ isAdmin: true })).toEqual({ pages: ['*'], features: [] });
  });

  it('returns de-duplicated page permissions for regular users', () => {
    expect(
      getEffectivePermissions({ pagePermissions: ['a', 'a', 'b'] })
    ).toEqual({ pages: ['a', 'b'], features: [] });
  });

  it('returns empty pages when the user has none', () => {
    expect(getEffectivePermissions({})).toEqual({ pages: [], features: [] });
  });
});
