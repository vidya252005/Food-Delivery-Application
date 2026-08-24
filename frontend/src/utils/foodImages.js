/**
 * Bengaluru healthy-food imagery — verified Unsplash photo IDs only (HTTP 200).
 */

const PHOTOS = {
  salad: '1512621776951-a57141f2eefd',
  salad2: '1540420773420-3366772f4999',
  bowl: '1547592166-23ac45744acd',
  superfood: '1498837167922-ddd27525d352',
  spread: '1504674900247-0877df9cc836',
  healthy: '1546069901-ba9599a7e63c',
  protein: '1555939594-58d7cb561ad1',
  protein2: '1600891964092-4316c288032e',
  grill: '1565299624946-b28f40a0ae38',
  smoothie: '1488477181946-6428a0291777',
  juice: '1509042239860-f550ce710b93',
  dessert: '1563805042-7684c019e1cb',
  restaurant: '1517248135467-4c7edcad34c4',
};

const img = (id, w = 600, h = 400) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&auto=format&q=80`;

export const DEFAULT_FALLBACK_URL = img(PHOTOS.healthy, 640, 400);

const RESTAURANT_IMAGES = {
  EatFit: img(PHOTOS.protein, 640, 400),
  'Salad Days': img(PHOTOS.salad, 640, 400),
  'Lean Crust': img(PHOTOS.grill, 640, 400),
  'The Nutri Bowl': img(PHOTOS.superfood, 640, 400),
  'Go Native': img(PHOTOS.spread, 640, 400),
  'Yogisthaan Cafe': img(PHOTOS.bowl, 640, 400),
  'FreshMenu Kitchen': img(PHOTOS.healthy, 640, 400),
  'The Purple Basil': img(PHOTOS.salad2, 640, 400),
  'Protein Chef': img(PHOTOS.protein2, 640, 400),
  YogurBerry: img(PHOTOS.smoothie, 640, 400),
  'Raw Republic': img(PHOTOS.salad2, 640, 400),
  'Green Theory': img(PHOTOS.spread, 640, 400),
  'True Elements Cafe': img(PHOTOS.superfood, 640, 400),
  'Sante Spa Cuisine': img(PHOTOS.salad, 640, 400),
  'Blue Tokai Kitchen': img(PHOTOS.juice, 640, 400),
  'HealthifyMe Kitchen': img(PHOTOS.protein, 640, 400),
  'Rameshwaram Cafe': img(PHOTOS.healthy, 640, 400),
  'California Burrito Kitchen': img(PHOTOS.grill, 640, 400),
  "Namdhari's Fresh": img(PHOTOS.spread, 640, 400),
  'Bliss Bowl Co': img(PHOTOS.superfood, 640, 400),
  'Avocado Daily': img(PHOTOS.bowl, 640, 400),
  'Lean Green Co': img(PHOTOS.salad, 640, 400),
  'Smoke House Deli': img(PHOTOS.healthy, 640, 400),
  'Burma Burma': img(PHOTOS.restaurant, 640, 400),
};

const CUISINE_IMAGES = {
  'Salads & Bowls': img(PHOTOS.salad, 400, 300),
  'Plant-Based': img(PHOTOS.bowl, 400, 300),
  Organic: img(PHOTOS.spread, 400, 300),
  Smoothies: img(PHOTOS.smoothie, 400, 300),
  'Protein Meals': img(PHOTOS.protein, 400, 300),
  Superfoods: img(PHOTOS.superfood, 400, 300),
  Salads: img(PHOTOS.salad, 400, 300),
};

export const HERO_DISH_IMAGES = {
  proteinBowl: img(PHOTOS.protein, 480, 480),
  glowSalad: img(PHOTOS.salad, 480, 480),
  ketoTray: img(PHOTOS.protein2, 480, 480),
  buddhaBowl: img(PHOTOS.bowl, 480, 480),
  acaiBowl: img(PHOTOS.superfood, 480, 480),
  greenJuice: img(PHOTOS.smoothie, 480, 480),
};

export function getMenuItemImage(name, category = '') {
  const text = `${name} ${category}`.toLowerCase();
  if (/salad|bowl|greens|kale|quinoa/.test(text)) return img(PHOTOS.salad, 400, 300);
  if (/smoothie|juice|pressed|coffee|latte|brew/.test(text)) return img(PHOTOS.smoothie, 400, 300);
  if (/plant|vegan|tofu|avocado/.test(text)) return img(PHOTOS.bowl, 400, 300);
  if (/chicken|protein|keto|macro|fish|grilled/.test(text)) return img(PHOTOS.protein, 400, 300);
  if (/acai|superfood|oats|millet|chia/.test(text)) return img(PHOTOS.superfood, 400, 300);
  if (/organic|gluten|soup|thali/.test(text)) return img(PHOTOS.spread, 400, 300);
  if (/wrap|burger|breakfast|burrito|toast/.test(text)) return img(PHOTOS.grill, 400, 300);
  return img(PHOTOS.healthy, 400, 300);
}

export function getRestaurantImage(name, cuisine = []) {
  if (name && RESTAURANT_IMAGES[name]) return RESTAURANT_IMAGES[name];
  const primary = Array.isArray(cuisine) ? cuisine[0] : cuisine;
  if (primary && CUISINE_IMAGES[primary]) return CUISINE_IMAGES[primary];
  return img(PHOTOS.restaurant, 640, 400);
}

export function getCuisineImage(cuisine) {
  return CUISINE_IMAGES[cuisine] || img(PHOTOS.healthy, 400, 300);
}

export function resolveRestaurantImage(restaurant) {
  if (!restaurant) return getRestaurantImage();
  const stored = restaurant.image;
  if (stored && !isLikelyBrokenPhotoUrl(stored)) return stored;
  return getRestaurantImage(restaurant.name, restaurant.cuisine);
}

export function resolveMenuItemImage(item) {
  if (!item) return getMenuItemImage();
  const stored = item.image;
  if (stored && !isLikelyBrokenPhotoUrl(stored)) return stored;
  return getMenuItemImage(item.name, item.category);
}

/** Known 404 Unsplash IDs previously used in seed — force client-side remap. */
const BROKEN_PHOTO_IDS = [
  '1606755969252-853c41a3fbbe',
  '1490645935967-10de803ba3a0',
  '1511690743698-d9a85e164aca',
  '1540189549336-e546e206e447',
  '1604908177527-69456864a03e',
  '1495474472287-4d71bcff808a',
  '1579584425555-d9985a4d0f2b',
  '1525351484914-7029c079ea04',
  '1546173155-315681a1c0c0',
];

function isLikelyBrokenPhotoUrl(url) {
  return BROKEN_PHOTO_IDS.some((id) => url.includes(id));
}
