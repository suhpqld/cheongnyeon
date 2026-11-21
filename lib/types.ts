// lib/types.ts — 01 기반이 만든다. 다른 기능은 import만 하고 고치지 않는다.

export type HelperMode = 'self' | 'family' | 'helper';
export type AppStatus = 'drafting' | 'preparing' | 'submitted' | 'supplementing';
export type FieldType = 'yes_no' | 'choice' | 'district' | 'count' | 'money' | 'text';
export type PlaceGroup = 'home' | 'onsite' | 'bank' | 'work' | 'tax' | 'gov24';
export type InputMethod = 'voice' | 'button' | 'text' | 'unknown';
export type AnswerValue = boolean | number | string; // 모름은 문자열 'unknown'
export type PrecheckResult = 'yes' | 'no' | 'unknown';

export interface Condition {
  field: string;
  op: 'eq' | 'neq' | 'in' | 'gt' | 'lt';
  value: unknown;
}
export type ShowIf = Condition | Condition[] | null;

export interface Program {
  id: string;
  code: string;
  name: string;
  summaryEasy: string;
  applyPlace: string;
  contact: string;
  afterSubmitEasy: string;
}

export interface FieldOption { value: string; label: string; }

export interface FormField {
  id: string;
  key: string;
  commonKey: string | null;
  label: string;            // 공식 신청서 칸 이름 (옮겨 쓰는 카드에 씀)
  section: string;          // 사는 곳, 가구, 집, 버는 돈, 재산, 신청 방법
  questionEasy: string;     // 본인에게 묻는 말
  questionHelper: string;   // 가족, 도우미가 볼 때 묻는 말 ("신청하시는 분은...")
  helpEasy: string | null;
  type: FieldType;
  options: FieldOption[] | null;
  required: boolean;
  allowUnknown: boolean;
  minValue: number | null;
  maxValue: number | null;
  showIf: ShowIf;
  confirmLabel: string | null; // 크게 확인할 때 앞말: "한 달 월세" + "25만 원"
  checkGuide: string | null;   // 모를 때 어디서 확인하는지
  sortOrder: number;
}

export interface Answer {
  fieldKey: string;
  value: AnswerValue;
  rawSpeech: string | null;
  inputMethod: InputMethod;
  isApproximate: boolean;
}
export type AnswerMap = Record<string, Answer>;

export interface Application {
  id: string;
  programId: string | null;
  status: AppStatus;
  helperMode: HelperMode;
  resumeCode: string;
  submittedAt: string | null;
  shareActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistItem {
  id: string;
  docName: string;
  easyExplain: string | null;
  issuePlace: string | null;
  placeGroup: PlaceGroup;
  source: 'base' | 'supplement';
  supplementId: string | null;
  dueDate: string | null;      // YYYY-MM-DD
  isDone: boolean;
  alsoRequested: boolean;      // 기본 목록에 있었는데 추가 요청에도 나온 서류
  createdAt: string;
}

export interface PrecheckRule {
  id: string;
  checkQuestion: string;
  whyEasy: string;
  fixEasy: string;
  relatedDoc: string | null;
  condition: ShowIf;
  sortOrder: number;
}

export interface ExtractRequest {
  appId: string;
  utterance: string;
  helperMode: HelperMode;
  field: Pick<FormField, 'key' | 'type' | 'questionEasy' | 'options' | 'allowUnknown' | 'minValue' | 'maxValue'>;
  otherFields: Pick<FormField, 'key' | 'type' | 'questionEasy' | 'options'>[];
  clarify: { question: string; options: { label: string; value: AnswerValue }[] } | null;
}

export interface ExtractResult {
  value: AnswerValue | null;
  confidence: 'high' | 'low';
  isApproximate: boolean;
  heardAs: string;
  clarifyQuestion: string | null;
  clarifyOptions: { label: string; value: AnswerValue }[] | null;
  otherValues: { key: string; value: AnswerValue; isApproximate: boolean }[];
}

export interface CardScriptRequest {
  appId: string;
  programName: string;
  helperMode: HelperMode;
  applicantType: string | null;       // self, family, other
  answerLines: string[];              // "같이 사는 사람: 1명 (혼자)"
  checkLabels: string[];              // 확인 필요한 칸 이름
  supplementItems: string[];          // 추가 서류를 내러 갈 때 서류 이름
}

export interface SupplementItem {
  name: string;           // 종이에 적힌 이름 그대로
  originalText: string;   // 그 서류가 적힌 원문 줄
  easyName: string;
  easyExplain: string;
  issuePlace: string;
  placeGroup: PlaceGroup;
}

export interface SupplementParsed {
  programName: string | null;
  items: SupplementItem[];
  deadline: string | null;              // YYYY-MM-DD
  deadlineOriginalText: string | null;  // "제출기한: 2026년 11월 28일까지"
  officeName: string | null;
  officeContact: string | null;
  hardWords: { word: string; easy: string }[];
  consequenceEasy: string | null;
  summaryEasy: string;
}

export interface Supplement {
  id: string;
  parsed: SupplementParsed;
  deadline: string | null;
  deadlineConfirmed: boolean;
  submittedAt: string | null;
  createdAt: string;
}

export interface Session {
  appId: string;
  token: string;
  resumeCode: string;
}
