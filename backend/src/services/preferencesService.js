const preferencesRepository = require('../repositories/preferencesRepository');

function mapPreferences(row) {
  if (!row) {
    return {
      dietaryTags: [],
      allergensToAvoid: [],
      maxCalories: null,
      minProteinGrams: null,
    };
  }
  return {
    dietaryTags: row.dietary_tags || [],
    allergensToAvoid: row.allergens_to_avoid || [],
    maxCalories: row.max_calories,
    minProteinGrams: row.min_protein_g,
    updatedAt: row.updated_at,
  };
}

async function getPreferences(userId) {
  const row = await preferencesRepository.findByUserId(userId);
  return mapPreferences(row);
}

async function updatePreferences(userId, prefs) {
  const row = await preferencesRepository.upsert(userId, prefs);
  return mapPreferences(row);
}

module.exports = { getPreferences, updatePreferences, mapPreferences };
