// 주차 레지스트리 — 화면 상단의 주차 선택 드롭다운이 이 배열을 그대로 사용합니다.
//
// ▶ 다음 주 식단 추가하기
//   1) src/data/menu-2026-w2.js 를 복사해 menu-2026-w3.js 등으로 만들고 데이터를 채웁니다.
//   2) 아래에 import 하고 weeks 배열 "맨 앞"에 넣습니다. (최신 주차가 기본 선택됨)
//
//   import { week as w2026w3 } from "./menu-2026-w3.js";
//   export const weeks = [w2026w3, w2026w2];

import { week as w2026w9 } from "./menu-2026-w9.js";
import { week as w2026w8 } from "./menu-2026-w8.js";
import { week as w2026w7 } from "./menu-2026-w7.js";
import { week as w2026w6 } from "./menu-2026-w6.js";
import { week as w2026w5 } from "./menu-2026-w5.js";
import { week as w2026w4 } from "./menu-2026-w4.js";
import { week as w2026w3 } from "./menu-2026-w3.js";
import { week as w2026w2 } from "./menu-2026-w2.js";

// 최신 주차를 배열 맨 앞에 두세요. weeks[0] 이 기본 선택됩니다.
export const weeks = [w2026w9, w2026w8, w2026w7, w2026w6, w2026w5, w2026w4, w2026w3, w2026w2];
