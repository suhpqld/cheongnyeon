<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md

이 저장소의 작업 규칙은 `CLAUDE.md`와 같다. **`CLAUDE.md`를 먼저 끝까지 읽고 그대로 따른다.**

요약:
1. `docs/00_공통_먼저읽기.md`를 끝까지 읽는다.
2. 사람이 말한 기능 파일(`docs/0X_...md`)을 끝까지 읽는다.
3. 기능 파일의 "내가 만드는 파일"만 만들고 고친다. 새 npm 패키지는 설치하지 않는다.
4. DB는 서버 API 라우트에서만 접근한다. 비밀 키는 코드에 넣지 않는다.
5. 수급 가능 여부를 판정하는 말을 쓰지 않는다.
6. **main에는 PM(박수홍)만 합친다.** 사람이 "커밋하고 푸시해줘"라고 하면 `CLAUDE.md` 2장 순서(브랜치 확인 → 내 파일만 → 비밀 확인 → build → 커밋 → 최신 main을 내 브랜치에 받기 → `git push -u origin feat/0X-이름` → 보고)로 **내 브랜치에만** 올린다. main으로 push, main에서 커밋, main에 merge를 하지 않는다.
7. "최신 main 받아줘"는 `CLAUDE.md` 3장. PM의 main 합치기는 4장.
8. force push, reset --hard, rebase는 하지 않는다.
9. 준비, 세팅 질문은 `docs/08_사전준비.md`.
10. 위의 Next.js 안내 블록(`nextjs-agent-rules`)은 `next dev`가 다시 써 넣는 부분이다. 지우거나 고치지 않는다.
