// ─────────────────────────────────────────────────────────────
// 할로윈 이벤트 설정 (2026 할로윈 위크)
//   기간: 10/23(금) 즉시 오픈(연습 겸 조기 오픈) ~ 11/01(일) 00:00 KST. 기간 밖에서는 효과·게임이 자동으로 숨겨집니다.
//   미리보기: 주소 뒤에 ?halloween=1 (강제 켜기) / ?halloween=0 (강제 끄기)
//   1차 랭킹은 10/29(목) 12:00 KST 마감·시상 완료. 10/29 오후부터 "끝판 전쟁"(수단·방법 무제한, 점수 상한 없음)으로
//   랭킹을 초기화해 11/01 0시 효과 종료와 함께 마감합니다 (rankingClose).
// ─────────────────────────────────────────────────────────────

export const HALLOWEEN = {
  start: "2026-10-23T00:00:00+09:00",
  end: "2026-11-01T00:00:00+09:00",
  // 끝판 전쟁 마감. 이후에는 점수가 저장되지 않아요.
  //   supabase/halloween.sql 의 submit_halloween_score 마감 시각과 같은 값이어야 합니다.
  rankingClose: "2026-11-01T00:00:00+09:00",
  // 마감 후 최종 결과 화면의 1~3위 상품
  prizes: ["5만원 상품권", "3만원 상품권", "2만원 상품권"],
  // 한 판 길이(초). 바꾸면 supabase/halloween.sql 의 연속 제출 간격(15초)보다 길게 유지하세요.
  gameSeconds: 30,
  // 게임 창 하단 안내 문구 (마감 전 / 마감 후)
  footnote: "끝판 전쟁 · AI·자동화 등 수단과 방법 무제한 · 점수 상한 없음 · 10/31(토) 자정 마감",
  footnoteClosed: "랭킹이 마감됐어요 · 위 순위가 최종 결과예요",
};

/** 랭킹 마감(10/29 12:00 KST) 이후인지 */
export function isRankingClosed(now = new Date()) {
  return now >= new Date(HALLOWEEN.rankingClose);
}

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
