const { mapUser, mapRestaurant, mapOrder, mapFeedback, computeNutritionSummary } = require('../../src/utils/mappers');

describe('mapUser', () => {
  test('never includes password_hash even if present on the row', () => {
    const row = {
      id: 'u1',
      name: 'Asha',
      email: 'asha@example.com',
      password_hash: '$2a$12$shouldNeverLeak',
      street: '1 MG Road',
      city: 'Bengaluru',
      state: 'KA',
      zip_code: '560001',
      phone: '9999999999',
      created_at: new Date(),
      updated_at: new Date(),
    };
    const mapped = mapUser(row);
    expect(mapped).not.toHaveProperty('password_hash');
    expect(mapped).not.toHaveProperty('passwordHash');
    expect(JSON.stringify(mapped)).not.toMatch(/shouldNeverLeak/);
  });

  test('exposes both id and _id for frontend compatibility', () => {
    const mapped = mapUser({ id: 'u1', name: 'Asha', email: 'a@x.com' });
    expect(mapped.id).toBe('u1');
    expect(mapped._id).toBe('u1');
  });

  test('nests address fields from flat snake_case columns', () => {
    const mapped = mapUser({
      id: 'u1',
      name: 'Asha',
      email: 'a@x.com',
      street: '1 MG Road',
      city: 'Bengaluru',
      state: 'KA',
      zip_code: '560001',
    });
    expect(mapped.address).toEqual({ street: '1 MG Road', city: 'Bengaluru', state: 'KA', zipCode: '560001' });
  });

  test('returns null for a null row instead of throwing', () => {
    expect(mapUser(null)).toBeNull();
  });
});

describe('mapRestaurant', () => {
  test('never includes password_hash and nests a menu array', () => {
    const row = {
      id: 'r1',
      name: 'Bella Napoli',
      email: 'b@x.com',
      password_hash: 'secret-hash',
      cuisine: ['Italian'],
      delivery_time: '30-40 min',
      min_order: '200.00',
      rating: '4.6',
      is_active: true,
    };
    const menuRows = [{ id: 'm1', restaurant_id: 'r1', name: 'Pizza', price: '380.00', available: true }];
    const mapped = mapRestaurant(row, menuRows);

    expect(mapped).not.toHaveProperty('password_hash');
    expect(mapped.menu).toHaveLength(1);
    expect(mapped.menu[0].name).toBe('Pizza');
    expect(mapped.minOrder).toBe(200);
    expect(typeof mapped.minOrder).toBe('number');
  });
});

describe('mapOrder', () => {
  test('nests a populated user/restaurant object when the joined columns are present', () => {
    const row = {
      id: 'o1',
      user_id: 'u1',
      user_name: 'Asha',
      user_email: 'a@x.com',
      restaurant_id: 'r1',
      restaurant_name: 'Bella Napoli',
      total_amount: '380.00',
      status: 'pending',
      payment_status: 'pending',
      created_at: new Date(),
      updated_at: new Date(),
    };
    const mapped = mapOrder(row, []);
    expect(mapped.user).toEqual({ id: 'u1', _id: 'u1', name: 'Asha', email: 'a@x.com' });
    expect(mapped.restaurant).toEqual({ id: 'r1', _id: 'r1', name: 'Bella Napoli' });
    expect(mapped.totalAmount).toBe(380);
  });

  test('falls back to the bare id when no join columns are present', () => {
    const row = {
      id: 'o1',
      user_id: 'u1',
      restaurant_id: 'r1',
      total_amount: '380.00',
      status: 'pending',
      payment_status: 'pending',
      created_at: new Date(),
      updated_at: new Date(),
    };
    const mapped = mapOrder(row, []);
    expect(mapped.user).toBe('u1');
    expect(mapped.restaurant).toBe('r1');
  });

  test('computes nutritionSummary from item snapshots', () => {
    const items = [
      {
        id: 'i1',
        menu_item_id: 'm1',
        name: 'Protein Bowl',
        price: '349.00',
        quantity: 2,
        calories: 580,
        protein_g: 42,
        carbs_g: 45,
        fat_g: 18,
      },
    ];
    const mapped = mapOrder({
      id: 'o1',
      user_id: 'u1',
      restaurant_id: 'r1',
      total_amount: '698.00',
      status: 'confirmed',
      payment_status: 'completed',
      created_at: new Date(),
      updated_at: new Date(),
    }, items);
    expect(mapped.nutritionSummary).toEqual({
      calories: 1160,
      proteinGrams: 84,
      carbohydrateGrams: 90,
      fatGrams: 36,
    });
  });
});

describe('computeNutritionSummary', () => {
  test('returns null when no nutrition data', () => {
    expect(computeNutritionSummary([{ quantity: 1 }])).toBeNull();
  });
});

describe('mapFeedback', () => {
  test('maps snake_case rating columns to camelCase', () => {
    const mapped = mapFeedback({
      id: 'f1',
      order_id: 'o1',
      user_id: 'u1',
      restaurant_id: 'r1',
      rating: 5,
      food_quality: 4,
      delivery_speed: 5,
      comment: 'Great!',
      created_at: new Date(),
      updated_at: new Date(),
    });
    expect(mapped.foodQuality).toBe(4);
    expect(mapped.deliverySpeed).toBe(5);
  });
});
