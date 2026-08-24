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

module.exports = {
  isSelectEligible,
  getEligibilityDetails,
  MIN_SELECT_QUALITY_SCORE,
  eligibilityRules,
};
