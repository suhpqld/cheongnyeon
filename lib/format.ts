import type { Answer, FormField } from './types';

const numberKo = new Intl.NumberFormat('ko-KR');

export function formatWon(n: number): string {
  if (n === 0) return '없어요';
  const man = Math.round(Math.abs(n) / 10_000);
  const eok = Math.floor(man / 10_000);
  const remainder = man % 10_000;
  const parts = [];
  if (eok) parts.push(numberKo.format(eok) + '억');
  if (remainder || !eok) parts.push(numberKo.format(remainder) + '만');
  return (n % 10_000 ? '약 ' : '') + (n < 0 ? '-' : '') + parts.join(' ') + ' 원';
}

/** group 답(한 줄씩 배열)을 짧게: relation을 이어서 "어머니, 아버지", 셋 이상이면 "어머니, 아버지 외 1명" */
export function groupSummary(rows: Record<string, unknown>[]): string {
  const names = rows.map((row) => {
    const relation = row.relation;
    if (typeof relation === 'string' && relation.trim()) return relation.trim();
    const first = Object.values(row).find((v) => typeof v === 'string' && v.trim());
    return typeof first === 'string' ? first.trim() : '';
  }).filter(Boolean);
  if (names.length === 0) return rows.length ? `${rows.length}명` : '없어요';
  if (names.length <= 2) return names.join(', ');
  return `${names.slice(0, 2).join(', ')} 외 ${names.length - 2}명`;
}

export function displayAnswer(field: FormField, answer?: Answer): string {
  if (!answer) return '아직 안 했어요';
  const { value, isApproximate } = answer;
  if (value === 'unknown') return '잘 모름 (확인 필요)';
  if (Array.isArray(value)) return groupSummary(value);
  switch (field.type) {
    case 'money': {
      const amount = formatWon(Number(value));
      if (!isApproximate) return amount;
      return '약 ' + (Number(value) === 0 ? '0원' : amount.replace(/^약 /, '')) + ' (확인 필요)';
    }
    case 'yes_no': return value === true ? '있어요' : '없어요';
    case 'choice': return field.options?.find(option => option.value === value)?.label ?? String(value);
    case 'count': return value === 1 ? '1명 (혼자)' : value + '명';
    default: return String(value);
  }
}

export function formatCode(code: string): string {
  return [code.slice(0, 4), code.slice(4)].filter(Boolean).join(' ');
}

export function todayKST(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

export function formatDateKo(date: string): string {
  const day = new Date(date + 'T00:00:00Z');
  const weekday = new Intl.DateTimeFormat('ko-KR', { weekday: 'short', timeZone: 'UTC' }).format(day);
  return (day.getUTCMonth() + 1) + '월 ' + day.getUTCDate() + '일 (' + weekday + ')';
}

export function ddayFrom(deadline: string, today = todayKST()): number {
  return (Date.parse(deadline) - Date.parse(today)) / 86_400_000;
}

export function ddayLabel(n: number): { big: string; text: string } {
  if (n > 0) return { big: 'D-' + n, text: n + '일 남았어요' };
  if (n === 0) return { big: 'D-DAY', text: '오늘까지예요' };
  return { big: '기한 지남', text: '기한이 ' + Math.abs(n) + '일 지났어요' };
}
