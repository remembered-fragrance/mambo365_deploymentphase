import { describe, expect, it } from 'vitest';
import { ROLE_PREVIEW_OPTIONS, rolePreviewTabs } from '@/features/auth/rolePreviewModel';
import { DEVELOPER_ROLE_PREVIEW_PATH, resolveDeveloperRolePreviewPath } from '@/features/dev/rolePreviewRoute';

describe('developer role preview', () => {
  it('offers role switching for farmer, trader, and enterprise with role-specific tabs', () => {
    expect(ROLE_PREVIEW_OPTIONS.map((option) => option.type)).toEqual(['trader', 'farmer', 'enterprise']);
    expect(rolePreviewTabs('farmer').map((tab) => tab.id)).toContain('receivables');
    expect(rolePreviewTabs('trader').map((tab) => tab.id)).toContain('book');
    expect(rolePreviewTabs('enterprise').map((tab) => tab.id)).toContain('branches');
  });

  it('renders only the explicit preview route in development, leaving root on the real app flow', () => {
    expect(resolveDeveloperRolePreviewPath(DEVELOPER_ROLE_PREVIEW_PATH, true)).toBe('preview');
    expect(resolveDeveloperRolePreviewPath(DEVELOPER_ROLE_PREVIEW_PATH, false)).toBe('not-found');
    expect(resolveDeveloperRolePreviewPath('/', true)).toBe('application');
    expect(resolveDeveloperRolePreviewPath('/', false)).toBe('application');
  });

  it('keeps all other paths in the existing application router', () => {
    expect(resolveDeveloperRolePreviewPath('/tai-khoan', false)).toBe('application');
  });
});
