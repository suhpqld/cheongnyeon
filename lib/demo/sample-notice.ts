const DAY_MS = 24 * 60 * 60 * 1000;

export const SAMPLE_NOTICE_ITEMS = [
  "임대차계약서 사본 1부 (확정일자 날인본)",
  "최근 3개월간 본인 명의 전 금융기관 거래내역서",
  "부양의무자(자녀) 금융정보 등 제공 동의서",
] as const;

export function addDays(date: string, days: number): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) throw new Error("날짜 형식이 올바르지 않습니다.");
  return new Date(parsed.getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

export function noticeDeadline(today: string, version: 1 | 2 | 3 = 1): string {
  return addDays(today, version === 3 ? 5 : 7);
}

export function sampleNoticeText(today: string): string {
  const [year, month, day] = noticeDeadline(today).split("-").map(Number);
  return `[시연용 예시]
사회보장급여 신청 관련 보완 서류 제출 요청

수신: ○○○ 귀하

귀하께서 신청하신 서울형 기초보장제도 관련 소득 재산 조사를 위하여
아래 서류의 보완 제출을 요청드립니다.

1. ${SAMPLE_NOTICE_ITEMS[0]}
2. ${SAMPLE_NOTICE_ITEMS[1]}
3. ${SAMPLE_NOTICE_ITEMS[2]}

제출기한: ${year}년 ${month}월 ${day}일까지
기한 내 미제출 시 신청이 각하될 수 있음을 알려드립니다.

제출처: ○○동 주민센터 맞춤형복지팀 (담당자 ○○○, 02-0000-0000)`;
}

// AI 장애 때만 쓰는 시연용 결과. 실제 주민센터 문서의 결과로 표시하지 않는다.
export function sampleNoticeResult(today: string) {
  const deadline = noticeDeadline(today);
  const [year, month, day] = deadline.split("-").map(Number);
  return {
    programName: "서울형 기초보장제도",
    items: [
      {
        name: SAMPLE_NOTICE_ITEMS[0],
        originalText: `1. ${SAMPLE_NOTICE_ITEMS[0]}`,
        easyName: "집 계약서 복사본",
        easyExplain: "집을 빌릴 때 쓴 계약서를 복사해서 챙겨 주세요.",
        issuePlace: "집에 있는 계약서를 복사해 주세요",
        placeGroup: "home" as const,
      },
      {
        name: SAMPLE_NOTICE_ITEMS[1],
        originalText: `2. ${SAMPLE_NOTICE_ITEMS[1]}`,
        easyName: "통장 거래 내역",
        easyExplain: "최근 3개월 동안 돈이 들어오고 나간 기록이에요.",
        issuePlace: "은행에 물어보세요",
        placeGroup: "bank" as const,
      },
      {
        name: SAMPLE_NOTICE_ITEMS[2],
        originalText: `3. ${SAMPLE_NOTICE_ITEMS[2]}`,
        easyName: "자녀 동의서",
        easyExplain: "자녀의 금융정보 확인에 동의한다는 서류예요.",
        issuePlace: "주민센터에 물어보세요",
        placeGroup: "onsite" as const,
      },
    ],
    deadline,
    deadlineOriginalText: `제출기한: ${year}년 ${month}월 ${day}일까지`,
    officeName: "○○동 주민센터 맞춤형복지팀",
    officeContact: "02-0000-0000",
    hardWords: [{ word: "각하", easy: "신청이 받아들여지지 않고 끝나요" }],
    consequenceEasy: "기한 안에 내지 않으면 신청이 끝날 수 있어요.",
    summaryEasy: `${month}월 ${day}일까지 서류 세 가지를 ○○동 주민센터에 내 주세요.`,
  };
}

export const SAMPLE_NOTICE_TEXT = sampleNoticeText;
