import { AppPageRoute } from '../types';

export function parseCurrentRoute(pathname: string = window.location.pathname): AppPageRoute {
  const clean = pathname.replace(/\/+$/, '').toLowerCase() || '/';

  if (
    clean === '/l' ||
    clean === '/c' ||
    clean === '/loja' ||
    clean.startsWith('/loja/') ||
    clean === '/cliente' ||
    clean.startsWith('/cliente/')
  ) {
    return { page: 'CUSTOMER_STORE' };
  }

  if (
    clean === '/e' ||
    clean === '/p' ||
    clean === '/equipe' ||
    clean.startsWith('/equipe/') ||
    clean === '/empresa' ||
    clean.startsWith('/empresa/') ||
    clean === '/painel' ||
    clean.startsWith('/painel/') ||
    clean === '/pdv' ||
    clean === '/admin'
  ) {
    return { page: 'EMPLOYEE_PORTAL' };
  }

  return { page: 'HUB' };
}

export function buildRoutePath(route: AppPageRoute, short = false): string {
  switch (route.page) {
    case 'HUB':
      return '/';
    case 'CUSTOMER_STORE':
      return short ? '/l' : '/loja';
    case 'EMPLOYEE_PORTAL':
      return short ? '/e' : '/equipe';
  }
}

export function navigateToRoute(route: AppPageRoute): void {
  const targetPath = buildRoutePath(route);
  if (window.location.pathname !== targetPath) {
    window.history.pushState({}, '', targetPath);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
}

export function buildFullShareUrl(route: AppPageRoute, short = true): string {
  const path = buildRoutePath(route, short);
  if (typeof window === 'undefined') return path;
  return `${window.location.origin}${path}`;
}
