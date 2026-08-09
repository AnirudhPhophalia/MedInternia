import { ComponentType } from 'react';
import { useRequireAuth } from '../hooks/useRequireAuth';

export function withAuth<P extends object>(Component: ComponentType<P>) {
  return function AuthenticatedPage(props: P) {
    const { isReady } = useRequireAuth();
    if (!isReady) return null;
    return <Component {...props} />;
  };
}
