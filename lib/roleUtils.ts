// lib/roleUtils.ts

export type UserRole = 'subscriber' | 'member' | 'admin' | 'superadmin';

export interface UserWithRole {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  created_at: string;
  promoted_by?: string;
  promoted_at?: string;
}

export interface RolePromotion {
  id: string;
  user_id: string;
  promoted_by: string;
  old_role: UserRole;
  new_role: UserRole;
  created_at: string;
  notes?: string;
}

export const ROLE_HIERARCHY = {
  subscriber: 0,
  member: 1,
  admin: 2,
  superadmin: 3
};

export const ROLE_PERMISSIONS = {
  subscriber: {
    canViewMainWall: true,
    canSaveShots: true,
    canCreateShots: false,
    canApproveShots: false,
    canManageUsers: false,
    canAccessAdmin: false,
    sections: ['main-wall', 'shots-guardados']
  },
  member: {
    canViewMainWall: true,
    canSaveShots: true,
    canCreateShots: true,
    canApproveShots: false,
    canManageUsers: false,
    canAccessAdmin: false,
    sections: ['main-wall', 'shots-guardados', 'my-shots', 'create-shots']
  },
  admin: {
    canViewMainWall: true,
    canSaveShots: true,
    canCreateShots: true,
    canApproveShots: true,
    canManageUsers: true,
    canAccessAdmin: true,
    sections: ['main-wall', 'shots-guardados', 'my-shots', 'create-shots', 'admin-panel']
  },
  superadmin: {
    canViewMainWall: true,
    canSaveShots: true,
    canCreateShots: true,
    canApproveShots: true,
    canManageUsers: true,
    canAccessAdmin: true,
    canManageAdmins: true,
    sections: ['main-wall', 'shots-guardados', 'my-shots', 'create-shots', 'admin-panel']
  }
};

export const getRoleDisplayName = (role: UserRole): string => {
  const names = {
    subscriber: 'Usuario Suscriptor',
    member: 'Usuario Miembro',
    admin: 'Usuario Administrador',
    superadmin: 'Super Administrador'
  };
  return names[role];
};

export const canPromoteToRole = (currentUserRole: UserRole, targetRole: UserRole): boolean => {
  if (currentUserRole === 'admin') {
    return targetRole === 'member';
  }
  if (currentUserRole === 'superadmin') {
    return targetRole === 'admin' || targetRole === 'member';
  }
  return false;
};

export const canDemoteFromRole = (currentUserRole: UserRole, targetRole: UserRole): boolean => {
  if (currentUserRole === 'superadmin') {
    return targetRole === 'admin';
  }
  return false;
};

export const getNextPromotableRole = (currentRole: UserRole): UserRole | null => {
  switch (currentRole) {
    case 'subscriber':
      return 'member';
    case 'member':
      return 'admin';
    default:
      return null;
  }
};

export const hasPermission = (userRole: UserRole, permission: keyof typeof ROLE_PERMISSIONS.subscriber): boolean => {
  const val = (ROLE_PERMISSIONS as any)[userRole]?.[permission];
  if (Array.isArray(val)) return false;
  return !!val;
};

export const canAccessSection = (userRole: UserRole, section: string): boolean => {
  return ROLE_PERMISSIONS[userRole]?.sections.includes(section) || false;
};
