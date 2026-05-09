export type Role = 'learner' | 'educator' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}

export const ROLE_ROUTES: Record<Role, string> = {
  learner: '/learner',
  educator: '/educator',
  admin: '/admin',
};

export const PUBLIC_ROUTES = ['/', '/login', '/signup', '/access-denied'];

export const ROLE_PATHS: Record<Role, string[]> = {
  learner: ['/learner'],
  educator: ['/educator'],
  admin: ['/admin'],
};

export function getDashboardForRole(role: Role | null | undefined): string {
  if (role && ROLE_ROUTES[role]) return ROLE_ROUTES[role];
  return '/login';
}

export function canAccess(role: Role | null, pathname: string): boolean {
  if (!role) return PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'));
  if (role === 'admin') return true; // admin can access everything
  return ROLE_PATHS[role]?.some((prefix) => pathname.startsWith(prefix)) ?? false;
}
