# D2SF 지하식당 주간 점심 식단표

D2SF 지하식당의 주간 점심 식단을 보여주는 정적 웹사이트입니다.
조식·중식·석식·테이크아웃 탭, 한·중·일·양·분식 유형 필터, 메뉴 검색,
칼로리 분석(가볍게 / 든든하게)을 제공합니다.

- **Vite + React + Tailwind CSS v3**
- 디자인 무드: 써브웨이(SUBWAY) — 그린 `#008C15` 주색 + 옐로우 `#FFC500` 포인트, 화이트 배경
- 폰트: Pretendard (한글 가독성)

---

## 개발 / 빌드

```bash
npm install      # 의존성 설치 (최초 1회)
npm run dev      # 로컬 개발 서버 (기본 http://localhost:5173)
npm run build    # 정적 빌드 → dist/
npm run preview  # 빌드 결과 미리보기
```

---

## 📅 다음 주 식단 추가하는 법

> 🤖 **자동 반영**: 슬랙 `#5_공유해요_지하식당` 채널에 식단표 이미지가 올라오면
> Claude Code 세션이 자동으로 데이터 파일을 만들어 `main` 에 푸시하도록 설정되어 있습니다.
> 자동화 절차·검증 규칙은 [`MENU_INGESTION.md`](./MENU_INGESTION.md) 참고. 아래는 수동 절차입니다.

식단은 코드와 분리되어 `src/data/` 아래 **주차별 파일**로 관리합니다.
매주 아래 **2단계**만 하면 됩니다.

> 푸시 전 `npm run validate` 로 데이터 구조를 검증할 수 있습니다.

### 1단계 — data 파일 추가

`src/data/menu-2026-w2.js` 를 복사해 다음 주 파일을 만듭니다.
파일명 규칙: `menu-<연도>-w<주차>.js` (예: `menu-2026-w3.js`)

복사한 파일에서 메뉴 데이터와 `week` 정보를 새 주차에 맞게 수정합니다.

```js
// src/data/menu-2026-w3.js
const sets = [
  // S(식사, 요일, 코너, 단가, 유형, [[메뉴명, kcal], ...], 태그?, 사이드여부?)
  S("중식", "월", "Korean A", 9400, "한식", [["된장찌개", 200], ["귀리밥", 310]]),
  // ... 한 주치 메뉴
];

export const week = {
  id: "2026-w3",                          // 고유 id (중복 금지)
  label: "6월 3주차",                      // 드롭다운에 표시될 이름
  range: "2026.06.15(월) ~ 06.19(금)",     // 화면 상단 날짜 범위
  days: [["월", "06.15"], ["화", "06.16"], ["수", "06.17"], ["목", "06.18"], ["금", "06.19"]],
  sets,
  staticTakeout,                          // 테이크아웃 상시 메뉴 (요일 무관)
};
```

> 사용 가능한 **유형**: `한식` `중식` `일식` `양식` `분식` `기타`
> 사용 가능한 **태그**(`src/theme.js` 의 `TAG`): `단가` `건강` `welgreen` `월드컵` `맛집` `수산물`
> 새 태그가 필요하면 `src/theme.js` 의 `TAG` 객체에 추가하세요.

### 2단계 — 주차 목록에 등록

`src/data/index.js` 에서 새 파일을 import 하고 `weeks` 배열 **맨 앞**에 추가합니다.
배열 맨 앞(`weeks[0]`)이 사이트 기본 선택 주차가 됩니다.

```js
// src/data/index.js
import { week as w2026w3 } from "./menu-2026-w3.js";
import { week as w2026w2 } from "./menu-2026-w2.js";

export const weeks = [w2026w3, w2026w2]; // 최신 주차를 맨 앞에
```

주차가 2개 이상이 되면 헤더에 **주차 선택 드롭다운**이 자동으로 나타납니다.

이후 `npm run build` 로 다시 빌드하거나, 배포 연동이 되어 있으면 push 만 하면 됩니다.

---

## 🚀 배포 (Vercel)

1. 이 폴더를 GitHub 리포지토리로 push 합니다.
2. [vercel.com](https://vercel.com) 에서 **New Project → 리포지토리 선택**.
3. 프레임워크는 자동으로 **Vite** 로 감지됩니다 (`vercel.json` 포함).
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. **Deploy** 클릭. 이후 main 브랜치에 push 할 때마다 자동 재배포됩니다.

CLI로 배포하려면:

```bash
npm i -g vercel
vercel          # 미리보기 배포
vercel --prod   # 프로덕션 배포
```

> **Netlify**: Build command `npm run build`, Publish directory `dist`.
> **GitHub Pages**: `vite.config.js` 의 `base`를 `"/<리포지토리명>/"` 로 설정한 뒤
> `npm run build` 결과(`dist/`)를 `gh-pages` 브랜치로 배포하세요.

---

## 폴더 구조

```
.
├─ index.html              # 진입점 (Pretendard, favicon=D2SF 로고)
├─ vite.config.js          # 빌드 설정 (GitHub Pages용 base 주석 포함)
├─ tailwind.config.js      # JIT content 글롭 + 써브웨이 컬러 토큰
├─ public/
│  ├─ d2sf-logo.png        # 헤더 로고
│  └─ favicon.png          # 파비콘 (= D2SF 로고)
└─ src/
   ├─ main.jsx
   ├─ App.jsx              # 헤더 + 주차 선택 + 식단표 통합
   ├─ index.css            # Tailwind + Pretendard
   ├─ theme.js             # 색상 토큰 (CUISINE / TAG / 브랜드 팔레트)
   ├─ components/
   │  ├─ Header.jsx        # 그린 바 + 로고 + 주차 드롭다운
   │  └─ WeeklyLunchMenu.jsx
   └─ data/
      ├─ index.js          # 주차 레지스트리 (드롭다운 소스)
      └─ menu-2026-w2.js   # 6월 2주차 식단 데이터
```
