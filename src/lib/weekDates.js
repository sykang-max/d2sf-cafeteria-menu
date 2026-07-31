/**
 * 주차 데이터를 "실제 날짜"로 환산하는 유틸.
 *
 * 주차 파일의 `days`는 `[["월","08.03"], …]` 처럼 연도가 없으므로,
 * `range`("2026.08.03(월) ~ 08.07(금)")의 앞 4자리에서 기준 연도를 얻습니다.
 * 12월→1월로 넘어가는 주차는 월이 되돌아가는 시점에 연도를 +1 합니다.
 *
 * 요일 이름만으로 "오늘"을 판정하면 다른 주차를 보고 있을 때도 오늘로 표시되므로
 * (예: 07.31 금요일에 다음 주 08.07 금요일이 오늘로 뜨는 문제),
 * 모든 판정은 연·월·일이 전부 일치하는지로 합니다.
 */

// 시각 성분을 버린 자정 기준 Date (날짜끼리 === 비교가 가능해집니다)
export const startOfDay = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const baseYear = (week) => {
  const m = /^(\d{4})/.exec(week.range ?? "");
  return m ? Number(m[1]) : new Date().getFullYear();
};

// 해당 날짜가 속한 주의 월요일
const mondayOf = (d) => {
  const x = startOfDay(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // 일요일(0)은 -6
  return x;
};

const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

/** 주차의 요일 목록을 실제 날짜와 함께 반환 → [{ key:"월", label:"08.03", date: Date }] */
export const weekDays = (week) => {
  let year = baseYear(week);
  let prevMonth = null;
  return week.days.map(([key, label]) => {
    const [mm, dd] = label.split(".").map(Number);
    if (prevMonth !== null && mm < prevMonth) year += 1; // 12월 → 1월
    prevMonth = mm;
    return { key, label, date: new Date(year, mm - 1, dd) };
  });
};

/**
 * 주차가 커버하는 달력상의 월~금 구간.
 * 데이터의 첫날/마지막날이 아니라 달력 기준으로 잡아서, 공휴일로 하루가 빠진 주차
 * (예: 07.13~07.16, 금 제헌절 휴무)도 그 주 금요일까지 "이번 주"로 인식합니다.
 */
export const weekSpan = (week) => {
  const first = weekDays(week)[0].date;
  const mon = mondayOf(first);
  return { mon, fri: addDays(mon, 4) };
};

/** 오늘이 이 주차(월~금)에 속하는지 */
export const isCurrentWeek = (week, today = startOfDay()) => {
  const { mon, fri } = weekSpan(week);
  return today >= mon && today <= fri;
};

/** 오늘에 해당하는 요일 엔트리 (연·월·일이 모두 일치할 때만) — 없으면 null */
export const todayOf = (week, today = startOfDay()) =>
  weekDays(week).find((d) => d.date.getTime() === today.getTime()) ?? null;

const byFirstDate = (a, b) => weekDays(a)[0].date - weekDays(b)[0].date;

/**
 * 처음 열었을 때 보여줄 주차.
 *   1) 오늘이 속한 주차(월~금)
 *   2) 없으면(주말·미등록 주간) 가장 가까운 다가오는 주차
 *   3) 그것도 없으면 가장 최근 지난 주차
 */
export const defaultWeekId = (weeks, today = startOfDay()) => {
  const inWeek = weeks.find((w) => isCurrentWeek(w, today));
  if (inWeek) return inWeek.id;

  const upcoming = weeks.filter((w) => weekSpan(w).mon > today).sort(byFirstDate)[0];
  if (upcoming) return upcoming.id;

  const past = weeks.filter((w) => weekSpan(w).fri < today).sort((a, b) => byFirstDate(b, a))[0];
  return (past ?? weeks[0]).id;
};

/** 선택된 주차가 오늘 기준 이번 주 / 다음 주 / 미래 / 지난 주차인지 */
export const weekRelation = (week, weeks, today = startOfDay()) => {
  if (isCurrentWeek(week, today)) return "current";
  if (weekSpan(week).mon > today) {
    const nextId = weeks.filter((w) => weekSpan(w).mon > today).sort(byFirstDate)[0]?.id;
    return week.id === nextId ? "next" : "future";
  }
  return "past";
};
