// 03: DEMO_MODE용 준비된 응답 (발표 안전장치)
// DEMO_MODE === 'true'이고 AI와 직접 읽기가 모두 실패했을 때만 쓴다.
// 시연 페르소나: 이순례 (76세, 노원구 상계동, 혼자 삶), 아들 김민수가 옆에서 같이 진행.
import type { AnswerValue, ExtractResult } from '@/lib/types';

function demo(value: AnswerValue, heardAs: string, isApproximate = false): ExtractResult {
  return {
    value,
    confidence: 'high',
    isApproximate,
    heardAs,
    clarifyQuestion: null,
    clarifyOptions: null,
    otherValues: [],
  };
}

export const DEMO_EXTRACT: Record<string, ExtractResult> = {
  district: { ...demo('노원구', '노원구'), otherValues: [{ key: 'dong', value: '상계동', isApproximate: false }] },
  dong: demo('상계동', '상계동'),
  household_size: demo(1, '1명 (혼자)'),
  has_family_elsewhere: demo(true, '있어요'),
  housing_type: {
    ...demo('monthly', '월세예요'),
    otherValues: [
      { key: 'deposit', value: 5_000_000, isApproximate: false },
      { key: 'monthly_rent', value: 250_000, isApproximate: false },
    ],
  },
  deposit: demo(5_000_000, '500만 원'),
  monthly_rent: demo(250_000, '25만 원'),
  has_work_income: demo(false, '없어요'),
  has_other_income: demo(true, '있어요'),
  other_income_monthly: demo(300_000, '약 30만 원', true),
  savings: demo('unknown', '잘 모름 (확인 필요)'),
  has_car: demo(false, '없어요'),
  has_debt: demo(false, '없어요'),
  applicant_type: demo('family', '가족이 대신 가요'),
  notice_method: demo('sms', '문자로 받을래요'),
};

export const DEMO_CARD_SCRIPT =
  '서울형 기초보장제도 신청하러 왔어요. 어머니 대신 왔어요. 어머니는 혼자 사시고 월세 25만 원을 내세요. 통장에 모아 둔 돈은 정확히 몰라서 같이 확인해 주세요.';

export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === 'true';
}
