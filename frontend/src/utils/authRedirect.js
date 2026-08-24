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

export const loginPathWithRedirect = (pathname) => ({
  pathname: '/login',
  search: pathname && pathname !== '/restaurants' ? `?redirect=${encodeURIComponent(pathname)}` : '',
  state: pathname ? { from: { pathname } } : undefined,
});
