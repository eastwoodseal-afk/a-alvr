// lib/roleUtils.ts

export type UserRole = 'subscriber' | 'member' | 'admin' | 'superadmin';

export interface UserWithRole {
  id: string;
  email: string;
  username: string | null;
  role: UserRole; // El rol efectivo (el que la app usa para renderizar)
  actualRole: UserRole; // 🆕 El rol real (el que viene de la BD, inmutable)
  avatar_url: string | null;
}

export const ROLE_PERMISSIONS = {
  subscriber: {
    canViewMainWall: true,
    canSaveShots: true,
    canCreateShots: false,
    canApproveShots: false,
    canManageUsers: false,
    canAccessAdmin: false,
  },
  member: {
    canViewMainWall: true,
    canSaveShots: true,
    canCreateShots: true,
    canApproveShots: false,
    canManageUsers: false,
    canAccessAdmin: false,
  },
  admin: {
    canViewMainWall: true,
    canSaveShots: true,
    canCreateShots: true,
    canApproveShots: true,
    canManageUsers: true,
    canAccessAdmin: true,
  },
  superadmin: {
    canViewMainWall: true,
    canSaveShots: true,
    canCreateShots: true,
    canApproveShots: true,
    canManageUsers: true,
    canAccessAdmin: true,
  }
};

export const hasPermission = (userRole: UserRole | undefined, permission: keyof typeof ROLE_PERMISSIONS.subscriber): boolean => {
  if (!userRole) return false;
  return !!(ROLE_PERMISSIONS as any)[userRole]?.[permission];
};