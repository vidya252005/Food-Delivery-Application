/**
 * Normalize auth API envelope:
 * { status: 'success', token, data: { role, user | restaurant } }
 *
 * Role lives on data.role — not on the login() default alone.
 */
export function parseAuthResponse(response) {
  if (!response?.token) {
    throw new Error('Invalid auth response: missing token');
  }

  const role = response.data?.role
    ?? response.data?.user?.role
    ?? (response.data?.restaurant ? 'restaurant' : 'user');

  return {
    token: response.token,
    role,
    user: response.data?.user ?? null,
    restaurant: response.data?.restaurant ?? null,
  };
}

export function parseRestaurantAuthResponse(response) {
  const parsed = parseAuthResponse(response);
  if (!parsed.restaurant) {
    throw new Error('Invalid auth response: missing restaurant');
  }
  return parsed;
}

export function parseUserAuthResponse(response) {
  const parsed = parseAuthResponse(response);
  if (!parsed.user) {
    throw new Error('Invalid auth response: missing user');
  }
  return parsed;
}
