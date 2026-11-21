import { connection } from "next/server";
import { noticeDeadline, SAMPLE_NOTICE_ITEMS } from "@/lib/demo/sample-notice";
import styles from "./notice.module.css";

// The sample date and version are request-specific, so render this page on demand.
export const instant = false;

function todayInSeoul(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export default async function DemoNoticePage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string | string[] }>;
}) {
  await connection();
  const query = await searchParams;
  const requested = Array.isArray(query.v) ? query.v[0] : query.v;
  const version: 1 | 2 | 3 = requested === "2" ? 2 : requested === "3" ? 3 : 1;
  const deadline = noticeDeadline(todayInSeoul(), version);
  const [year, month, day] = deadline.split("-").map(Number);

  return (
    <main className={styles.canvas}>
      <nav className={styles.versions} aria-label="시연용 종이 종류">
        <span>시연용 예시 종이</span>
        <a href="/demo/notice?v=1" aria-current={version === 1 ? "page" : undefined}>기본</a>
        <a href="/demo/notice?v=2" aria-current={version === 2 ? "page" : undefined}>표·도장</a>
        <a href="/demo/notice?v=3" aria-current={version === 3 ? "page" : undefined}>손글씨</a>
      </nav>

      <article className={styles.paper} aria-label={`시연용 보완 서류 제출 요청 예시 ${version}판`}>
        <div className={styles.watermark} aria-hidden="true">시연용 예시</div>
        <div className={styles.content}>
          <div className={styles.topline}>시연용 예시 · 실제 기관 문서가 아닙니다</div>
          <h1>사회보장급여 신청 관련<br />보완 서류 제출 요청</h1>
          <div className={styles.recipient}>수신: ○○○ 귀하</div>
          <p className={styles.intro}>
            귀하께서 신청하신 서울형 기초보장제도 관련 소득 재산 조사를 위하여
            아래 서류의 보완 제출을 요청드립니다.
          </p>

          {version === 2 ? (
            <table className={styles.documentTable}>
              <caption>보완 제출 서류</caption>
              <thead><tr><th scope="col">번호</th><th scope="col">서류명</th><th scope="col">비고</th></tr></thead>
              <tbody>
                {SAMPLE_NOTICE_ITEMS.map((item, index) => (
                  <tr key={item}><td>{index + 1}</td><td>{item}</td><td>1부</td></tr>
                ))}
              </tbody>
            </table>
          ) : (
            <ol className={styles.documents}>
              {SAMPLE_NOTICE_ITEMS.map((item) => <li key={item}>{item}</li>)}
            </ol>
          )}

          {version === 3 ? (
            <div className={styles.handwrittenDeadline}>
              <span className={styles.deadlineLabel}>제출기한:</span>
              <span className={styles.handwriting}>{month}/{day}까지!!</span>
              <span className={styles.scribble} aria-hidden="true" />
            </div>
          ) : (
            <p className={styles.deadline}>제출기한: <strong>{year}년 {month}월 {day}일까지</strong></p>
          )}

          <p className={styles.warning}>기한 내 미제출 시 신청이 각하될 수 있음을 알려드립니다.</p>
          <p className={styles.office}>제출처: ○○동 주민센터 맞춤형복지팀<br />담당자 ○○○ · 02-0000-0000</p>
          {version === 2 && <div className={styles.stamp} aria-label="예시 도장">예시</div>}
          <p className={styles.footer}>이 종이는 사진 읽기 기능을 시험하기 위한 가짜 문서입니다.</p>
        </div>
      </article>
    </main>
  );
}
