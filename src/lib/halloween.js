// ─────────────────────────────────────────────────────────────
// 할로윈 이벤트 설정 (2026 할로윈 위크)
//   기간: 10/26(월) 00:00 ~ 11/01(일) 00:00 KST. 기간 밖에서는 효과·게임이 자동으로 숨겨집니다.
//   미리보기: 주소 뒤에 ?halloween=1 (강제 켜기) / ?halloween=0 (강제 끄기)
//   랭킹 마감 시각은 supabase/halloween.sql 의 submit_halloween_score 에도 같은 값이 있어요.
// ─────────────────────────────────────────────────────────────

export const HALLOWEEN = {
  start: "2026-10-26T00:00:00+09:00",
  end: "2026-11-01T00:00:00+09:00",
  // 한 판 길이(초). 바꾸면 supabase/halloween.sql 의 연속 제출 간격(15초)보다 길게 유지하세요.
  gameSeconds: 20,
  // 게임 창 하단 안내 문구
  footnote: "10/31(토) 자정 마감 · 사람마다 최고 점수만 랭킹에 남아요",
};

const FX_KEY = "what2eat-halloween-fx";

/** 오늘이 이벤트 기간인지 (URL ?halloween=1|0 으로 덮어쓰기 가능) */
export function isHalloweenActive(now = new Date()) {
  try {
    const q = new URLSearchParams(window.location.search).get("halloween");
    if (q === "1") return true;
    if (q === "0") return false;
  } catch {
    // SSR/샌드박스 등 window 없음 → 날짜로만 판정
  }
  return now >= new Date(HALLOWEEN.start) && now < new Date(HALLOWEEN.end);
}

/** 떠다니는 호박 효과 on/off — 모션 줄이기 설정이면 기본 off */
export function loadFxPref() {
  try {
    const v = localStorage.getItem(FX_KEY);
    if (v === "on") return true;
    if (v === "off") return false;
  } catch {}
  try {
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return true;
  }
}

export function saveFxPref(on) {
  try {
    localStorage.setItem(FX_KEY, on ? "on" : "off");
  } catch {}
}
