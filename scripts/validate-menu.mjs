// ─────────────────────────────────────────────────────────────
// 주간 식단 데이터 검증 게이트
//
// 새 주차 데이터(menu-YYYY-wN.js)를 main 에 푸시하기 전에 실행하세요.
//   node scripts/validate-menu.mjs
//
// src/data/index.js 의 weeks 배열을 그대로 로드해, 각 주차가 화면 컴포넌트
// (WeeklyLunchMenu.jsx)가 기대하는 구조를 만족하는지 검사합니다.
// 검증 실패 시 종료 코드 1 로 끝나므로 자동화 파이프라인의 중단 지점으로 쓸 수 있습니다.
// ─────────────────────────────────────────────────────────────

import { weeks } from "../src/data/index.js";
import { CUISINE, TAG, MEALS } from "../src/theme.js";

const CUISINE_KEYS = Object.keys(CUISINE);
const TAG_KEYS = Object.keys(TAG);
const DAY_NAMES = ["월", "화", "수", "목", "금", "토", "일"];

const errors = [];
const warnings = [];

const fail = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);

if (!Array.isArray(weeks) || weeks.length === 0) {
  fail("weeks 배열이 비어 있습니다. src/data/index.js 에 최소 1개 주차를 등록하세요.");
}

const seenIds = new Set();

weeks.forEach((week, wi) => {
  const where = `weeks[${wi}]` + (week?.id ? ` (id=${week.id})` : "");

  // 필수 필드
  for (const key of ["id", "label", "range", "days", "sets"]) {
    if (week?.[key] == null) fail(`${where}: 필수 필드 "${key}" 누락`);
  }
  if (!week) return;

  // id 고유성
  if (week.id != null) {
    if (seenIds.has(week.id)) fail(`${where}: id "${week.id}" 가 중복됩니다.`);
    seenIds.add(week.id);
    if (!/^\d{4}-w\d{1,2}$/.test(week.id)) {
      warn(`${where}: id "${week.id}" 가 권장 형식(YYYY-wN)과 다릅니다.`);
    }
  }

  // days: [["월","06.15"], ...]
  if (Array.isArray(week.days)) {
    if (week.days.length === 0) fail(`${where}: days 가 비어 있습니다.`);
    week.days.forEach((d, di) => {
      if (!Array.isArray(d) || d.length !== 2) {
        fail(`${where}.days[${di}]: ["요일","MM.DD"] 형식이어야 합니다.`);
        return;
      }
      const [name, date] = d;
      if (!DAY_NAMES.includes(name)) fail(`${where}.days[${di}]: 알 수 없는 요일 "${name}"`);
      if (!/^\d{2}\.\d{2}$/.test(date)) warn(`${where}.days[${di}]: 날짜 "${date}" 가 MM.DD 형식이 아닙니다.`);
    });
  } else {
    fail(`${where}: days 는 배열이어야 합니다.`);
  }

  const validDayNames = Array.isArray(week.days) ? week.days.map((d) => d?.[0]) : [];

  // sets
  if (Array.isArray(week.sets)) {
    if (week.sets.length === 0) fail(`${where}: sets 가 비어 있습니다.`);
    week.sets.forEach((s, si) => {
      const sw = `${where}.sets[${si}]`;
      if (!s || typeof s !== "object") {
        fail(`${sw}: 객체가 아닙니다. S(...) 헬퍼로 생성하세요.`);
        return;
      }
      if (!MEALS.includes(s.meal)) fail(`${sw}: meal "${s.meal}" 는 ${JSON.stringify(MEALS)} 중 하나여야 합니다.`);
      if (s.meal !== "테이크아웃" && !validDayNames.includes(s.day)) {
        warn(`${sw}: day "${s.day}" 가 이 주차의 days 에 없습니다.`);
      }
      if (typeof s.corner !== "string" || !s.corner) fail(`${sw}: corner 문자열이 필요합니다.`);
      if (typeof s.price !== "number" || s.price < 0) fail(`${sw}: price 는 0 이상의 숫자여야 합니다.`);
      if (!CUISINE_KEYS.includes(s.cuisine)) fail(`${sw}: cuisine "${s.cuisine}" 는 ${JSON.stringify(CUISINE_KEYS)} 중 하나여야 합니다.`);
      if (s.tag != null && !TAG_KEYS.includes(s.tag)) {
        fail(`${sw}: tag "${s.tag}" 가 theme.js 의 TAG 에 없습니다. 새 태그면 TAG 에 먼저 추가하세요. (사용 가능: ${JSON.stringify(TAG_KEYS)})`);
      }
      if (!Array.isArray(s.items) || s.items.length === 0) {
        fail(`${sw}: items 는 비어있지 않은 배열이어야 합니다.`);
      } else {
        s.items.forEach((it, ii) => {
          if (!Array.isArray(it) || it.length !== 2 || typeof it[0] !== "string" || typeof it[1] !== "number") {
            fail(`${sw}.items[${ii}]: ["메뉴명", kcal] 형식이어야 합니다.`);
          } else if (it[1] < 0 || it[1] > 2000) {
            warn(`${sw}.items[${ii}]: kcal ${it[1]} 추정치가 비정상 범위입니다. 확인하세요.`);
          }
        });
      }
    });
  } else {
    fail(`${where}: sets 는 배열이어야 합니다.`);
  }

  // staticTakeout (선택): [메뉴명, 유형, kcal, 단가]
  if (week.staticTakeout != null) {
    if (!Array.isArray(week.staticTakeout)) {
      fail(`${where}: staticTakeout 는 배열이어야 합니다.`);
    } else {
      week.staticTakeout.forEach((row, ri) => {
        if (!Array.isArray(row) || row.length !== 4) {
          fail(`${where}.staticTakeout[${ri}]: ["메뉴명","유형",kcal,단가] 형식이어야 합니다.`);
          return;
        }
        const [, cuisine] = row;
        if (!CUISINE_KEYS.includes(cuisine)) fail(`${where}.staticTakeout[${ri}]: 유형 "${cuisine}" 가 올바르지 않습니다.`);
      });
    }
  }
});

// ── 결과 출력 ──
if (warnings.length) {
  console.warn(`\n⚠️  경고 ${warnings.length}건:`);
  warnings.forEach((w) => console.warn("  - " + w));
}

if (errors.length) {
  console.error(`\n❌ 검증 실패 — 오류 ${errors.length}건:`);
  errors.forEach((e) => console.error("  - " + e));
  console.error("\n오류를 수정한 뒤 다시 실행하세요. (main 푸시 금지)\n");
  process.exit(1);
}

console.log(`\n✅ 검증 통과 — 주차 ${weeks.length}개: ${weeks.map((w) => w.id).join(", ")}`);
console.log(`   기본 표시 주차(weeks[0]): ${weeks[0].label} (${weeks[0].range})\n`);
