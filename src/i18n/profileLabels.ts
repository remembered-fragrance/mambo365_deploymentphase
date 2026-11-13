import type { OrgType } from '@mambo/contracts';
import { L } from './labels';

export function profileTitle(orgType: OrgType | null): string {
  if (orgType === 'farmer') return L.farmerProfile;
  if (orgType === 'enterprise') return L.enterpriseProfile;
  return L.navProfile;
}

export function profileOwnerLabel(orgType: OrgType | null): string {
  return orgType === 'farmer' ? L.profileFarmerOwner : L.profileOwner;
}

export function profileBusinessLabel(orgType: OrgType | null): string {
  return orgType === 'farmer' ? L.profileFarmerBusiness : L.profileBusiness;
}

export function ownerRoleLabel(orgType: OrgType | null): string {
  return orgType === 'farmer' ? L.roleFarmerOwner : L.roleOwner;
}
