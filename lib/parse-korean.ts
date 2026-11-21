// 03: AI가 실패할 때 쓰는 직접 읽기 (브라우저와 서버 둘 다)
// 사람이 한 말에서 금액, 예/아니요, 사람 수, 구 이름을 규칙으로 읽는다.
import { SEOUL_DISTRICTS } from './constants';
import { formatWon } from './format';
import type { AnswerValue, ExtractResult, FormField } from './types';

export type LocalField = Pick<FormField, 'key' | 'type' | 'options' | 'allowUnknown' | 'minValue' | 'maxValue'>;

const DIGIT: Record<string, number> = { 일: 1, 이: 2, 삼: 3, 사: 4, 오: 5, 육: 6, 륙: 6, 칠: 7, 팔: 8, 구: 9 };
const SMALL_UNIT: Record<string, number> = { 십: 10, 백: 100, 천: 1000 };
const BIG_UNIT: Record<string, number> = { 만: 10_000, 억: 100_000_000 };

const RUN = /[0-9.,일이삼사오육륙칠팔구십백천만억](?:[0-9.,일이삼사오육륙칠팔구십백천만억\s])*/g;

/** 숫자 덩어리 하나를 값으로. "천오백만" → 15000000, "1억 5천" → 150000000 */
function evalRun(run: string): number | null {
  const tokens = run.replace(/[\s,]/g, '').match(/\d+(?:\.\d+)?|[^\d.]/g);
  if (!tokens) return null;
  let total = 0;
  let section = 0;
  let num = 0;
  let lastBig = 0;
  for (const t of tokens) {
    if (/^\d/.test(t)) num = Number(t);
    else if (t in DIGIT) num = DIGIT[t];
    else if (t in SMALL_UNIT) {
      section += (num || 1) * SMALL_UNIT[t];
      num = 0;
    } else if (t in BIG_UNIT) {
      const block = section + num;
      total += (block || 1) * BIG_UNIT[t];
      section = 0;
      num = 0;
      lastBig = BIG_UNIT[t];
    } else return null;
  }
  const rest = section + num;
  // "1억 5천"처럼 억 뒤에 만을 빼고 말하면 만 원 단위로 본다
  total += lastBig === BIG_UNIT['억'] && rest > 0 && rest < 10_000 ? rest * 10_000 : rest;
  return Number.isFinite(total) ? Math.round(total) : null;
}

/** 덩어리가 진짜 숫자인지: 아라비아 숫자가 있거나, 한글이면 십 백 천 만 억이 들어 있어야 한다 ("이 정도", "일 안 해" 제외) */
function isNumberRun(run: string): boolean {
  const s = run.replace(/[\s,.]/g, '');
  if (!s) return false;
  if (/\d/.test(s)) return true;
  if (!/[십백천만억]/.test(s)) return false;
  return s !== '만' && s !== '억'; // "아들만" 같은 말 제외
}

/** "30만 원" 300000 / "이십오만" 250000 / "1억 5천만" 150000000 / "없어요" 0 / 그 밖에 null */
export function parseKoreanMoney(text: string): number | null {
  // "오백이요", "천이에요"의 '이'는 숫자 2가 아니라 조사
  const t = text.trim().replace(/([십백천만억])이(?=[요에랑고는라가야었])/g, '$1 ');
  if (!t) return null;
  if (/^(없|하나도 없|한 ?푼도 없|0원|영 ?원)/.test(t) || /^(없어|없어요|없습니다|없음)\.?$/.test(t)) return 0;
  for (const m of t.matchAll(RUN)) {
    if (!isNumberRun(m[0])) continue;
    const v = evalRun(m[0]);
    if (v !== null) return v;
  }
  if (/없(어|어요|습니다|음|다)/.test(t)) return 0;
  return null;
}

const NO_WORDS = /(없|아니|아뇨|아니요|안\s?(해|하|받|있|살|다녀|가)|안해|못\s?(해|받)|전혀)/;
const YES_WORDS = /(있|받(아|고|아요|습니다|는)|해요|하고 있|다녀|그래|맞아|맞아요|맞습니다)/;
const YES_SHORT = /^(예|네|넵|응|어|엉|그럼|당연)[\s.!요]*$|^(예|네|응|어)[,\s]/;

/** "예, 네, 응, 있어요" true / "아니요, 없어요" false / 그 밖에 null */
export function parseYesNo(text: string): boolean | null {
  const t = text.trim();
  if (!t) return null;
  if (NO_WORDS.test(t)) return false;
  if (YES_SHORT.test(t) || YES_WORDS.test(t)) return true;
  return null;
}

const NATIVE: Record<string, number> = {
  하나: 1, 한: 1, 둘: 2, 두: 2, 셋: 3, 세: 3, 넷: 4, 네: 4, 다섯: 5, 여섯: 6, 일곱: 7, 여덟: 8, 아홉: 9, 열: 10,
};

/** "혼자" 1, "둘" 2, "네 명" 4, "3명" 3 / 그 밖에 null */
export function parseCount(text: string): number | null {
  const t = text.trim();
  if (/혼자/.test(t)) return 1;
  const arabic = /(\d+)\s*(명|식구|사람)?/.exec(t);
  if (arabic) return Number(arabic[1]);
  const withUnit = /(하나|한|둘|두|셋|세|넷|네|다섯|여섯|일곱|여덟|아홉|열)\s*(명|식구|사람)/.exec(t);
  if (withUnit) return NATIVE[withUnit[1]];
  const sino = /(일|이|삼|사|오|육|칠|팔|구|십)\s*명/.exec(t);
  if (sino) return sino[1] === '십' ? 10 : DIGIT[sino[1]];
  const bare = /(?:^|\s)(하나|둘|셋|넷|다섯|여섯|일곱|여덟|아홉|열)(?:이서|이|요|이요|$|\s|\.)/.exec(t);
  if (bare) return NATIVE[bare[1]];
  return null;
}

const DISTRICTS_BY_LENGTH = [...SEOUL_DISTRICTS].sort((a, b) => b.length - a.length);

/** 글 안에 구 이름(또는 "구"를 뺀 이름)이 있으면 그 구 / 없으면 null */
export function matchDistrict(text: string): string | null {
  const t = text.replace(/\s/g, '');
  for (const d of DISTRICTS_BY_LENGTH) if (t.includes(d)) return d;
  for (const d of DISTRICTS_BY_LENGTH) {
    const short = d.slice(0, -1);
    if (short.length >= 2 && t.includes(short)) return d;
  }
  return null;
}

/** "몰라, 모르겠, 기억 안" */
export function isUnknownSpeech(text: string): boolean {
  return /(몰라|모르|기억\s*(이\s*)?안|기억\s*못|글쎄)/.test(text);
}

/** "쯤, 정도, 대충, 아마, 한 (숫자 앞)" */
export function isApproxSpeech(text: string): boolean {
  return /(쯤|정도|대충|아마|얼추|대략|약\s?\d|약\s?[일이삼사오육칠팔구십백천]|한\s*(?=[0-9일이삼사오육칠팔구십백천]))/.test(text);
}

/** 선택지마다 알아듣는 말 (value 기준) */
const CHOICE_WORDS: Record<string, RegExp> = {
  own: /(내\s?집|자가|우리\s?집|제\s?집|집이\s?있)/,
  jeonse: /전세/,
  monthly: /월세|다달이/,
  free: /(돈\s?안\s?내|공짜|무료|그냥\s?살|얹혀)/,
  other: /(고시원|시설|쪽방|여관|도우미|복지사|이웃|다른\s?사람)/,
  company: /(회사|직장|월급)/,
  daily: /(일용|그날그날|날일|막일|노가다|공사장)/,
  business: /(가게|사업|장사|자영업)/,
  self: /(내가|제가|본인|직접|혼자\s?갈)/,
  family: /(아들|딸|며느리|사위|자식|가족|남편|아내|손주|손자|손녀|대신)/,
  sms: /문자/,
  mail: /(우편|종이|편지)/,
};

function matchChoice(field: LocalField, text: string): string[] {
  const opts = field.options ?? [];
  return opts
    .filter((o) => {
      const words = CHOICE_WORDS[o.value];
      if (words && words.test(text)) return true;
      const core = o.label.replace(/(이에요|예요|해요|가요|줘요|래요|어요|아요)$/, '').trim();
      return core.length >= 2 && text.includes(core);
    })
    .map((o) => o.value);
}

function cleanText(field: LocalField, text: string): string | null {
  const t = text.trim().replace(/[.!?]+$/, '');
  if (!t) return null;
  if (field.key === 'dong') {
    const m = /([가-힣]+[0-9]*동)/.exec(t.replace(/\s/g, ''));
    return m ? m[1] : null;
  }
  return t.replace(/\s*(이에요|예요|이요|입니다|이랑요|요)$/, '').trim() || null;
}

function inRange(field: LocalField, n: number): boolean {
  if (field.minValue !== null && n < field.minValue) return false;
  if (field.maxValue !== null && n > field.maxValue) return false;
  return true;
}

function result(value: AnswerValue | null, heardAs: string, isApproximate = false): ExtractResult {
  return {
    value,
    confidence: value === null ? 'low' : 'high',
    isApproximate,
    heardAs,
    clarifyQuestion: null,
    clarifyOptions: null,
    otherValues: [],
  };
}

/** field type에 맞게 직접 읽는다. 못 읽으면 value null, confidence low */
export function localExtract(field: LocalField, text: string): ExtractResult {
  const t = text.trim();
  if (!t) return result(null, '');

  if (isUnknownSpeech(t)) {
    return field.allowUnknown ? result('unknown', '잘 모름 (확인 필요)') : result(null, t);
  }

  switch (field.type) {
    case 'yes_no': {
      const v = parseYesNo(t);
      return v === null ? result(null, t) : result(v, v ? '있어요' : '없어요');
    }
    case 'count': {
      const v = parseCount(t);
      if (v === null || !inRange(field, v)) return result(null, t);
      return result(v, v === 1 ? '1명 (혼자)' : `${v}명`);
    }
    case 'money': {
      let v = parseKoreanMoney(t);
      if (v === null) return result(null, t);
      // "오백이요", "이십오" 처럼 만, 억 없이 작은 수만 말하면 만 원 단위로 본다
      if (v > 0 && v < 10_000 && !/[만억]|원/.test(t)) v *= 10_000;
      if (!inRange(field, v)) return result(null, t);
      const approx = isApproxSpeech(t);
      const won = formatWon(v).replace(/^약 /, '');
      return result(v, approx && v > 0 ? `약 ${won}` : won, approx && v > 0);
    }
    case 'district': {
      const v = matchDistrict(t);
      return v ? result(v, v) : result(null, t);
    }
    case 'choice': {
      const hits = matchChoice(field, t);
      if (hits.length !== 1) return result(null, t);
      const label = field.options?.find((o) => o.value === hits[0])?.label ?? hits[0];
      return result(hits[0], label);
    }
    case 'text': {
      const v = cleanText(field, t);
      return v ? result(v, v) : result(null, t);
    }
  }
}
