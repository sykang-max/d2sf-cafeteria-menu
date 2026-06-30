# 주간 식단 자동 업데이트 지침 (cron 루틴이 매주 월요일 따르는 절차)

이 문서는 클라우드 루틴(또는 사람)이 **그 주 화재서초 메뉴 PNG → 사이트 데이터**로 자동 반영할 때 따르는 단계다. 레포 루트에서 비대화형으로 끝까지 수행한다. **키는 쓰지 않는다**(Google Drive 커넥터 또는 gdown, 비전 판독).

## STEP 1 — 이번 주 포스터 PNG 받기
- 공개 Drive 폴더 id: `1qwHK9iqxGR5R6Ur1ZBxqNVK3Rc4DV85-`
- 우선순위 A) 연결된 Google Drive 커넥터로 `parentId = '1qwHK9iqxGR5R6Ur1ZBxqNVK3Rc4DV85-'` 조회 → 이름에 `화재서초`가 든 PNG 중 **createdTime 최신** 1개를 `./incoming.png`로 다운로드.
- 폴백 B) `pip install gdown && gdown --folder https://drive.google.com/drive/folders/1qwHK9iqxGR5R6Ur1ZBxqNVK3Rc4DV85- -O ./incoming` 후 가장 최신 `*.png` 사용.

## STEP 2 — 헤더(주차/날짜) 먼저 읽고 멱등성 검사
- 이미지가 매우 큼(~4300×5400). **한 번에 읽지 말 것.** ImageMagick(`magick`/`convert`)이 있으면 사용, 없으면 `pip install pillow`로 파이썬 크롭 스크립트를 만들어 **영역별로 잘라 Read**로 판독한다.
- 먼저 상단 헤더만 잘라 5개 요일 날짜와 주차 라벨(예: `7월 1주차`)을 읽고, 날짜 범위(예: `2026.07.06(월) ~ 07.10(금)`)를 만든다.
- `src/data/menu-2026-w*.js` 들의 `week.range`와 비교 — **이번 포스터 주차가 이미 있으면 아무것도 바꾸지 말고 "이미 최신" 보고 후 종료(커밋·푸시 금지).**

## STEP 3 — 정확히 전사 (기존 형식 그대로)
- `src/data/menu-2026-w5.js`를 열어 **형식을 그대로 복제**: `S(meal, day, corner, price, cuisine, items, tag, side)` 헬퍼, `items`는 `[메뉴명, kcal]` 배열, `days`/`sets`/`staticTakeout`/`week` export.
- 코너 구성(가격/유형 동일하게):
  - 조식: `백반`(9400, 한식) · `라면코너`(7700, 분식)
  - 중식: `Korean A`(9400) · `Korean B`(9900) · `Snap snack`(8800) · `International A`(9400) · `International B`(9900) · `추가배식대`(0, 기타, side=true)
  - 석식: `Korean B`(9900) · `Snap snack`(8800) · `웰빙가도시락`(9400)
  - 테이크아웃: `말이·컵밥`(8800, 분식) · `샌드위치`(8800, 양식)
  - + `staticTakeout` 상시 메뉴 목록
- **요일별 점심(중식) 코너 순서**: Korean A → Korean B → Snap snack → International A → International B → 추가배식대 (포스터 라벨 컬럼 순서와 동일).
- kcal은 **1인분 추정치**(포스터엔 없음). w5 파일 수준으로 추정: 밥 300~310, 국 60~120, 메인 250~650, 라면 500, 전 180~200, 포기김치 15, 깍두기 20, 나물/무침 40~90, 과일 60~90, 샐러드 90~100, 디저트 150~230.
- **빨간 글씨 원산지 표기(예: `(돈육:국내산)`)는 메뉴명에서 제외.**
- 태그: `[단가:10,500원]` → `"단가"`, `[건강 메뉴]`/`[면역력강화]`/`[Welgreener Day]`/`[건강한 Day]` → `"건강"`. `VS` 선택 메뉴는 메뉴명에 그대로 둔다.
- cuisine은 한식/중식/일식/양식/분식/기타 중 적절히.

## STEP 4 — 주차 등록
- 다음 id 결정: `src/data/menu-2026-w*.js` 중 최대 N을 찾아 `2026-w<N+1>`, 파일명 `src/data/menu-2026-w<N+1>.js`.
- `week.id`=`2026-w<N+1>`, `label`=포스터 주차 라벨, `range`=STEP2의 날짜범위, `days`=`[["월","MM.DD"],…]` 5개.
- `src/data/index.js`에서 새 주차를 import하고 `weeks` 배열 **맨 앞**에 넣는다(최신이 기본 선택).

## STEP 5 — 에셋 생성·검증
- `npm install` → `npm run og` (public/og-mon~fri.png 5장 재생성, puppeteer/Chromium 필요).
  - Chromium이 없어 `npm run og`가 실패하면 **데이터 변경은 그대로 진행**하고 최종 보고에 "OG 미생성" 명시.
- `npm run build`로 데이터 컴파일 검증.

## STEP 6 — 교차검증
- 크롭 2~3장을 다시 열어 새 메뉴 파일의 요일·코너·대표메뉴가 포스터와 일치하는지 확인하고 불일치 수정.

## STEP 7 — 커밋·푸시
- `git config user.email "menu-bot@evom.ai"` / `git config user.name "menu-bot"`.
- 스테이징: `src/data/menu-2026-w<N+1>.js`, `src/data/index.js`, (생성됐다면) `public/og-*.png`. **다른 파일·Slack 채널명·브랜딩 텍스트는 건드리지 말 것.**
- 커밋 메시지(따옴표 없이): `식단표 자동 업데이트: <label> (<range>)`.
- `git push origin main`. 푸시가 인증으로 실패하면 `gh pr create --fill --base main`로 PR을 연다. 어느 쪽이 됐는지 보고.

## 최종 보고
추가한 주차, 파일 경로, OG 생성 여부, push/PR 여부, 교차검증 수정·경고를 간단히 출력한다.
