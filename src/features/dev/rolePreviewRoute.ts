export const DEVELOPER_ROLE_PREVIEW_PATH = '/dev/role-preview';

export type AppEntryDestination = 'preview' | 'not-found' | 'application';

export function resolveDeveloperRolePreviewPath(pathname: string, isDevelopment: boolean): AppEntryDestination {
  if (pathname !== DEVELOPER_ROLE_PREVIEW_PATH) return 'application';
  return isDevelopment ? 'preview' : 'not-found';
}
