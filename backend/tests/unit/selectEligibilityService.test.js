const selectEligibilityService = require('../../src/services/selectEligibilityService');
const { VerificationStatus } = require('../../src/domain/enums');

describe('selectEligibilityService', () => {
  test('isSelectEligible requires verified status and minimum quality score', () => {
    expect(selectEligibilityService.isSelectEligible({
      verification_status: VerificationStatus.VERIFIED,
      qp_overall_score: 90,
    })).toBe(true);
    expect(selectEligibilityService.isSelectEligible({
      verification_status: VerificationStatus.VERIFIED,
      qp_overall_score: 89,
    })).toBe(false);
    expect(selectEligibilityService.isSelectEligible({
      verification_status: VerificationStatus.PENDING,
      qp_overall_score: 95,
    })).toBe(false);
  });

  test('appendSelectEligibleSqlConditions mirrors eligibility rules', () => {
    const conditions = [];
    const values = [];
    const nextIndex = selectEligibilityService.appendSelectEligibleSqlConditions(conditions, values, 1);

    expect(conditions).toEqual([
      'r.verification_status = $1',
      'COALESCE(qp.overall_score, 0) >= $2',
    ]);
    expect(values).toEqual([VerificationStatus.VERIFIED, selectEligibilityService.MIN_SELECT_QUALITY_SCORE]);
    expect(nextIndex).toBe(3);
  });
});
