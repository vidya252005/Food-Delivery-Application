const verificationRepository = require('../repositories/verificationRepository');
const adminRepository = require('../repositories/adminRepository');
const restaurantRepository = require('../repositories/restaurantRepository');
const AppError = require('../utils/AppError');

const CRITERIA_TYPES = [
  'food_safety',
  'ingredient_transparency',
  'nutrition_info',
  'kitchen_hygiene',
  'quality_audit',
];

function mapSubmission(row) {
  if (!row) return null;
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    criteria: row.criteria || [],
    notes: row.notes,
    status: row.status,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
    reviewNotes: row.review_notes,
  };
}

function validateCriteria(criteria) {
  if (!Array.isArray(criteria) || criteria.length === 0) {
    throw new AppError('At least one verification criterion is required', 400);
  }
  for (const c of criteria) {
    if (!CRITERIA_TYPES.includes(c.type)) {
      throw new AppError(`Invalid criterion type: ${c.type}`, 400);
    }
    if (!c.evidenceUrl?.trim()) {
      throw new AppError(`Evidence URL required for ${c.type}`, 400);
    }
  }
}

async function submitRequest(restaurantId, { criteria, notes }) {
  validateCriteria(criteria);
  const restaurant = await restaurantRepository.findById(restaurantId);
  if (!restaurant) throw new AppError('Restaurant not found', 404);

  if (restaurant.verification_status === 'verified') {
    throw new AppError('Restaurant is already verified', 400);
  }

  const latest = await verificationRepository.findLatestByRestaurant(restaurantId);
  if (latest?.status === 'pending') {
    throw new AppError('A verification request is already under review', 400);
  }

  const row = await verificationRepository.createSubmission({
    restaurantId,
    criteria,
    notes,
  });

  await adminRepository.setVerificationStatus(restaurantId, 'pending');

  return mapSubmission(row);
}

async function getStatus(restaurantId) {
  const restaurant = await restaurantRepository.findById(restaurantId);
  if (!restaurant) throw new AppError('Restaurant not found', 404);
  const latest = await verificationRepository.findLatestByRestaurant(restaurantId);
  return {
    verificationStatus: restaurant.verification_status,
    latestRequest: mapSubmission(latest),
    criteriaTypes: CRITERIA_TYPES,
  };
}

async function listPendingForAdmin() {
  const rows = await verificationRepository.findPendingWithRestaurants();
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    city: r.city,
    description: r.description,
    verificationStatus: r.verification_status,
    qualityScore: r.qp_overall_score,
    request: r.request_id ? {
      id: r.request_id,
      criteria: r.criteria,
      notes: r.request_notes,
      status: r.request_status,
      submittedAt: r.submitted_at,
    } : null,
  }));
}

async function approveWithRequest(restaurantId, adminUserId, reviewNotes) {
  const latest = await verificationRepository.findLatestByRestaurant(restaurantId);
  if (latest) {
    await verificationRepository.markReviewed(latest.id, {
      status: 'approved',
      reviewedBy: adminUserId,
      reviewNotes,
    });
  }
  return adminRepository.setVerificationStatus(restaurantId, 'verified');
}

async function rejectWithRequest(restaurantId, adminUserId, reviewNotes) {
  const latest = await verificationRepository.findLatestByRestaurant(restaurantId);
  if (latest) {
    await verificationRepository.markReviewed(latest.id, {
      status: 'rejected',
      reviewedBy: adminUserId,
      reviewNotes,
    });
  }
  return adminRepository.setVerificationStatus(restaurantId, 'rejected');
}

module.exports = {
  submitRequest,
  getStatus,
  listPendingForAdmin,
  approveWithRequest,
  rejectWithRequest,
  CRITERIA_TYPES,
};
