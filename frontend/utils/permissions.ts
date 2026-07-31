export type AppRole = 'admin' | 'doctor' | 'intern' | 'patient' | 'hospital_staff' | 'moderator';

export type AppPermission =
  | 'analytics:read'
  | 'badge:manage'
  | 'case:create'
  | 'case:delete'
  | 'case:follow_up'
  | 'case:repost'
  | 'case:update'
  | 'certificate:issue'
  | 'comment:create'
  | 'comment:moderate'
  | 'import:run'
  | 'job:manage'
  | 'profile:verify'
  | 'rating:create'
  | 'user:award_points'
  | 'webinar:attend'
  | 'webinar:feedback'
  | 'webinar:manage';

const allPermissions: AppPermission[] = [
  'analytics:read',
  'badge:manage',
  'case:create',
  'case:delete',
  'case:follow_up',
  'case:repost',
  'case:update',
  'certificate:issue',
  'comment:create',
  'comment:moderate',
  'import:run',
  'job:manage',
  'profile:verify',
  'rating:create',
  'user:award_points',
  'webinar:attend',
  'webinar:feedback',
  'webinar:manage'
];

export const rolePermissions: Record<AppRole, AppPermission[]> = {
  admin: allPermissions,
  doctor: [
    'analytics:read',
    'badge:manage',
    'case:create',
    'case:delete',
    'case:follow_up',
    'case:repost',
    'case:update',
    'certificate:issue',
    'comment:create',
    'comment:moderate',
    'job:manage',
    'profile:verify',
    'rating:create',
    'user:award_points',
    'webinar:attend',
    'webinar:feedback',
    'webinar:manage'
  ],
  intern: [
    'analytics:read',
    'case:follow_up',
    'case:repost',
    'comment:create',
    'rating:create',
    'webinar:attend',
    'webinar:feedback'
  ],
  patient: ['case:create', 'case:repost', 'comment:create', 'rating:create', 'webinar:attend', 'webinar:feedback'],
  hospital_staff: [
    'analytics:read',
    'case:follow_up',
    'case:repost',
    'comment:create',
    'import:run',
    'rating:create',
    'webinar:attend',
    'webinar:feedback'
  ],
  moderator: [
    'analytics:read',
    'case:repost',
    'comment:create',
    'comment:moderate',
    'rating:create',
    'webinar:attend',
    'webinar:feedback'
  ]
};

export const normalizeRole = (role?: string): AppRole | undefined => {
  if (!role) return undefined;
  const normalized = role.toLowerCase().replace(/[-\s]/g, '_') as AppRole;
  return Object.prototype.hasOwnProperty.call(rolePermissions, normalized) ? normalized : undefined;
};

// SECURITY: Role can no longer be read by decoding a JWT client-side, since the
// token now lives in an httpOnly cookie. Callers should pass the user object
// (from AuthContext, already fetched via /auth/validate-token) when available.
export const getCurrentUserRole = (userObj?: any): AppRole | undefined => {
  if (userObj?.userType || userObj?.role) {
    return normalizeRole(userObj.userType || userObj.role);
  }
  if (typeof window === 'undefined') return undefined;
  try {
    const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
    return normalizeRole(storedUser?.userType || storedUser?.role);
  } catch {
    return undefined;
  }
};

export const canUser = (role: string | undefined, permission: AppPermission) => {
  const actualRole = role || getCurrentUserRole();
  const normalizedRole = normalizeRole(actualRole);
  return normalizedRole ? rolePermissions[normalizedRole].includes(permission) : false;
};