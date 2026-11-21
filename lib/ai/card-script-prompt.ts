// 03: 주민센터에서 할 말 AI 프롬프트
import type { CardScriptRequest } from '@/lib/types';

export const CARD_SCRIPT_SYSTEM = `너는 복지 신청을 돕는 도우미 "복냥이"다.
신청하는 분이나 대신 간 가족이 주민센터 창구에서 그대로 읽으면 되는 말을 2~3문장으로 쓴다.

규칙
1. 첫 문장은 무엇을 하러 왔는지. 예: "서울형 기초보장제도 신청하러 왔어요." 추가 서류를 내러 왔으면 (answerLines가 비어 있고 supplementItems가 있으면) "추가 서류 내러 왔어요."
2. applicantType이 family면 "어머니 대신 왔어요"처럼 쓰되 관계를 모르면 "가족 대신 왔어요", other면 "신청하시는 분을 도와드리러 왔어요".
3. 둘째 문장은 가구와 집 상황 중 가장 중요한 것 한두 개 (answerLines에서). 금액에 "약"이나 "확인 필요"가 붙어 있으면 숫자를 확정해서 말하지 않는다.
4. checkLabels가 있으면 "{칸}은 정확히 몰라서 같이 확인해 주세요."처럼 부탁하는 문장을 넣는다.
5. supplementItems가 있으면 "{서류 이름} 가져왔어요."를 넣는다.
6. 쉬운 존댓말, 짧은 문장. 이름, 주민등록번호, 전화번호는 쓰지 않는다.
7. "받을 수 있어요", "대상이에요", "탈락" 같은 판정 표현과 예상 금액을 쓰지 않는다.
8. 출력은 JSON 하나뿐이다: {"script": "..."}`;

export function cardScriptUserMessage(req: CardScriptRequest): string {
  return JSON.stringify({
    programName: req.programName,
    helperMode: req.helperMode,
    applicantType: req.applicantType,
    answerLines: req.answerLines,
    checkLabels: req.checkLabels,
    supplementItems: req.supplementItems,
  });
}

/** AI가 실패할 때 쓰는 틀 문장 */
export function templateCardScript(req: CardScriptRequest): string {
  if (req.answerLines.length === 0 && req.supplementItems.length > 0) {
    return `추가 서류 내러 왔어요. ${req.supplementItems.join(', ')} 가져왔어요.`;
  }
  const parts = [`${req.programName || '서울형 기초보장제도'} 신청하러 왔어요.`];
  if (req.applicantType === 'family') parts.push('가족 대신 왔어요.');
  else if (req.applicantType === 'other') parts.push('신청하시는 분을 도와드리러 왔어요.');
  const household = req.answerLines
    .map((l) => /같이 사는 사람:\s*(\d+)명/.exec(l))
    .find(Boolean);
  if (household) parts.push(`같이 사는 사람은 ${household[1]}명이에요.`);
  if (req.checkLabels.length > 0) parts.push('정확히 모르는 것이 있어서 같이 확인해 주세요.');
  return parts.join(' ');
}
