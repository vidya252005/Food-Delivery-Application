/**
 * node scripts/seed.js                  -> small hand-authored dev dataset
 * node scripts/seed.js --scale=benchmark -> large synthetic dataset sized
 *                                           to make missing-index query
 *                                           plans visibly degrade (used by
 *                                           scripts/benchmark.js)
 */
const bcrypt = require('bcryptjs');
const { pool } = require('../src/config/db');
const { getRestaurantImage, getMenuItemImage } = require('./foodImages');

const scale = process.argv.includes('--scale=benchmark') ? 'benchmark' : 'dev';

const STATUSES = [
  'payment_pending', 'confirmed', 'restaurant_accepted', 'preparing',
  'ready_for_pickup', 'out_for_delivery', 'delivered', 'cancelled',
];
const STATUS_WEIGHTS = [3, 3, 3, 5, 5, 5, 70, 6];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function weightedStatus() {
  const total = STATUS_WEIGHTS.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < STATUSES.length; i++) {
    r -= STATUS_WEIGHTS[i];
    if (r <= 0) return STATUSES[i];
  }
  return STATUSES[0];
}

async function clearAll(client) {
  await client.query(`
    TRUNCATE notifications, deliveries, payments, delivery_partners,
      feedback, order_items, orders, menu_items, quality_profiles,
      restaurant_verification_requests,
      customer_dietary_preferences, memberships,
      restaurants, users, support_tickets RESTART IDENTITY CASCADE
  `);
}

async function seedDev(client) {
  console.log('Seeding FoodClub Bengaluru curated marketplace dataset...');
  const passwordHash = await bcrypt.hash('password123', 12);

  const { rows: users } = await client.query(
    `INSERT INTO users (name, email, password_hash, street, city, state, zip_code, phone, latitude, longitude, role)
     VALUES
       ('Priya Sharma', 'priya@example.com', $1, '5th Block, Koramangala', 'Bengaluru', 'Karnataka', '560034', '9876500001', 12.9352, 77.6245, 'user'),
       ('Arjun Reddy', 'arjun@example.com', $1, '100 Feet Road, Indiranagar', 'Bengaluru', 'Karnataka', '560038', '9876500002', 12.9784, 77.6408, 'user'),
       ('Ananya Iyer', 'ananya@example.com', $1, '4th Block, Jayanagar', 'Bengaluru', 'Karnataka', '560011', '9876500003', 12.9250, 77.5938, 'user'),
       ('FoodClub Admin', 'admin@foodclub.in', $1, 'MG Road', 'Bengaluru', 'Karnataka', '560001', '9876500000', 12.9750, 77.6063, 'admin')
     RETURNING id, name, email, role`,
    [passwordHash]
  );

  const blrRestaurants = [
    { name: 'EatFit', email: 'eatfit@example.com', cuisine: ['Protein Meals', 'Healthy Bowls'], street: '80 Feet Road, Koramangala', lat: 12.9352, lng: 77.6245, rating: 4.7, min: 199, time: '25-35 min', verified: true, score: 94, tags: ['high_protein', 'organic', 'vegetarian'], desc: 'Macro-counted healthy meals with full nutrition labels on every dish.' },
    { name: 'Salad Days', email: 'saladdays@example.com', cuisine: ['Salads & Bowls', 'Clean Eating'], street: '100 Feet Road, Indiranagar', lat: 12.9784, lng: 77.6408, rating: 4.8, min: 149, time: '20-30 min', verified: true, score: 92, tags: ['gluten_free', 'low_sugar', 'organic'], desc: 'Fresh salads and clean bowls — ingredient transparency guaranteed.' },
    { name: 'Lean Crust', email: 'leancrust@example.com', cuisine: ['Protein Meals', 'Keto'], street: 'Sector 2, HSR Layout', lat: 12.9121, lng: 77.6446, rating: 4.9, min: 249, time: '30-40 min', verified: true, score: 95, tags: ['high_protein', 'keto', 'low_sugar'], desc: 'Performance nutrition kitchen for fitness-focused Bengaluru diners.' },
    { name: 'The Nutri Bowl', email: 'nutribowl@example.com', cuisine: ['Salads & Bowls', 'Superfoods'], street: '4th Block, Jayanagar', lat: 12.9250, lng: 77.5938, rating: 4.7, min: 179, time: '25-35 min', verified: true, score: 91, tags: ['vegetarian', 'whole_food'], desc: 'Balanced grain bowls with published calorie and protein counts.' },
    { name: 'Go Native', email: 'gonative@example.com', cuisine: ['Organic', 'Whole Food'], street: 'Whitefield Main Road', lat: 12.9698, lng: 77.7500, rating: 4.8, min: 199, time: '30-40 min', verified: true, score: 93, tags: ['organic', 'vegetarian', 'whole_food'], desc: 'Farm-to-table Indian ingredients with verified sourcing profiles.' },
    { name: 'Yogisthaan Cafe', email: 'yogisthaan@example.com', cuisine: ['Plant-Based', 'Organic'], street: 'Sadashivnagar', lat: 13.0067, lng: 77.5810, rating: 4.8, min: 149, time: '20-30 min', verified: true, score: 90, tags: ['vegan', 'organic'], desc: 'Satvik vegan cafe with allergen-labelled, plant-forward menus.' },
    { name: 'FreshMenu Kitchen', email: 'freshmenu@example.com', cuisine: ['Clean Eating', 'Protein Meals'], street: 'Bellandur Outer Ring Road', lat: 12.9260, lng: 77.6762, rating: 4.6, min: 149, time: '25-35 min', verified: true, score: 89, tags: ['high_protein', 'gluten_free'], desc: 'Chef-crafted clean eating with nutrition data on every item.' },
    { name: 'The Purple Basil', email: 'purplebasil@example.com', cuisine: ['Plant-Based', 'Salads & Bowls'], street: 'Brigade Road', lat: 12.9716, lng: 77.6070, rating: 4.7, min: 179, time: '20-30 min', verified: true, score: 92, tags: ['vegan', 'organic'], desc: 'Plant-based bowls and cold-pressed juices with quality verification.' },
    { name: 'Protein Chef', email: 'proteinchef@example.com', cuisine: ['Protein Meals', 'Macro'], street: 'Marathahalli', lat: 12.9591, lng: 77.6974, rating: 4.8, min: 249, time: '30-40 min', verified: true, score: 96, tags: ['high_protein', 'keto'], desc: 'Athlete-grade macro meals with verified protein sourcing.' },
    { name: 'YogurBerry', email: 'yogurberry@example.com', cuisine: ['Smoothies', 'Low Sugar'], street: 'Forum Mall, Koramangala', lat: 12.9345, lng: 77.6100, rating: 4.5, min: 99, time: '15-25 min', verified: false, score: 82, tags: ['low_sugar', 'vegetarian'], desc: 'Frozen yoghurt and smoothie bowls — pending quality verification.' },
    { name: 'Raw Republic', email: 'rawrepublic@example.com', cuisine: ['Salads & Bowls', 'Organic'], street: '4th Block, Jayanagar', lat: 12.9240, lng: 77.5920, rating: 4.7, min: 169, time: '20-30 min', verified: true, score: 91, tags: ['organic', 'gluten_free'], desc: 'Raw salads and cold bowls with transparent ingredient sourcing.' },
    { name: 'Green Theory', email: 'greentheory@example.com', cuisine: ['Organic', 'Plant-Based'], street: 'Sarjapur Road', lat: 12.9060, lng: 77.6850, rating: 4.8, min: 189, time: '25-35 min', verified: true, score: 93, tags: ['organic', 'vegan'], desc: 'Organic plant-forward kitchen with seasonal Bengaluru produce.' },
    { name: 'True Elements Cafe', email: 'trueelements@example.com', cuisine: ['Superfoods', 'Organic'], street: 'Bellandur', lat: 12.9280, lng: 77.6780, rating: 4.6, min: 149, time: '20-30 min', verified: true, score: 90, tags: ['whole_food', 'organic'], desc: 'Superfood bowls, seeds, and whole-grain meal kits.' },
    { name: 'Sante Spa Cuisine', email: 'santespa@example.com', cuisine: ['Plant-Based', 'Organic'], street: '12th Main, Indiranagar', lat: 12.9790, lng: 77.6420, rating: 4.9, min: 299, time: '30-40 min', verified: true, score: 94, tags: ['vegan', 'organic'], desc: 'Spa-inspired plant cuisine with detailed nutrition panels.' },
    { name: 'Blue Tokai Kitchen', email: 'bluetokai@example.com', cuisine: ['Smoothies', 'Clean Eating'], street: 'Koramangala 5th Block', lat: 12.9360, lng: 77.6220, rating: 4.7, min: 129, time: '15-25 min', verified: true, score: 88, tags: ['low_sugar', 'vegetarian'], desc: 'Cold brew, smoothies, and light clean-eating plates.' },
    { name: 'HealthifyMe Kitchen', email: 'healthifyme@example.com', cuisine: ['Protein Meals', 'Macro'], street: 'HSR Layout Sector 1', lat: 12.9140, lng: 77.6420, rating: 4.8, min: 219, time: '25-35 min', verified: true, score: 95, tags: ['high_protein', 'low_sugar'], desc: 'Dietitian-designed macro meals for Bengaluru professionals.' },
    { name: 'Rameshwaram Cafe', email: 'rameshwaram@example.com', cuisine: ['Organic', 'Whole Food'], street: 'JP Nagar 7th Phase', lat: 12.8980, lng: 77.5780, rating: 4.6, min: 149, time: '20-30 min', verified: true, score: 87, tags: ['vegetarian', 'whole_food'], desc: 'Heritage South Indian plates with organic millet options.' },
    { name: 'California Burrito Kitchen', email: 'californiaburrito@example.com', cuisine: ['Salads & Bowls', 'Protein Meals'], street: 'BTM Layout 2nd Stage', lat: 12.9160, lng: 77.6100, rating: 4.5, min: 179, time: '25-35 min', verified: true, score: 86, tags: ['high_protein', 'gluten_free'], desc: 'Healthy burrito bowls with published macros on every build.' },
    { name: "Namdhari's Fresh", email: 'namdhari@example.com', cuisine: ['Organic', 'Salads & Bowls'], street: 'Whitefield Hope Farm', lat: 12.9870, lng: 77.7380, rating: 4.7, min: 159, time: '25-35 min', verified: true, score: 90, tags: ['organic', 'vegetarian'], desc: 'Farm-fresh organic salads and produce-led bowls.' },
    { name: 'Bliss Bowl Co', email: 'blissbowl@example.com', cuisine: ['Superfoods', 'Smoothies'], street: 'Malleshwaram 8th Cross', lat: 13.0030, lng: 77.5690, rating: 4.8, min: 169, time: '20-30 min', verified: true, score: 92, tags: ['vegan', 'whole_food'], desc: 'Acai, chia, and adaptogen bowls with full nutrition labels.' },
    { name: 'Avocado Daily', email: 'avocadodaily@example.com', cuisine: ['Plant-Based', 'Salads & Bowls'], street: 'Cunningham Road', lat: 12.9890, lng: 77.5920, rating: 4.7, min: 199, time: '20-30 min', verified: true, score: 91, tags: ['vegan', 'high_protein'], desc: 'Avocado-forward plant bowls and open toasts.' },
    { name: 'Lean Green Co', email: 'leangreen@example.com', cuisine: ['Salads & Bowls', 'Low Sugar'], street: 'MG Road', lat: 12.9750, lng: 77.6060, rating: 4.6, min: 159, time: '20-30 min', verified: true, score: 89, tags: ['low_sugar', 'gluten_free'], desc: 'Quick-service salad bar for MG Road office crowds.' },
    { name: 'Smoke House Deli', email: 'smokehouse@example.com', cuisine: ['Salads & Bowls', 'Healthy Breakfast'], street: 'Lavelle Road', lat: 12.9718, lng: 77.5964, rating: 4.6, min: 199, time: '25-35 min', verified: true, score: 87, tags: ['vegetarian', 'organic'], desc: 'Wholesome breakfast and salad bar with seasonal menus.' },
    { name: 'Burma Burma', email: 'burmaburma@example.com', cuisine: ['Plant-Based', 'Vegetarian'], street: '12th Main, Indiranagar', lat: 12.9784, lng: 77.6415, rating: 4.9, min: 249, time: '30-40 min', verified: true, score: 88, tags: ['vegetarian', 'vegan'], desc: 'Vegetarian Burmese kitchen with transparent ingredient lists.' },
  ];

  const restaurants = [];
  for (const r of blrRestaurants) {
    const verificationStatus = r.verified ? 'verified' : 'pending';
    const { rows } = await client.query(
      `INSERT INTO restaurants (name, email, password_hash, cuisine, street, city, state, zip_code, phone,
         delivery_time, min_order, rating, is_active, latitude, longitude, image,
         description, verification_status, supported_dietary_tags)
       VALUES ($1, $2, $3, $4, $5, 'Bengaluru', 'Karnataka', '560001', $6, $7, $8, $9, true, $10, $11, $12, $13, $14, $15)
       RETURNING id, name`,
      [r.name, r.email, passwordHash, r.cuisine, r.street, `98${Math.floor(Math.random() * 900000000 + 100000000)}`, r.time, r.min, r.rating, r.lat, r.lng, getRestaurantImage(r.name, r.cuisine), r.desc, verificationStatus, r.tags]
    );
    const restaurant = rows[0];
    restaurants.push(restaurant);

    const ingredient = r.score + Math.floor(Math.random() * 3) - 1;
    const transparency = r.score - 2 + Math.floor(Math.random() * 4);
    const safety = Math.min(100, r.score + 2);
    const consistency = r.score - 4 + Math.floor(Math.random() * 6);
    const badges = ['nutrition_info_available'];
    if (r.verified) badges.push('verified_restaurant');
    if (r.tags.includes('high_protein')) badges.push('high_protein_options');
    if (r.tags.includes('organic')) badges.push('organic_options');
    if (r.tags.includes('vegetarian') || r.tags.includes('vegan')) badges.push('vegetarian_friendly');
    if (r.verified && r.score >= 90) badges.push('select_eligible');

    await client.query(
      `INSERT INTO quality_profiles
         (restaurant_id, overall_score, ingredient_score, transparency_score, food_safety_score, consistency_score, badges)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [restaurant.id, r.score, ingredient, transparency, safety, consistency, badges]
    );
  }

  // Priya is a FoodClub Select member with dietary preferences
  await client.query(
    `INSERT INTO memberships (user_id, tier, status, start_date, expiry_date)
     VALUES ($1, 'select', 'active', now(), now() + interval '1 year')`,
    [users[0].id]
  );
  await client.query(
    `INSERT INTO customer_dietary_preferences (user_id, dietary_tags, allergens_to_avoid, max_calories, min_protein_g)
     VALUES ($1, $2, $3, $4, $5)`,
    [users[0].id, ['high_protein', 'organic'], ['peanuts'], 650, 30]
  );

  const menuByRestaurant = {
    EatFit: [
      ['Grilled Chicken Bowl', 'Brown rice, greens, peri-peri chicken — 42g protein', 349, 'Protein Meals'],
      ['Paneer Power Salad', 'Cottage cheese, quinoa, roasted veggies', 299, 'Salads & Bowls'],
      ['Turmeric Lentil Soup', 'Anti-inflammatory, coconut base, millets', 199, 'Organic'],
    ],
    'Salad Days': [
      ['Rainbow Glow Bowl', 'Roasted sweet potato, kale, tahini, seeds', 329, 'Salads & Bowls'],
      ['Grilled Fish Plate', 'Omega-3 fish, millet, heritage greens', 449, 'Protein Meals'],
      ['Green Detox Juice', 'Cold-pressed spinach, cucumber, ginger', 149, 'Smoothies'],
    ],
    'Lean Crust': [
      ['Keto Chicken Tray', 'Grilled chicken, avocado, asparagus', 399, 'Protein Meals'],
      ['Low-Carb Buddha Bowl', 'Cauliflower rice, tofu, sesame dressing', 349, 'Plant-Based'],
      ['Protein Smoothie', 'Whey, almond butter, banana', 249, 'Smoothies'],
    ],
    'The Nutri Bowl': [
      ['Millet Power Bowl', 'Foxtail millet, seasonal veg, lemon dressing', 279, 'Salads & Bowls'],
      ['Macro Prep Box', 'Balanced protein, complex carbs, greens', 499, 'Protein Meals'],
      ['Energy Bites', 'Dates, almonds, dark cacao — 4 pcs', 149, 'Superfoods'],
    ],
    'Go Native': [
      ['Farm Fresh Thali', 'Seasonal organic veg, millet roti, ghee', 349, 'Organic'],
      ['Sprouted Moong Bowl', 'Sprouts, coconut, curry leaves', 249, 'Whole Food'],
      ['Heritage Ragi Smoothie', 'Ragi, jaggery, cardamom', 179, 'Smoothies'],
    ],
    'Yogisthaan Cafe': [
      ['Satvik Buddha Bowl', 'Brown rice, seasonal veg, coconut chutney', 299, 'Plant-Based'],
      ['Vegan Protein Wrap', 'Tofu, hummus, pickled veg', 279, 'Plant-Based'],
      ['Raw Cacao Mousse', 'Dairy-free, jaggery-sweetened', 199, 'Organic'],
    ],
    'Burma Burma': [
      ['Tea Leaf Salad', 'Fermented tea leaves, nuts, lime', 349, 'Vegetarian'],
      ['Khow Suey Bowl', 'Coconut curry, noodles, toppings', 379, 'Asian'],
      ['Tofu Laphat Thoke', 'Spiced tofu salad, peanuts', 299, 'Vegetarian'],
    ],
    'FreshMenu Kitchen': [
      ['Quinoa Power Salad', 'Gluten-free quinoa, roasted veg', 329, 'Gluten-Free'],
      ['Herb Grilled Chicken', 'Free-range chicken, seasonal greens', 399, 'Protein Meals'],
      ['Cold-Pressed Green Juice', 'Spinach, apple, lemon, ginger', 149, 'Smoothies'],
    ],
    'The Purple Basil': [
      ['Acai Superfood Bowl', 'Organic acai, granola, berries', 349, 'Superfoods'],
      ['Plant Protein Wrap', 'Tempeh, avocado, wholegrain roti', 299, 'Plant-Based'],
      ['Immunity Shot', 'Turmeric, ginger, amla', 99, 'Smoothies'],
    ],
    'Smoke House Deli': [
      ['Avocado Toast & Eggs', 'Sourdough, heritage tomatoes', 349, 'Healthy Breakfast'],
      ['Overnight Oats Jar', 'Chia, almond milk, berries', 249, 'Superfoods'],
      ['Flat White', 'Single-origin, oat milk available', 149, 'Smoothies'],
    ],
    YogurBerry: [
      ['Berry Yogurt Bowl', 'Frozen yoghurt, mixed berries, granola', 199, 'Smoothies'],
      ['Mango Protein Parfait', 'Greek yoghurt, chia, honey', 249, 'Low Sugar'],
      ['Green Goddess Smoothie', 'Spinach, banana, almond milk', 179, 'Smoothies'],
    ],
    'Protein Chef': [
      ['Lean Muscle Plan', 'Grilled chicken, sweet potato, broccoli', 449, 'Protein Meals'],
      ['Vegan Performance Box', 'Tempeh, quinoa, roasted roots', 399, 'Plant-Based'],
      ['Keto Fish Tray', 'Grilled fish, asparagus, lemon butter', 499, 'Protein Meals'],
    ],
    'Raw Republic': [
      ['Detox Green Bowl', 'Kale, avocado, hemp seeds, lemon tahini', 319, 'Salads & Bowls'],
      ['Raw Zucchini Pasta', 'Spiralized zucchini, pesto, cherry tomatoes', 349, 'Salads & Bowls'],
      ['Activated Charcoal Lemonade', 'Cold-pressed, low sugar', 129, 'Smoothies'],
    ],
    'Green Theory': [
      ['Organic Millet Bowl', 'Foxtail millet, farm greens, coconut', 289, 'Organic'],
      ['Seasonal Farm Salad', 'Heirloom veg, pumpkin seeds', 269, 'Organic'],
      ['Cold-Pressed Beet Juice', 'Beetroot, apple, ginger', 149, 'Smoothies'],
    ],
    'True Elements Cafe': [
      ['Chia Superfood Pudding', 'Chia, almond milk, berries', 249, 'Superfoods'],
      ['Quinoa Protein Salad', 'Tri-color quinoa, chickpeas, feta', 329, 'Superfoods'],
      ['Moringa Energy Shot', 'Moringa, wheatgrass, lemon', 99, 'Superfoods'],
    ],
    'Sante Spa Cuisine': [
      ['Spa Detox Bowl', 'Steamed greens, tofu, miso ginger', 399, 'Plant-Based'],
      ['Raw Pad Thai Salad', 'Kelp noodles, peanut dressing', 369, 'Plant-Based'],
      ['Golden Turmeric Latte', 'Oat milk, turmeric, pepper', 179, 'Smoothies'],
    ],
    'Blue Tokai Kitchen': [
      ['Cold Brew & Oats Jar', 'Overnight oats, cold brew shot', 229, 'Smoothies'],
      ['Berry Protein Smoothie', 'Whey, mixed berries, flax', 249, 'Smoothies'],
      ['Avocado Sourdough Toast', 'Heritage sourdough, avocado, seeds', 279, 'Clean Eating'],
    ],
    'HealthifyMe Kitchen': [
      ['1500 kcal Day Plan', 'Balanced lunch tray — chicken, rice, veg', 449, 'Protein Meals'],
      ['High Protein Veg Box', 'Paneer, quinoa, roasted broccoli', 399, 'Protein Meals'],
      ['Post-Workout Shake', 'Whey, banana, peanut butter', 199, 'Protein Meals'],
    ],
    'Rameshwaram Cafe': [
      ['Organic Millet Idli Plate', 'Foxtail millet idli, sambar, chutney', 199, 'Organic'],
      ['Filter Coffee & Ragi Malt', 'Single estate coffee, ragi', 149, 'Organic'],
      ['Ghee Roast Poha Bowl', 'Red poha, peanuts, curry leaves', 179, 'Whole Food'],
    ],
    'California Burrito Kitchen': [
      ['Grilled Chicken Burrito Bowl', 'Brown rice, black beans, salsa', 349, 'Salads & Bowls'],
      ['Veggie Power Bowl', 'Quinoa, roasted peppers, guacamole', 299, 'Salads & Bowls'],
      ['Protein Salad Box', 'Mixed greens, grilled paneer', 329, 'Protein Meals'],
    ],
    "Namdhari's Fresh": [
      ['Farm Harvest Salad', 'Mixed leaves, seasonal veg, vinaigrette', 249, 'Salads & Bowls'],
      ['Organic Veg Thali', 'Seasonal sabzi, millet roti, salad', 329, 'Organic'],
      ['Fresh Pressed Orange', 'Namdhari farm oranges', 129, 'Smoothies'],
    ],
    'Bliss Bowl Co': [
      ['Acai Bliss Bowl', 'Organic acai, granola, coconut', 349, 'Superfoods'],
      ['Pitaya Power Bowl', 'Dragon fruit, chia, almond butter', 379, 'Superfoods'],
      ['Adaptogen Latte', 'Reishi, oat milk, cacao', 199, 'Superfoods'],
    ],
    'Avocado Daily': [
      ['Double Avocado Toast', 'Sourdough, heritage tomato, seeds', 299, 'Plant-Based'],
      ['Avocado Protein Bowl', 'Avocado, edamame, brown rice', 349, 'Plant-Based'],
      ['Green Goddess Wrap', 'Avocado, hummus, pickled veg', 279, 'Salads & Bowls'],
    ],
    'Lean Green Co': [
      ['Classic Caesar Salad', 'Romaine, parmesan, light dressing', 269, 'Salads & Bowls'],
      ['Asian Crunch Bowl', 'Slaw, sesame tofu, peanut lime', 299, 'Salads & Bowls'],
      ['Low-Sugar Fruit Pot', 'Seasonal fruit, no added sugar', 149, 'Low Sugar'],
    ],
  };

  const nutritionTemplates = {
    salad: { calories: 420, protein: 18, carbs: 32, fat: 22, sugar: 6, fiber: 9, tags: ['vegetarian', 'organic'], allergens: ['sesame'], prep: 12 },
    protein: { calories: 580, protein: 42, carbs: 38, fat: 18, sugar: 5, fiber: 6, tags: ['high_protein'], allergens: ['fish'], prep: 18 },
    vegan: { calories: 490, protein: 16, carbs: 52, fat: 20, sugar: 8, fiber: 11, tags: ['vegan', 'whole_food'], allergens: ['soy'], prep: 15 },
    smoothie: { calories: 180, protein: 4, carbs: 28, fat: 5, sugar: 18, fiber: 3, tags: ['organic', 'low_sugar'], allergens: [], prep: 5 },
    default: { calories: 450, protein: 22, carbs: 40, fat: 16, sugar: 7, fiber: 5, tags: ['vegetarian'], allergens: ['wheat'], prep: 15 },
  };

  function nutritionFor(category) {
    const c = (category || '').toLowerCase();
    if (c.includes('salad') || c.includes('bowl')) return nutritionTemplates.salad;
    if (c.includes('protein') || c.includes('poke') || c.includes('macro')) return nutritionTemplates.protein;
    if (c.includes('plant') || c.includes('vegan')) return nutritionTemplates.vegan;
    if (c.includes('smoothie') || c.includes('juice') || c.includes('coffee')) return nutritionTemplates.smoothie;
    return nutritionTemplates.default;
  }

  const menuItemsByRestaurantId = {};
  for (const r of restaurants) {
    const items = menuByRestaurant[r.name] || [['Special Dish', 'House special', 199, 'Mains']];
    menuItemsByRestaurantId[r.id] = [];
    for (const [name, description, price, category] of items) {
      const n = nutritionFor(category);
      const { rows } = await client.query(
        `INSERT INTO menu_items
           (restaurant_id, name, description, price, category, image, available,
            calories, protein_g, carbs_g, fat_g, sugar_g, fiber_g, dietary_tags, allergens, prep_time_minutes)
         VALUES ($1, $2, $3, $4, $5, $6, true, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         RETURNING id, name, price, calories, protein_g, carbs_g, fat_g, sugar_g, fiber_g, dietary_tags, allergens`,
        [r.id, name, description, price, category, getMenuItemImage(name, category),
          n.calories, n.protein, n.carbs, n.fat, n.sugar, n.fiber, n.tags, n.allergens, n.prep]
      );
      menuItemsByRestaurantId[r.id].push(rows[0]);
    }
  }

  const partnerLocations = [
    { name: 'Ravi Kumar', email: 'ravi.partner@example.com', lat: 12.9350, lng: 77.6240 },
    { name: 'Meera Nair', email: 'meera.partner@example.com', lat: 12.9780, lng: 77.6410 },
    { name: 'Karthik S', email: 'karthik.partner@example.com', lat: 12.9120, lng: 77.6450 },
    { name: 'Divya Rao', email: 'divya.partner@example.com', lat: 12.9716, lng: 77.5946 },
  ];
  for (const p of partnerLocations) {
    await client.query(
      `INSERT INTO delivery_partners (name, email, password_hash, phone, latitude, longitude, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'available')`,
      [p.name, p.email, passwordHash, '9876500100', p.lat, p.lng]
    );
  }

  for (let i = 0; i < 8; i++) {
    const user = pick(users.filter((u) => u.role !== 'admin'));
    const restaurant = pick(restaurants);
    const items = menuItemsByRestaurantId[restaurant.id].slice(0, 2);
    const totalAmount = items.reduce((sum, it) => sum + Number(it.price), 0);

    const { rows: orderRows } = await client.query(
      `INSERT INTO orders (user_id, restaurant_id, total_amount, street, city, state, zip_code, status, eta_minutes)
       VALUES ($1, $2, $3, '5th Block Koramangala', 'Bengaluru', 'Karnataka', '560034', $4, $5)
       RETURNING id`,
      [user.id, restaurant.id, totalAmount, weightedStatus(), 25 + Math.floor(Math.random() * 20)]
    );
    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (
           order_id, menu_item_id, name, price, quantity,
           calories, protein_g, carbs_g, fat_g, sugar_g, fiber_g, dietary_tags, allergens
         )
         VALUES ($1, $2, $3, $4, 1, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          orderRows[0].id,
          item.id,
          item.name,
          item.price,
          item.calories,
          item.protein_g,
          item.carbs_g,
          item.fat_g,
          item.sugar_g,
          item.fiber_g,
          item.dietary_tags || [],
          item.allergens || [],
        ]
      );
    }
  }

  console.log(`Seeded ${users.length} users, ${restaurants.length} restaurants, ${partnerLocations.length} delivery partners.`);
  console.log('Customer: priya@example.com (FoodClub Select) / password123');
  console.log('Also: arjun@example.com, ananya@example.com / password123');
  console.log('Admin: admin@foodclub.in / password123');
}

/**
 * Set-based generation via generate_series instead of one INSERT per
 * row from Node - a few round trips moving hundreds of thousands of
 * rows, rather than hundreds of thousands of round trips.
 */
async function seedBenchmark(client) {
  console.log('Seeding large synthetic dataset for benchmarking (this seeds ~300k orders, may take a bit)...');
  const passwordHash = await bcrypt.hash('password123', 12);

  await client.query(
    `INSERT INTO restaurants (name, email, password_hash, cuisine, city, is_active)
     SELECT
       'Restaurant ' || g,
       'restaurant' || g || '@bench.test',
       $1,
       ARRAY[(ARRAY['Indian','Chinese','Italian','Mexican','Thai','Continental','Fast Food','Bakery'])[1 + (g % 8)]],
       (ARRAY['Bengaluru','Mumbai','Delhi','Hyderabad','Chennai','Pune'])[1 + (g % 6)],
       true
     FROM generate_series(1, 200) AS g`,
    [passwordHash]
  );

  await client.query(
    `INSERT INTO menu_items (restaurant_id, name, price, category, available)
     SELECT r.id, 'Item ' || s, (50 + (s * 7) % 400)::numeric, 'Main Course', true
     FROM restaurants r, generate_series(1, 15) AS s`
  );

  await client.query(
    `INSERT INTO users (name, email, password_hash, city)
     SELECT
       'Bench User ' || g,
       'user' || g || '@bench.test',
       $1,
       (ARRAY['Bengaluru','Mumbai','Delhi','Hyderabad','Chennai','Pune'])[1 + (g % 6)]
     FROM generate_series(1, 20000) AS g`,
    [passwordHash]
  );

  console.log('  restaurants + menu + users done, generating ~300k orders...');

  // Orders reference users/restaurants by indexing into a pre-aggregated
  // id array (O(1) per row) rather than `OFFSET n LIMIT 1` (O(n) per row -
  // at 300k rows against a 20k-row offset that's billions of row touches
  // and never finishes in reasonable time). array_agg runs once via the
  // CROSS JOINs below, not once per generated row.
  await client.query(`
    INSERT INTO orders (user_id, restaurant_id, total_amount, status, created_at)
    SELECT
      uids.ids[1 + (g % array_length(uids.ids, 1))],
      rids.ids[1 + (g % array_length(rids.ids, 1))],
      (100 + (g % 900))::numeric,
      (ARRAY[
        'payment_pending','confirmed','restaurant_accepted','preparing',
        'ready_for_pickup','out_for_delivery',
        'delivered','delivered','delivered','cancelled'
      ])[1 + (g % 10)],
      now() - ((g % 365) || ' days')::interval
    FROM generate_series(1, 300000) AS g
    CROSS JOIN (SELECT array_agg(id) AS ids FROM users) AS uids
    CROSS JOIN (SELECT array_agg(id) AS ids FROM restaurants) AS rids
  `);

  const { rows: counts } = await client.query(`
    SELECT
      (SELECT COUNT(*) FROM restaurants) AS restaurants,
      (SELECT COUNT(*) FROM menu_items) AS menu_items,
      (SELECT COUNT(*) FROM users) AS users,
      (SELECT COUNT(*) FROM orders) AS orders
  `);
  console.log('Seeded:', counts[0]);
}

async function main() {
  const client = await pool.connect();
  try {
    await clearAll(client);
    if (scale === 'benchmark') {
      await seedBenchmark(client);
    } else {
      await seedDev(client);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
