import { ddayFrom, ddayLabel, formatDateKo, todayKST } from '@/lib/format';
import { matches, visibleFields } from '@/lib/rules/condition';
import type { AnswerMap, Application, AppStatus, ChecklistItem, FormField, PrecheckResult, PrecheckRule } from '@/lib/types';

export interface NextAction {
  kind: string;
  title: string;
  sub: string;
  href: string;
  urgent: boolean;
}

interface SupplementSummary {
  id: string;
  deadline: string | null;
  deadlineConfirmed: boolean;
  itemCount: number;
}

export interface Progress {
  app: Application;
  programName: string;
  remainingQuestions: number;
  checkNeeded: number;
  checklistTotal: number;
  checklistDone: number;
  docsReady: boolean;
  precheckPending: number;
  activeSupplement: (SupplementSummary & { dday: number | null }) | null;
  nextActions: NextAction[];
}

export interface SharedView {
  programName: string;
  district: string | null;
  status: AppStatus;
  docsReady: boolean;
  submittedAt: string | null;
  checklist: Array<{
    docName: string;
    placeTitle: string;
    isDone: boolean;
    dueDate: string | null;
    source: ChecklistItem['source'];
  }>;
  supplement: {
    deadline: string | null;
    dday: number | null;
    items: Array<{ easyName: string; issuePlace: string }>;
  } | null;
  familyHelpNeeded: boolean;
  expiresAt: string;
}

type ProgressChecklist = Pick<ChecklistItem, 'docName' | 'isDone'>[];
type ProgressRule = Pick<PrecheckRule, 'id' | 'condition'>;

interface ProgressInput {
  app: Application;
  programName: string;
  fields: FormField[];
  answers: AnswerMap;
  checklist: ProgressChecklist;
  precheckRules: ProgressRule[];
  precheckResults: Record<string, PrecheckResult>;
  supplement: SupplementSummary | null;
}

const seoulDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
});

export function displaySeoulDate(timestamp: string): string {
  return formatDateKo(seoulDate.format(new Date(timestamp)));
}

export function buildProgress(input: ProgressInput, today = todayKST()): Progress {
  const { app, programName, fields, answers, checklist, precheckRules, precheckResults, supplement } = input;
  const visible = visibleFields(fields, answers);
  const activeAnswers = Object.fromEntries(visible.flatMap(field => {
    const answer = answers[field.key];
    return answer ? [[field.key, answer]] : [];
  }));
  const remainingQuestions = visible.filter(field => field.required && !activeAnswers[field.key]).length;
  const checkNeeded = Object.values(activeAnswers).filter(answer => answer.value === 'unknown' || answer.isApproximate).length;
  const pendingDocuments = checklist.filter(item => !item.isDone);
  const checklistTotal = checklist.length;
  const checklistDone = checklistTotal - pendingDocuments.length;
  const docsReady = checklistTotal > 0 && pendingDocuments.length === 0;
  const precheckPending = precheckRules.filter(rule =>
    matches(rule.condition, activeAnswers) && precheckResults[rule.id] !== 'yes',
  ).length;
  const activeSupplement = supplement && {
    ...supplement,
    dday: supplement.deadlineConfirmed && supplement.deadline ? ddayFrom(supplement.deadline, today) : null,
  };

  const base = '/a/' + encodeURIComponent(app.id);
  const nextActions: NextAction[] = [];
  function add(kind: string, title: string, sub: string, path: string, urgent = false) {
    nextActions.push({ kind, title, sub, href: base + path, urgent });
  }

  if (activeSupplement) {
    const path = '/extra/' + encodeURIComponent(activeSupplement.id);
    if (!activeSupplement.deadlineConfirmed) {
      add('confirm_deadline', '추가 서류 날짜를 확인해 주세요', '받은 종이와 날짜가 같은지 봐요', path, true);
    }
    const date = activeSupplement.deadline;
    const dday = activeSupplement.dday;
    const detail = date && dday !== null
      ? formatDateKo(date) + '까지 · ' + ddayLabel(dday).text
      : '받은 종이와 서류 목록을 같이 봐요';
    add('supplement', '추가로 챙길 서류 ' + activeSupplement.itemCount + '개', detail, path, true);
  } else if (app.status === 'supplementing') {
    add('supplement_start', '추가 서류 요청을 확인해 주세요', '주민센터에서 받은 종이를 보여 주세요', '/photo', true);
  }

  if (app.status === 'drafting') {
    if (remainingQuestions) {
      add('questions', '질문 ' + remainingQuestions + '개 남았어요', '이어서 대답해요', '/q');
    } else {
      add('review', '신청서 내용을 확인해 주세요', '틀린 곳이 없는지 봐요', '/review');
    }
  }

  if (app.status === 'submitted' && !activeSupplement) {
    add('waiting', '결과를 기다리는 중이에요', '구청에서 글로 알려 줘요', '/done');
  }

  if (app.status === 'preparing') {
    if (precheckPending) add('precheck', '내기 전 점검 ' + precheckPending + '개', '서류를 다시 달라고 하는 일을 줄여요', '/precheck');
    if (!checklistTotal) add('open_card', '제출 준비 카드를 열어 주세요', '챙길 서류를 정리해 드려요', '/card');
    if (pendingDocuments.length) {
      add('documents', '챙길 서류 ' + pendingDocuments.length + '개 남았어요',
        pendingDocuments[0].docName + (pendingDocuments.length > 1 ? ' 등' : ''), '/card');
    }
    if (checkNeeded) add('check', '확인할 것 ' + checkNeeded + '개', '잘 모르는 내용은 확인이 필요해요', '/card');
    if (docsReady && !app.submittedAt) {
      add('visit', '서류를 다 챙겼어요. 주민센터에 내러 가요', '다녀오면 결과를 알려 주세요', '/visit');
    }
  }

  if (!nextActions.length) {
    add('visit', '주민센터에 다녀오셨나요?', '지금 신청 상태를 확인해요', '/visit');
  }

  return {
    app, programName, remainingQuestions, checkNeeded, checklistTotal, checklistDone, docsReady,
    precheckPending, activeSupplement, nextActions: nextActions.slice(0, 3),
  };
}
