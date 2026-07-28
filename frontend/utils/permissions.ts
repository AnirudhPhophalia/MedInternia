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
