import { SYSTEM_ROLE_IDS, type SystemRole } from './ids';

export const PERMISSIONS = [
  'workspaces.read',
  'workspaces.manage',
  'workspaces.invite',
  'workspaces.transfer_owner',
  'farms.manage',
  'listings.manage',
  'locations.manage',
  'locations.publish',
  'quotations.send',
  'quotations.accept',
  'orders.confirm',
  'orders.cancel',
  'appointments.manage',
  'fulfillments.weigh',
  'fulfillments.accept',
  'inventory.manage',
  'settlements.declare',
  'settlements.confirm',
  'settlements.allocate',
  'settlements.reverse',
  'export.financial',
  'billing.manage',
  'approvals.act',
  'moderation.review',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL = [...PERMISSIONS];

const ROLE_PERMS: Record<SystemRole, readonly Permission[]> = {
  owner: ALL,
  manager: [
    'workspaces.read',
    'workspaces.invite',
    'farms.manage',
    'listings.manage',
    'locations.manage',
    'locations.publish',
    'quotations.send',
    'quotations.accept',
    'orders.confirm',
    'orders.cancel',
    'appointments.manage',
    'fulfillments.weigh',
    'fulfillments.accept',
    'inventory.manage',
    'approvals.act',
    'export.financial',
  ],
  procurement: [
    'workspaces.read',
    'listings.manage',
    'quotations.send',
    'quotations.accept',
    'orders.confirm',
    'appointments.manage',
  ],
  sales: [
    'workspaces.read',
    'listings.manage',
    'locations.manage',
    'quotations.send',
    'quotations.accept',
    'orders.confirm',
    'appointments.manage',
  ],
  warehouse: [
    'workspaces.read',
    'fulfillments.weigh',
    'fulfillments.accept',
    'inventory.manage',
    'appointments.manage',
  ],
  accountant: [
    'workspaces.read',
    'settlements.declare',
    'settlements.confirm',
    'settlements.allocate',
    'settlements.reverse',
    'export.financial',
  ],
  viewer: ['workspaces.read'],
};

export const roleCodeOf = (roleId: string): SystemRole | null => {
  const hit = (Object.keys(SYSTEM_ROLE_IDS) as SystemRole[]).find(
    (k) => SYSTEM_ROLE_IDS[k] === roleId,
  );
  return hit ?? null;
};

export const hasPermission = (roleId: string, code: Permission): boolean => {
  const role = roleCodeOf(roleId);
  if (!role) return false;
  return ROLE_PERMS[role].includes(code);
};

export const inviteRoleAllowed = (callerRoleId: string, targetRoleId: string): boolean => {
  if (targetRoleId === SYSTEM_ROLE_IDS.owner) return false;
  return roleCodeOf(callerRoleId) === 'owner' || roleCodeOf(callerRoleId) === 'manager';
};
