# 복냥이 저장소 작업 규칙 (AI가 가장 먼저 읽는 파일)

이 저장소는 서울 AI 디지털 배움터 청년 해커톤 팀 PULSE의 **복냥이** 웹앱이다.
다섯 명이 기능을 나눠 **동시에** 개발한다. 그래서 아래 순서와 규칙을 꼭 지킨다.

> **가장 중요한 git 규칙: main에는 PM(박수홍)만 합친다.**
> 팀원의 AI는 **자기 브랜치에만** push한다. main으로 push, main에서 커밋, main에 merge를 하지 않는다.
> (GitHub에서도 PM 말고는 main에 push가 막혀 있다)

## 1. 사람이 "나 이거 만들 거야"라고 하면

사람은 보통 이렇게 말한다: "나 docs/04_제출준비카드.md 만들 거야", "나 준비 카드 만들 거야", "나 기반 만들 거야"

1. `docs/00_공통_먼저읽기.md`를 끝까지 읽는다.
2. 말한 기능 파일을 끝까지 읽는다. 파일 이름 대신 기능 이름을 말하면 00의 4장 "기능 파일 목록"에서 찾는다. 못 찾으면 어떤 파일인지 묻는다.
3. 기능 파일의 **"시작 전 확인"** 순서대로 한다. (최신 main 받기, 내 브랜치 만들기, 01 기반이 main에 들어왔는지 확인)
   - `git pull` 뒤에 `package.json`이 바뀌었으면 `npm install`을 한다.
4. 기능 파일의 **"내가 만드는 파일"**만 만들고 고친다. **"건드리면 안 되는 파일"**은 고치지 않는다. 꼭 고쳐야 하면 멈추고 사람에게 누구에게 무엇을 부탁할지 알려 준다.
5. 기능 파일의 **P0부터** 만든다. 하나 끝날 때마다 `npm run build` 통과를 확인한다.
   - **이 저장소는 Next.js 16.4, React 19.3, Tailwind 4.3이다.** 학습한 예전 Next.js와 다를 수 있으니, 코드를 쓰기 전에 `AGENTS.md` 맨 위 Next.js 안내대로 `node_modules/next/dist/docs/`에서 관련 가이드(라우트, params, 서버 함수 등)를 먼저 확인하고 경고된 옛 방식을 쓰지 않는다.
6. 끝나면 사람에게 "커밋하고 브랜치에 올려 드릴까요?"라고 묻는다. 커밋과 푸시는 **사람이 말할 때만** 한다.

사람이 "준비할 거 뭐야", "세팅 도와줘", "Supabase 어떻게 해", "Vercel 어떻게 해", "푸시가 안 돼"라고 하면 `docs/08_사전준비.md`를 읽고 그 순서대로 안내한다.

## 2. 사람이 "커밋하고 푸시해줘"라고 하면 (내 브랜치에만 올리기)

"푸시해줘", "올려줘", "브랜치에 올려줘", "저장해줘"도 모두 같은 뜻이다. **main에는 절대 올리지 않는다.**

**0단계. 브랜치 확인**
- `git branch --show-current`
- **main 위에서는 커밋하지 않는다.** main이면 지금 변경을 그대로 들고 내 기능 브랜치로 간다: `git switch -c feat/0X-이름` (브랜치 이름은 00의 6장. 이미 있으면 `git switch feat/0X-이름`)

**1단계. 바뀐 파일 고르기**
- `git status --short`
- 00의 5장 "파일 주인" 표에서 **내 기능의 파일만** 고른다.
- 남의 파일이 바뀌어 있으면 커밋하지 않는다. 목록을 사람에게 보여 주고 어떻게 할지 묻는다.

**2단계. 비밀 확인**
- `.env`, `.env.local` 같은 파일은 절대 add하지 않는다. (`.env.example`만 괜찮다)
- 올릴 파일의 `git diff`에 `sk-ant-`, `sb_secret_`, `service_role`, `eyJhbGci`로 시작하는 긴 값이 있으면 **멈추고** 사람에게 알린다.

**3단계. build 확인**
- `npm run build`
- 실패하면: 내 파일 문제면 고치고 다시 한다. 금방 못 고치면 그대로 진행하되 4단계 커밋 메시지를 `wip(0X): ...`로 시작하고, 보고할 때 "build가 아직 안 돼서 PM에게 합쳐 달라고 하면 안 돼요"라고 말한다.

**4단계. 커밋**
- `git add 파일1 파일2 ...` (내 파일만 이름으로. `git add .`, `git add -A`는 쓰지 않는다)
- `git commit -m "feat(0X): 무엇을 했는지 한 줄"` (고친 것이면 `fix(0X): ...`)

**5단계. 최신 main을 내 브랜치에 받기** (충돌을 PM이 아니라 내가 먼저 풀기 위해)
- `git pull --no-rebase origin main`
- `package.json`이나 `package-lock.json`이 바뀌었으면 `npm install`
- 충돌이 나면:
  | 충돌 파일 | 할 일 |
  |---|---|
  | 내 기능 파일 | 양쪽 내용을 살려서 고친다 → `git add` → `git commit` |
  | `package-lock.json` | `git checkout --theirs package-lock.json && npm install && git add package-lock.json` → `git commit` |
  | 남의 파일 | `git merge --abort` 하고 멈춘다. 00의 5장에서 그 파일 주인을 찾아 사람에게 "OO에게 연락하세요"라고 알린다 |
- 3단계에서 build가 됐으면 여기서도 `npm run build`. 실패하면 멈추고 알린다.

**6단계. 내 브랜치에 올리기**
- **반드시 브랜치 이름을 적어서** push한다: `git push -u origin feat/0X-이름`
- `git push`만 쓰거나, `main`이 들어간 push는 하지 않는다.
- `rejected ... fetch first`로 거절되면 (다른 컴퓨터에서 이 브랜치에 올린 게 있음): `git pull --no-rebase origin feat/0X-이름` → 충돌은 5단계 표대로 → 다시 push
- `GH013`, `Repository rule violations`가 나오면 main으로 push하려 한 것이다. 멈추고 브랜치 이름을 확인한다.
- 인증 오류(`Authentication failed`, `Permission denied`, 403)가 나면 멈추고 사람에게 `docs/08_사전준비.md`의 "F. 각자 컴퓨터" 3번(`gh auth login`)을 하라고 알린다.

**7단계. 보고**
사람에게 이렇게 알려 준다:
- 커밋 해시 앞 7자리, 올린 파일 수, 브랜치 이름, build 통과 여부
- "내 브랜치에 올렸어요. main에는 PM(박수홍)님이 합쳐요."
- 디스코드에 올릴 문장 (build가 통과했을 때만 합쳐 달라고 한다):
  > `feat/0X-이름` 올렸어요. build 통과. {무엇을 했는지 한 줄}. 수홍님 main에 합쳐 주세요.

## 3. 사람이 "최신 main 받아줘", "main 받아서 충돌 고쳐줘"라고 하면

PM이 main에 합쳤다고 공지하거나, PM이 "충돌 나서 못 합쳤어요"라고 하면 쓴다.
1. 지금 바뀐 내 파일이 있으면 2장 0~4단계로 먼저 커밋한다.
2. `git switch feat/0X-이름` → `git pull --no-rebase origin main` → `npm install`(package.json이 바뀌었으면)
3. 충돌은 2장 5단계 표대로
4. `npm run build` → 통과하면 `git push -u origin feat/0X-이름` → 2장 7단계처럼 보고

## 4. main 합치기 (PM 박수홍만)

**PM이 아닌 사람이 "main에 합쳐줘", "main에 올려줘"라고 하면 하지 않는다.** 대신 "main에는 PM(박수홍)님만 합쳐요. 브랜치에 올리고 디스코드로 부탁할게요"라고 말하고 2장을 한다. 누가 말하는지 확실하지 않으면 "박수홍 님이세요?"라고 묻는다.

### 4-1. PM이 "feat/04-card main에 합쳐줘"라고 하면 (브랜치 하나)
1. `git status --short` → PM 컴퓨터에 커밋 안 한 변경이 있으면 멈추고 어떻게 할지 묻는다 (PM 문서는 `chore/pm-docs` 브랜치에 커밋)
2. `git fetch origin --prune`
3. `git switch main && git pull --no-rebase origin main`
4. `git merge --no-ff --no-commit origin/feat/04-card`
   - **충돌**이 나면: `git merge --abort` → 충돌 파일 목록과 주인(00의 5장)을 보고하고 멈춘다. PM에게 줄 디스코드 문장: "`feat/04-card` 합치다가 {파일}에서 충돌 났어요. AI에게 'main 받아서 충돌 고쳐줘' 하고 다시 올려 주세요."
5. `package.json`이 바뀌었으면 `npm install`
6. `npm run build`
   - **실패**하면: `git merge --abort` → 오류 요약(파일, 줄, 메시지)을 보고하고 멈춘다. 디스코드 문장: "`feat/04-card` 합치면 build가 깨져요: {오류 한 줄}. 고쳐서 다시 올려 주세요."
7. 통과하면 `git commit -m "merge: feat/04-card"` (Claude Code가 이 push를 물어보면 PM이 허락한다)
8. `git push origin main`
   - 거절되면 (`fetch first`): `git pull --no-rebase origin main` → `npm run build` → 다시 push
9. 보고: 합친 커밋 해시, "Vercel이 1~2분 뒤 배포해요", 디스코드 문장:
   > `feat/04-card` main에 합쳤어요. 다들 AI에게 "최신 main 받아줘" 해 주세요.

### 4-2. PM이 "브랜치 다 합쳐줘"라고 하면 (12시 30분, 13시 30분 합치기)
1. `git fetch origin --prune`
2. 아직 main에 안 들어간 브랜치 찾기: `git branch -r --no-merged origin/main` 중 `origin/feat/`로 시작하는 것
3. **01 → 02 → 03 → 04 → 05 → 06 순서로** 하나씩 4-1의 3~8단계. 하나가 실패하면 그 브랜치는 건너뛰고 다음으로 간다.
4. 끝나면 표로 보고:
   | 브랜치 | 결과 | 이유 | 누구에게 |
   |---|---|---|---|
   | feat/02-question | 합침 | | |
   | feat/04-card | 충돌 | app/... | 04 담당 |
5. 디스코드 문장: "합친 것: {목록}. 못 합친 것: {목록과 이유}. 다들 '최신 main 받아줘' 해 주세요."

### 4-3. PM이 "브랜치 상태 보여줘"라고 하면
- `git fetch origin --prune` 후 `origin/feat/*` 브랜치마다: main보다 앞선 커밋 수(`git rev-list --count origin/main..origin/feat/X`), 마지막 커밋 시간과 메시지(`git log -1 --format="%cr %s" origin/feat/X`), 메시지가 `wip`로 시작하는지. 표로 보여 준다.

## 5. git 절대 금지

- `git push --force`, `git push -f`, `--force-with-lease`
- `git reset --hard`, `git clean`, `git rebase`, 브랜치 지우기 (`git branch -D`, `git push --delete`)
- **팀원: main으로 push, main 위에서 커밋, main에 merge** (PM만 4장 순서로)
- 브랜치 이름 없이 `git push`만 쓰기
- `--no-verify`
- 남의 기능 파일을 커밋에 넣기
- `.env.local` 커밋

## 6. 절대 규칙 (코드)

- **새 npm 패키지를 설치하지 않는다.** (package.json, package-lock.json 충돌) 필요한 패키지는 01 기반이 이미 설치했다. 꼭 필요하면 사람에게 묻는다. (그냥 `npm install`로 받기만 하는 것은 괜찮다)
- **비밀 키를 코드, 커밋, 브라우저 코드에 넣지 않는다.** `.env.local`은 읽지도 커밋하지도 않는다.
- **DB는 서버 API 라우트에서만** 접근한다 (`lib/server/db.ts`). 브라우저 코드에서 Supabase를 직접 부르지 않는다.
- `/api/apps/[id]/...` 라우트는 **반드시** `requireApp()`으로 토큰을 확인한다.
- **수급 가능 여부를 판정하는 말**("받을 수 있어요", "대상이에요", "탈락이에요")을 화면과 AI 출력에 절대 쓰지 않는다.
- 화면 문구는 기능 파일에 적힌 문장을 그대로 쓴다. 새 문구가 필요하면 00의 14장 말투 규칙을 따른다.
- `docs/` 폴더, 이 파일, `AGENTS.md`, `.claude/settings.json`은 고치지 않는다. (PM만 고친다)
- `AGENTS.md` 맨 위 Next.js 블록은 `next dev`가 자동으로 넣는 것이다. `git status`에 AGENTS.md가 바뀌었다고 나오면 커밋에 넣지 말고 사람에게 알린다.
- 다른 기능의 파일이 아직 main에 없으면, 기능 파일의 "아직 없을 때" 방법(임시 처리)을 쓴다. 남의 파일을 대신 만들지 않는다.
