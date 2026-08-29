/** Where to send the user after login/signup (preserves cart checkout flow). */
export function getPostAuthPath(location, fallback = '/restaurants') {
  const fromState = location.state?.from;
  if (typeof fromState === 'string' && fromState.startsWith('/')) {
    return fromState;
  }
  if (fromState?.pathname) {
    return `${fromState.pathname}${fromState.search || ''}`;
  }
  const redirect = new URLSearchParams(location.search).get('redirect');
  if (redirect?.startsWith('/')) return redirect;
  return fallback;
}

function pathWithRedirect(pathname, loginPath) {
  const path = pathname?.split('?')[0];
  return {
    pathname: loginPath,
    search: path && path !== '/restaurants' ? `?redirect=${encodeURIComponent(pathname)}` : '',
    state: pathname ? { from: pathname.startsWith('/') ? pathname : { pathname } } : undefined,
  };
}

export const loginPathWithRedirect = (pathname) => pathWithRedirect(pathname, '/login');

export const restaurantLoginPathWithRedirect = (pathname) =>
  pathWithRedirect(pathname, '/restaurant-login');
