// ─────────────────────────────────────────────────────────────
// 순수 헬퍼(부수효과 없음): 주차 객체 → JS 모듈 렌더, index.js 등록, 판독 지시문.
// sync.mjs 에서 import 해서 사용합니다. (부수효과가 없어 개별 테스트가 쉽습니다.)
// ─────────────────────────────────────────────────────────────
import fs from "node:fs";
import path from "node:path";

/** 주차 객체 → 기존 주차 파일과 동일한 구조의 JS 모듈 소스 문자열 */
export function renderWeekModule(w) {
  const j = (x) => JSON.stringify(x);
  const line = (s) => {
    const args = [j(s.meal), j(s.day), j(s.corner), String(s.price), j(s.cuisine), j(s.items)];
    const tag = s.tag ?? null;
    const side = !!s.side;
    if (tag !== null || side) args.push(tag === null ? "null" : j(tag));
    if (side) args.push("true");
    return `  S(${args.join(", ")}),`;
  };
  const header = `// ─────────────────────────────────────────────────────────────
// 지하식당 주간 식단 — ${w.label} (${w.range})
// 출처: 화재서초 게시판 식단표 / Google Drive 식단 폴더
// ⚠️ 이 파일은 자동 판독(Claude Sonnet)으로 생성되었습니다.
//    병합 전 원문 이미지와 대조해 오탈자/누락을 확인해 주세요.
// 칼로리(kcal)는 1인분 추정치이며 실제 제공량과 다를 수 있습니다.
// ─────────────────────────────────────────────────────────────

const S = (meal, day, corner, price, cuisine, items, tag = null, side = false) => ({
  meal,
  day,
  corner,
  price,
  cuisine,
  items,
  tag,
  side,
});
`;
  const days = `\nconst days = ${JSON.stringify(w.days)};\n`;
  const sets = `\nconst sets = [\n${w.sets.map(line).join("\n")}\n];\n`;
  const stk = `\n// 테이크아웃 상시 운영 메뉴 (요일 무관): [메뉴명, 유형, kcal, 단가]\nconst staticTakeout = ${JSON.stringify(w.staticTakeout || [])};\n`;
  const exp = `\nexport const week = {\n  id: ${j(w.id)},\n  label: ${j(w.label)},\n  range: ${j(w.range)},\n  days,\n  sets,\n  staticTakeout,\n};\n`;
  return header + days + sets + stk + exp;
}

/** index.js 에 새 주차 import + weeks 배열 맨 앞 등록 (멱등) */
export function updateIndex(dataDir, n) {
  const p = path.join(dataDir, "index.js");
  let s = fs.readFileSync(p, "utf8");
  const importLine = `import { week as w2026w${n} } from "./menu-2026-w${n}.js";`;
  // ^…/m 로 "줄 시작"에 앵커해 헤더 주석(//   import…, //   export const weeks…)이 아닌
  // 실제 코드 라인만 대상으로 삼습니다.
  if (!s.includes(importLine)) {
    s = s.replace(/^import \{ week as w2026w\d+ \} from/m, `${importLine}\n$&`);
  }
  if (!new RegExp(`^export const weeks = \\[w2026w${n},`, "m").test(s)) {
    s = s.replace(/^export const weeks = \[/m, `export const weeks = [w2026w${n}, `);
  }
  fs.writeFileSync(p, s, "utf8");
  return s;
}

/** 요일 라벨을 날짜로부터 재계산(원문 오타 보정) */
export function fixWeekdays(days, year) {
  const WD = ["일", "월", "화", "수", "목", "금", "토"];
  return days.map((d) => {
    const md = Array.isArray(d) ? d[1] : d;
    const [mm, dd] = String(md).split(".").map(Number);
    const dt = new Date(Number(year), mm - 1, dd);
    return [WD[dt.getDay()], md];
  });
}

/** Claude 판독 지시문(스키마 + 규칙) */
export function systemPrompt() {
  return [
    "당신은 한국 구내식당(지하식당) 주간 식단표 이미지를 구조화 데이터로 전사하는 도구입니다.",
    "이미지를 보고 아래 JSON 스키마의 객체 '하나'만 출력하세요. 코드펜스/설명/주석 금지, 순수 JSON만.",
    "",
    "{",
    '  "label": "예: 9월 2주차",',
    '  "range": "예: 2026.09.07(월) ~ 09.11(금)",',
    '  "days": [["월","09.07"],["화","09.08"],["수","09.09"],["목","09.10"],["금","09.11"]],',
    '  "sets": [ SetObject, ... ],',
    '  "staticTakeout": [ ["메뉴명","유형",kcal,단가], ... ]',
    "}",
    "",
    "SetObject = {",
    '  "meal": "조식" | "중식" | "석식" | "테이크아웃",',
    '  "day": "월" | "화" | "수" | "목" | "금",',
    '  "corner": 코너명,',
    '  "price": 정수(원, 없으면 0),',
    '  "cuisine": "한식" | "양식" | "중식" | "일식" | "분식" | "기타",',
    '  "items": [ ["메뉴명", kcal정수], ... ],',
    '  "tag": null | "단가" | "건강" | "welgreen" | "맛집",',
    '  "side": true | false',
    "}",
    "",
    "코너명 규칙(이미지 라벨을 아래 표준값으로 매핑):",
    '- 조식: "백반", "라면코너"',
    '- 중식: "Korean A", "Korean B", "Snack", "International A", "International B", "추가배식대"',
    '- 석식: "Korean B", "Snack"',
    '- 테이크아웃: "말이·컵밥", "샌드위치"  (상시 세트는 sets 가 아니라 staticTakeout 에 넣음)',
    "",
    "중요 규칙:",
    "- 각 세트의 items[0](첫 항목)이 '대표메뉴'입니다. 이미지에 적힌 위→아래 순서를 그대로 유지하세요.",
    "- kcal 은 이미지에 없으므로 유사 메뉴 기준 1인분 추정 정수로 채웁니다(국/찌개 80~350, 밥류 300~600, 면류 450~620, 볶음/구이 200~350, 전/튀김 150~300, 나물/무침/샐러드 40~100, 김치류 15~20, 과일/디저트 50~150).",
    '- 원산지 표기가 메뉴명에 붙어 있으면 괄호로 함께 적습니다. 예: "간장돼지불고기(돈육:국내산)".',
    '- tag: 보라색 [단가:10,500원] 박스 = "단가"; 초록 \'건강한 Day\' 메뉴 = "건강"; 테이크아웃 \'웰그린샐러드\' = "welgreen"; \'맛집\' 라벨 = "맛집"; 그 외 null.',
    "- 추가배식대 항목은 side: true, price: 0.",
    "- days 의 요일이 원문에 오타가 있어도 날짜 그대로 두세요(요일은 후처리에서 날짜로 재계산합니다).",
    '- 판독이 정말 불가능한 칸은 억지로 지어내지 말고 해당 메뉴명을 "(판독불가)" 로 표기하세요.',
    "- 월~금 5일 기준. 휴무 요일이 있으면 그 요일은 days/sets 에서 제외하세요.",
  ].join("\n");
}
