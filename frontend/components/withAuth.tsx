import { ComponentType } from 'react';
import { useRequireAuth } from '../hooks/useRequireAuth';

export function withAuth<P extends object>(Component: ComponentType<P>) {
  return function AuthenticatedPage(props: P) {
    const checked = useRequireAuth();
    if (!checked) return null;
    return <Component {...props} />;
  };
}