const { VerificationStatus } = require('../domain/enums');

const MIN_SELECT_QUALITY_SCORE = 90;

/** Composable eligibility rules (LLD section 81). */
const eligibilityRules = [
  {
    name: 'MinimumQualityScore',
    evaluate(restaurant) {
      const score = restaurant.qualityProfile?.overallScore ?? restaurant.qp_overall_score ?? 0;
      return score >= MIN_SELECT_QUALITY_SCORE;
    },
  },
  {
    name: 'VerifiedRestaurant',
    evaluate(restaurant) {
      const status = restaurant.verificationStatus ?? restaurant.verification_status;
      return status === VerificationStatus.VERIFIED;
    },
  },
];

function isSelectEligible(restaurant) {
  return eligibilityRules.every((rule) => rule.evaluate(restaurant));
}

function getEligibilityDetails(restaurant) {
  return eligibilityRules.map((rule) => ({
    rule: rule.name,
    passed: rule.evaluate(restaurant),
  }));
}

/**
 * Append parameterized SQL WHERE clauses mirroring eligibilityRules.
 * Keeps discover/list queries aligned with isSelectEligible().
 */
function appendSelectEligibleSqlConditions(conditions, values, startIndex, opts = {}) {
  const restaurantAlias = opts.restaurantAlias || 'r';
  const qualityAlias = opts.qualityAlias || 'qp';
  let i = startIndex;
  conditions.push(`${restaurantAlias}.verification_status = $${i++}`);
  values.push(VerificationStatus.VERIFIED);
  conditions.push(`COALESCE(${qualityAlias}.overall_score, 0) >= $${i++}`);
  values.push(MIN_SELECT_QUALITY_SCORE);
  return i;
}

module.exports = {
  isSelectEligible,
  getEligibilityDetails,
  appendSelectEligibleSqlConditions,
  MIN_SELECT_QUALITY_SCORE,
  eligibilityRules,
};
