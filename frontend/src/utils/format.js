/** Indian locale formatting for FoodClub Bengaluru marketplace */
export const formatPrice = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
    .format(Number(amount) || 0);

export const formatDistance = (km) =>
  (km == null ? '' : `${Number(km).toFixed(1)} km`);

export const kmToMiles = (km) => km;
