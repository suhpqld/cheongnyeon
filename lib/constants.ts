import type { AppStatus, HelperMode, PlaceGroup } from './types';

export const PROGRAM_CODE = 'seoul_basic';

export const SEOUL_DISTRICTS = [
  '강남구','강동구','강북구','강서구','관악구','광진구','구로구','금천구','노원구','도봉구',
  '동대문구','동작구','마포구','서대문구','서초구','성동구','성북구','송파구','양천구','영등포구',
  '용산구','은평구','종로구','중구','중랑구',
] as const;

export const SECTION_ORDER = ['사는 곳', '가구', '집', '버는 돈', '재산', '신청 방법'];

export const STATUS_LABEL: Record<AppStatus, string> = {
  drafting: '신청서 쓰는 중',
  preparing: '서류 챙기는 중',
  submitted: '주민센터에 냈어요',
  supplementing: '추가 서류를 내야 해요',
};

export const HELPER_LABEL: Record<HelperMode, string> = {
  self: '신청하는 본인이에요',
  family: '가족을 도와주고 있어요',
  helper: '주민센터나 배움터에서 도와드리고 있어요',
};

export const PLACE_LABEL: Record<PlaceGroup, { icon: string; title: string; tip: string }> = {
  home:   { icon: '🏠', title: '집에서 챙겨요',              tip: '나가기 전에 가방에 넣어 두세요.' },
  onsite: { icon: '🏢', title: '주민센터에서 받아서 써요',     tip: '주민센터에 가면 종이를 줘요. 거기서 쓰면 돼요.' },
  bank:   { icon: '🏦', title: '은행에서 떼요',                tip: '가까운 은행 창구나 은행 앱에서 뗄 수 있어요.' },
  work:   { icon: '💼', title: '회사나 일하는 곳에서 받아요',   tip: '일하는 곳에 미리 부탁해 두세요.' },
  tax:    { icon: '🧾', title: '세무서나 홈택스에서 떼요',      tip: '홈택스 누리집이나 가까운 세무서에서 뗄 수 있어요.' },
  gov24:  { icon: '🏛', title: '주민센터나 정부24에서 떼요',    tip: '주민센터에 간 김에 같이 떼면 돼요.' },
};

export const ALLOWED_STATUS_CHANGES: Record<AppStatus, AppStatus[]> = {
  drafting: ['preparing', 'supplementing'],
  preparing: ['submitted', 'supplementing'],
  submitted: ['supplementing'],
  supplementing: ['submitted'],
};

export const DISCLAIMER = '복냥이는 신청을 도와요. 받을 수 있는지는 구청에서 조사해서 정해요.';
export const AI_CALL_LIMIT = 80;
export const RESUME_CODE_LENGTH = 8;
export const RESUME_MAX_FAILS = 5;       // 10분 안에
export const RESUME_LOCK_MINUTES = 10;
export const SHARE_DAYS = 7;

export const STORAGE_KEYS = {
  session: 'boknyang.session',
  sound: 'boknyang.sound',
  fontSize: 'boknyang.fontSize',
  view: 'boknyang.view',
  backup: (appId: string) => `boknyang.backup.${appId}`,
  script: (appId: string) => `boknyang.script.${appId}`,
};
