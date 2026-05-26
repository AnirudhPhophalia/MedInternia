import { APP_PERMISSIONS, APP_ROLES, ROLE_PERMISSION_MATRIX } from '../middleware/permissions';

export const rolePermissionDocumentation = {
  roles: APP_ROLES,
  permissions: APP_PERMISSIONS,
  matrix: ROLE_PERMISSION_MATRIX,
  notes: [
    'Route middleware enforces coarse role permissions before controller ownership checks.',
    'Doctors keep their existing clinical permissions while admin can perform every guarded action.',
    'Moderators can moderate comments but cannot manage certificates, jobs, badges, or webinars.',
    'Hospital staff can run imports and support operational follow-ups without doctor-only authority.'
  ]
};
