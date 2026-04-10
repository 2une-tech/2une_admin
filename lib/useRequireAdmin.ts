import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from './store';

const PUBLIC_PATHS = new Set<string>(['/login']);

export function useRequireAdmin() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, checkAuth } = useAuthStore();
  const didInit = useRef(false);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    void checkAuth();
  }, [checkAuth]);

  const isPublic = PUBLIC_PATHS.has(pathname);

  useEffect(() => {
    if (isPublic) return;
    if (isLoading) return;
    if (!user) router.replace('/login');
    else if (user.role !== 'admin') router.replace('/forbidden');
  }, [isPublic, isLoading, user, router]);

  return {
    user,
    isLoading,
    isAllowed: isPublic || (!!user && !isLoading && user.role === 'admin'),
    isPublic,
  };
}

